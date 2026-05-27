package assessmentfillblank

import (
	"regexp"
	"strings"
)

// BlankResult captures the per-blank grading detail. Useful for surface-level
// feedback in review screens.
type BlankResult struct {
	BlankID   string `json:"blankId"`
	Submitted string `json:"submitted"`
	IsCorrect bool   `json:"isCorrect"`
}

// GradeResult is the deterministic grade of a fill-in-the-blank submission.
// Score is in the range [0, 1] and is multiplied by the question's max_score
// upstream.
type GradeResult struct {
	Score     float64       `json:"score"`
	IsCorrect bool          `json:"isCorrect"`
	Blanks    []BlankResult `json:"blanks"`
}

// Grade scores the candidate's responses against the question's blanks.
// partialCredit=true awards 1/N per correct blank; false is all-or-nothing.
func Grade(body *QuestionBody, ans *Answer, partialCredit bool) GradeResult {
	results := make([]BlankResult, 0, len(body.Blanks))
	correctCount := 0
	for _, b := range body.Blanks {
		submitted := ans.Responses[b.ID]
		ok := matchAny(submitted, b.Answers, effectiveMode(b.MatchMode))
		if ok {
			correctCount++
		}
		results = append(results, BlankResult{BlankID: b.ID, Submitted: submitted, IsCorrect: ok})
	}
	total := len(body.Blanks)
	if total == 0 {
		return GradeResult{Score: 0, IsCorrect: false, Blanks: results}
	}
	isCorrect := correctCount == total
	var score float64
	if partialCredit {
		score = float64(correctCount) / float64(total)
	} else if isCorrect {
		score = 1.0
	}
	return GradeResult{Score: score, IsCorrect: isCorrect, Blanks: results}
}

func effectiveMode(m MatchMode) MatchMode {
	if m == "" {
		return MatchCI
	}
	return m
}

func matchAny(candidate string, accepted []string, mode MatchMode) bool {
	for _, a := range accepted {
		if matchOne(candidate, a, mode) {
			return true
		}
	}
	return false
}

func matchOne(candidate, accepted string, mode MatchMode) bool {
	switch mode {
	case MatchExact:
		return candidate == accepted
	case MatchTrim:
		return strings.EqualFold(strings.TrimSpace(candidate), strings.TrimSpace(accepted))
	case MatchRegex:
		re, err := regexp.Compile(accepted)
		if err != nil {
			return false
		}
		return re.MatchString(candidate)
	case MatchCI:
		fallthrough
	default:
		return strings.EqualFold(candidate, accepted)
	}
}
