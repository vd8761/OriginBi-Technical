package assessmentmcq

import "sort"

// GradeResult is the deterministic grade of an MCQ submission. Score is in the
// range [0, 1] and is multiplied by the question's max_score upstream.
type GradeResult struct {
	Score     float64  `json:"score"`
	IsCorrect bool     `json:"isCorrect"`
	Selected  []string `json:"selected"`
	Correct   []string `json:"correct"`
}

// Grade scores an answer against the question. Behavior:
//
//   - Single-correct MCQ (len(correct) == 1):
//     1.0 if selected == correct, else 0.0.
//   - Multi-correct, partialCredit=false:
//     1.0 only when selected set equals correct set; else 0.0.
//   - Multi-correct, partialCredit=true:
//     (correctly-picked - incorrectly-picked) / len(correct), clamped to [0, 1].
//     Missing a correct option costs 1/len(correct); picking a wrong option
//     subtracts the same.
func Grade(body *QuestionBody, ans *Answer, partialCredit bool) GradeResult {
	correctSet := toSet(body.CorrectOptionIDs)
	selectedSet := toSet(ans.SelectedOptionIDs)

	selected := setToSorted(selectedSet)
	correct := setToSorted(correctSet)

	if len(correctSet) == 1 || !partialCredit {
		isCorrect := setsEqual(selectedSet, correctSet)
		score := 0.0
		if isCorrect {
			score = 1.0
		}
		return GradeResult{Score: score, IsCorrect: isCorrect, Selected: selected, Correct: correct}
	}

	// Partial-credit multi-correct: net (correct picks - incorrect picks) / N.
	hits := 0
	misses := 0
	for id := range selectedSet {
		if correctSet[id] {
			hits++
		} else {
			misses++
		}
	}
	raw := float64(hits-misses) / float64(len(correctSet))
	if raw < 0 {
		raw = 0
	}
	if raw > 1 {
		raw = 1
	}
	return GradeResult{
		Score:     raw,
		IsCorrect: setsEqual(selectedSet, correctSet),
		Selected:  selected,
		Correct:   correct,
	}
}

func toSet(items []string) map[string]bool {
	s := make(map[string]bool, len(items))
	for _, x := range items {
		s[x] = true
	}
	return s
}

func setsEqual(a, b map[string]bool) bool {
	if len(a) != len(b) {
		return false
	}
	for k := range a {
		if !b[k] {
			return false
		}
	}
	return true
}

func setToSorted(s map[string]bool) []string {
	out := make([]string, 0, len(s))
	for k := range s {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
