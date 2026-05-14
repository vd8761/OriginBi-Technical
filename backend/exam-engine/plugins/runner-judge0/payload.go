package runnerjudge0

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"path"
	"regexp"
	"strings"

	"github.com/originbi/exam-engine/internal/pluginhost"
)

type File struct {
	Path     string
	Content  string
	ReadOnly bool
	Language string
}

type PayloadRequest struct {
	Language  string
	Files     []File
	EntryFile string
}

func BuildPayload(runtime *Runtime, req PayloadRequest) (map[string]any, error) {
	langSlug := NormalizeLanguageSlug(req.Language)
	langCfg, err := runtime.Lookup(langSlug)
	if err != nil {
		return nil, err
	}
	runnerCfg := runtime.RunnerConfig()
	languageID, source, sourceIsBase64, err := submissionSource(langSlug, langCfg, runnerCfg, req.Files, req.EntryFile)
	if err != nil {
		return nil, err
	}
	body := map[string]any{
		"language_id":                  languageID,
		"cpu_time_limit":               secondsLimit(langCfg.TimeLimitMs, defaultInt(runnerCfg.Defaults, "timeLimitMs", 3000)),
		"wall_time_limit":              secondsLimit(langCfg.TimeLimitMs*2, defaultInt(runnerCfg.Defaults, "timeLimitMs", 3000)*2),
		"memory_limit":                 positiveOrDefault(langCfg.MemoryLimitKb, defaultInt(runnerCfg.Defaults, "memoryLimitKb", 131072)),
		"stack_limit":                  positiveOrDefault(langCfg.StackLimitKb, defaultInt(runnerCfg.Defaults, "stackLimitKb", 32768)),
		"max_processes_and_or_threads": positiveOrDefault(langCfg.ProcessesLimit, defaultInt(runnerCfg.Defaults, "processesLimit", 32)),
		"max_file_size":                1024,
	}
	if langCfg.OutputLimitKb > 0 {
		body["max_file_size"] = langCfg.OutputLimitKb
	}
	if sourceIsBase64 {
		if languageID == runnerCfg.MultiFileLanguageID {
			body["source_code"] = ""
			body["additional_files"] = source
		} else {
			body["source_code"] = source
		}
	} else {
		body["source_code"] = encodeBase64(source)
	}
	return body, nil
}

func submissionSource(langSlug string, cfg *pluginhost.LanguageConfig, runnerCfg RunnerConfig, files []File, entryFile string) (int, string, bool, error) {
	if len(files) == 0 {
		return 0, "", false, errors.New("files are required")
	}
	if langSlug == "language.javascript" {
		return cfg.Judge0LanguageID, inlineJavaScript(files, entryFile), false, nil
	}
	execFiles := executableFiles(files, cfg.FileExtension)
	if len(execFiles) > 1 {
		if !cfg.SupportsMultiFile {
			return 0, "", false, fmt.Errorf("%s does not support multi-file submissions", langSlug)
		}
		zipB64, err := buildMultiFileZip(langSlug, cfg, execFiles, entryFile)
		return runnerCfg.MultiFileLanguageID, zipB64, true, err
	}
	if cfg.Judge0LanguageID <= 0 {
		return 0, "", false, fmt.Errorf("%s has no judge0LanguageId", langSlug)
	}
	if len(execFiles) > 0 {
		return cfg.Judge0LanguageID, execFiles[0].Content, false, nil
	}
	return cfg.Judge0LanguageID, files[0].Content, false, nil
}

