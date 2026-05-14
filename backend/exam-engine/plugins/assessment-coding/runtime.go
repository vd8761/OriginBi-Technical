package assessmentcoding

import (
	"fmt"
	"strings"
)

// RuntimeContext bundles the per-attempt facts a run validator needs.
// Snapshot is the frozen starter set for the candidate's chosen language,
// captured at attempt start (today: implicitly via code_submission_files;
// after Phase 4 explicitly via attempt snapshot).
type RuntimeContext struct {
	// Language is the language plugin slug the candidate is using.
	Language string

	// AllowedLanguages is the resolved intersection of:
	//   org entitlement ∩ exam section ∩ question.allowedLanguages ∩ user entitlement
	// Empty means "no restriction at this scope" — but if the candidate's
	// language is not in the union of allowed scopes, the run is rejected.
	AllowedLanguages []string

	// Snapshot is the frozen starter set for this language. The validator
	// diffs candidate-submitted files against it to enforce locks.
	Snapshot []StarterFile

	// DefaultEntryFile is filled from the language plugin's LanguageConfig
	// when the candidate doesn't supply Answer.EntryFile.
	DefaultEntryFile string

	// MaxFiles / MaxFileBytes / MaxTotalBytes guard against pathological
	// payloads. Zero means inherit the schema defaults.
	MaxFiles      int
	MaxFileBytes  int
	MaxTotalBytes int
}

// ValidateAnswer enforces:
//   - language is in AllowedLanguages (when set)
//   - file count + size budget
//   - entry file resolves to a file in the answer
//   - every read-only file in the snapshot is byte-identical in the answer
//   - every locked region in the snapshot is byte-identical in the answer's
//     corresponding line range
//
// Returns nil on success. On failure returns ValidationErrors; each entry's
// Code is one of: LANGUAGE_NOT_ALLOWED, TOO_MANY_FILES, FILE_TOO_LARGE,
// TOTAL_TOO_LARGE, ENTRY_FILE_MISSING, LOCKED_FILE_MODIFIED,
// LOCKED_REGION_MODIFIED.
func ValidateAnswer(a *Answer, rc RuntimeContext) error {
	var errs ValidationErrors

	if len(rc.AllowedLanguages) > 0 {
		allowed := false
		for _, l := range rc.AllowedLanguages {
			if l == a.Language {
				allowed = true
				break
			}
		}
		if !allowed {
			errs = append(errs, &ValidationError{
				Code:    "LANGUAGE_NOT_ALLOWED",
				Field:   "language",
				Message: fmt.Sprintf("language %s is not allowed for this attempt", a.Language),
				Detail:  map[string]any{"allowed": rc.AllowedLanguages},
			})
		}
	}

	// File count + size.
	if rc.MaxFiles > 0 && len(a.Files) > rc.MaxFiles {
		errs = append(errs, &ValidationError{
			Code: "TOO_MANY_FILES", Field: "files",
			Message: fmt.Sprintf("submission has %d files, max is %d", len(a.Files), rc.MaxFiles),
		})
	}
	totalBytes := 0
	for i, f := range a.Files {
		bytes := len(f.Content)
		totalBytes += bytes
		if rc.MaxFileBytes > 0 && bytes > rc.MaxFileBytes {
			errs = append(errs, &ValidationError{
				Code: "FILE_TOO_LARGE", Field: fmt.Sprintf("files[%d].content", i),
				Message: fmt.Sprintf("file %q is %d bytes, max is %d", f.Path, bytes, rc.MaxFileBytes),
			})
		}
	}
	if rc.MaxTotalBytes > 0 && totalBytes > rc.MaxTotalBytes {
		errs = append(errs, &ValidationError{
			Code: "TOTAL_TOO_LARGE", Field: "files",
			Message: fmt.Sprintf("submission total is %d bytes, max is %d", totalBytes, rc.MaxTotalBytes),
		})
	}

	// Entry file resolution.
	entry := a.EntryFile
	if entry == "" {
		entry = rc.DefaultEntryFile
	}
	if entry == "" {
		errs = append(errs, &ValidationError{
			Code: "ENTRY_FILE_REQUIRED", Field: "entryFile",
			Message: "no entry file specified and the language has no default",
		})
	} else {
		answerByPath := a.FilesByPath()
		if _, ok := answerByPath[entry]; !ok {
			errs = append(errs, &ValidationError{
				Code: "ENTRY_FILE_MISSING", Field: "entryFile",
				Message: fmt.Sprintf("entryFile %q is not present in the submitted files", entry),
			})
		}
	}

	// Locked file + region enforcement. Snapshot drives this, not the answer:
	// even if the candidate omits a locked file, we treat that as a violation.
	answerByPath := a.FilesByPath()
	for _, snap := range rc.Snapshot {
		candidateContent, present := answerByPath[snap.Path]

		// Whole-file lock.
		if snap.ReadOnly {
			if !present {
				errs = append(errs, &ValidationError{
					Code: "LOCKED_FILE_MISSING", Field: "files",
					Message: fmt.Sprintf("locked file %q is missing from the submission", snap.Path),
					Detail:  map[string]any{"path": snap.Path},
				})
				continue
			}
			if candidateContent != snap.Content {
				errs = append(errs, &ValidationError{
					Code:    "LOCKED_FILE_MODIFIED",
					Field:   "files",
					Message: fmt.Sprintf("locked file %q was modified", snap.Path),
					Detail:  map[string]any{"path": snap.Path},
				})
			}
			// Skip per-region check for read-only files — the whole-file check is stricter.
			continue
		}

		// Region locks. We compare line-by-line within each locked range; lines
		// outside the range are unconstrained.
		if len(snap.LockedRegions) == 0 {
			continue
		}
		if !present {
			// A non-readOnly file that has locked regions but is missing — the
			// candidate dropped a file they don't get to drop.
			errs = append(errs, &ValidationError{
				Code: "LOCKED_FILE_MISSING", Field: "files",
				Message: fmt.Sprintf("file %q (with locked regions) is missing from the submission", snap.Path),
				Detail:  map[string]any{"path": snap.Path},
			})
			continue
		}
		snapLines := splitLines(snap.Content)
		candidateLines := splitLines(candidateContent)
		for _, region := range snap.LockedRegions {
			for line := region.StartLine; line <= region.EndLine; line++ {
				snapLine := lineAt(snapLines, line)
				candidateLine := lineAt(candidateLines, line)
				if snapLine != candidateLine {
					errs = append(errs, &ValidationError{
						Code:  "LOCKED_REGION_MODIFIED",
						Field: "files",
						Message: fmt.Sprintf("locked region in %q (lines %d-%d) was modified",
							snap.Path, region.StartLine, region.EndLine),
						Detail: map[string]any{
							"path":      snap.Path,
							"startLine": region.StartLine,
							"endLine":   region.EndLine,
							"reason":    region.Reason,
						},
					})
					break // one violation per region is enough; UI surfaces the range.
				}
			}
		}
	}

	if errs.HasErrors() {
		return errs
	}
	return nil
}

// splitLines splits a file into 1-indexed lines. Carries the convention that
// trailing newlines do NOT produce an extra empty line — keeps the line
// count consistent with what the editor / Monaco displays.
func splitLines(s string) []string {
	if s == "" {
		return nil
	}
	noTrailing := strings.TrimSuffix(s, "\n")
	return strings.Split(noTrailing, "\n")
}

// lineAt returns the line at 1-indexed position `n`, or "" if out of range.
func lineAt(lines []string, n int) string {
	if n < 1 || n > len(lines) {
		return ""
	}
	return lines[n-1]
}