func buildMultiFileZip(langSlug string, cfg *pluginhost.LanguageConfig, files []File, entryFile string) (string, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, f := range files {
		name := safeZipPath(f.Path)
		if name == "" {
			continue
		}
		w, err := zw.Create(name)
		if err != nil {
			return "", err
		}
		if _, err := w.Write([]byte(f.Content)); err != nil {
			return "", err
		}
	}
	scripts := runScriptsFor(langSlug, cfg, files, entryFile)
	if err := addExecutableZipFile(zw, "run", scripts["run"]); err != nil {
		return "", err
	}
	if compile := scripts["compile"]; compile != "" {
		if err := addExecutableZipFile(zw, "compile", compile); err != nil {
			return "", err
		}
	}
	if err := zw.Close(); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

func addExecutableZipFile(zw *zip.Writer, name string, content string) error {
	h := &zip.FileHeader{Name: name, Method: zip.Deflate}
	h.SetMode(0755)
	w, err := zw.CreateHeader(h)
	if err != nil {
		return err
	}
	_, err = w.Write([]byte(content))
	return err
}

func runScriptsFor(langSlug string, cfg *pluginhost.LanguageConfig, files []File, entryFile string) map[string]string {
	entry := entryFile
	if entry == "" {
		entry = firstWritableFile(files)
	}
	flags := ""
	if cfg.CompileFlags != nil {
		flags = strings.TrimSpace(*cfg.CompileFlags)
	}
	switch langSlug {
	case "language.python":
		return map[string]string{"run": fmt.Sprintf("#!/bin/sh\nexec python3 %q\n", entry)}
	case "language.java":
		mainClass := javaMainClass(files, entry)
		return map[string]string{
			"compile": "#!/bin/sh\nset -e\njavac $(find . -name '*.java')\n",
			"run":     fmt.Sprintf("#!/bin/sh\nexec java -cp . %s\n", mainClass),
		}
	case "language.cpp":
		if flags == "" {
			flags = "-O2 -std=c++20"
		}
		return map[string]string{
			"compile": fmt.Sprintf("#!/bin/sh\nset -e\ng++ %s $(find . -name '*.cpp' -o -name '*.cc' -o -name '*.cxx') -o main\n", flags),
			"run":     "#!/bin/sh\nexec ./main\n",
		}
	case "language.c":
		if flags == "" {
			flags = "-O2 -std=c11"
		}
		return map[string]string{
			"compile": fmt.Sprintf("#!/bin/sh\nset -e\ngcc %s $(find . -name '*.c') -o main\n", flags),
			"run":     "#!/bin/sh\nexec ./main\n",
		}
	case "language.go":
		return map[string]string{"run": fmt.Sprintf("#!/bin/sh\nexec go run %q\n", entry)}
	default:
		return map[string]string{"run": fmt.Sprintf("#!/bin/sh\nexec cat %q\n", entry)}
	}
}

func inlineJavaScript(files []File, entryFile string) string {
	entry := findFile(files, entryFile)
	if entry == nil {
		for i := range files {
			if strings.HasSuffix(files[i].Path, ".js") && !files[i].ReadOnly {
				entry = &files[i]
				break
			}
		}
	}
	if entry == nil {
		return files[0].Content
	}
	helpers := []string{}
	for i := range files {
		if files[i].Path == entry.Path || !strings.HasSuffix(files[i].Path, ".js") || files[i].ReadOnly {
			continue
		}
		helpers = append(helpers, "// --- "+files[i].Path+" ---\n"+stripJSExports(files[i].Content))
	}
	entrySource := stripRelativeRequires(entry.Content)
	return strings.Join(append(helpers, "// --- "+entry.Path+" ---\n"+entrySource), "\n\n")
}

func executableFiles(files []File, extension string) []File {
	out := []File{}
	for _, f := range files {
		if f.ReadOnly && !isSourcePath(f.Path, extension) {
			continue
		}
		if isSourcePath(f.Path, extension) {
			out = append(out, f)
		}
	}
	return out
}

func isSourcePath(p string, extension string) bool {
	ext := path.Ext(p)
	if extension != "" && ext == extension {
		return true
	}
	switch ext {
	case ".py", ".js", ".java", ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".go":
		return true
	default:
		return false
	}
}

func firstWritableFile(files []File) string {
	for _, f := range files {
		if !f.ReadOnly {
			return f.Path
		}
	}
	if len(files) > 0 {
		return files[0].Path
	}
	return ""
}

func findFile(files []File, p string) *File {
	for i := range files {
		if files[i].Path == p {
			return &files[i]
		}
	}
	return nil
}

func javaMainClass(files []File, entryFile string) string {
	if strings.HasSuffix(entryFile, ".java") {
		base := path.Base(entryFile)
		return strings.TrimSuffix(base, ".java")
	}
	re := regexp.MustCompile(`public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)`)
	for _, f := range files {
		if !strings.HasSuffix(f.Path, ".java") {
			continue
		}
		if m := re.FindStringSubmatch(f.Content); len(m) == 2 {
			return m[1]
		}
	}
	return "Main"
}

func stripJSExports(src string) string {
	reObject := regexp.MustCompile(`(?m)^\s*module\.exports\s*=\s*\{[^}]*\}\s*;?\s*$`)
	reSingle := regexp.MustCompile(`(?m)^\s*module\.exports\s*=\s*[A-Za-z_$][\w$]*\s*;?\s*$`)
	reNamed := regexp.MustCompile(`(?m)^\s*exports\.([A-Za-z_$][\w$]*)\s*=`)
	src = reObject.ReplaceAllString(src, "")
	src = reSingle.ReplaceAllString(src, "")
	return reNamed.ReplaceAllString(src, "const $1 =")
}

func stripRelativeRequires(src string) string {
	reDecl := regexp.MustCompile(`(?m)^\s*(?:const|let|var)\s+[^=;]+=\s*require\(\s*['"]\./[^'"]+['"]\s*\)\s*;?\s*$`)
	reBare := regexp.MustCompile(`(?m)^\s*require\(\s*['"]\./[^'"]+['"]\s*\)\s*;?\s*$`)
	src = reDecl.ReplaceAllString(src, "")
	return reBare.ReplaceAllString(src, "")
}

func safeZipPath(p string) string {
	clean := strings.TrimPrefix(path.Clean("/"+p), "/")
	if clean == "." || strings.HasPrefix(clean, "../") {
		return ""
	}
	return clean
}

func encodeBase64(v string) string {
	return base64.StdEncoding.EncodeToString([]byte(v))
}

func secondsLimit(ms int, fallbackMs int) int {
	if ms <= 0 {
		ms = fallbackMs
	}
	seconds := ms / 1000
	if ms%1000 != 0 {
		seconds++
	}
	if seconds <= 0 {
		return 1
	}
	return seconds
}

func positiveOrDefault(v int, fallback int) int {
	if v > 0 {
		return v
	}
	return fallback
}

func defaultInt(values map[string]int, key string, fallback int) int {
	if values == nil || values[key] <= 0 {
		return fallback
	}
	return values[key]
}
