package evaluationtestcase

import "testing"

func TestPartialCreditUsesWeights(t *testing.T) {
	got := PartialCredit(ScoreInput{
		MaxScore: 10,
		Cases: []CaseResult{
			{Passed: true, Weight: 1},
			{Passed: true, Weight: 1},
			{Passed: true, Weight: 2},
			{Passed: false, Weight: 1},
			{Passed: false, Weight: 2},
			{Passed: true, Weight: 3},
		},
	})
	if got.Score != 7 {
		t.Fatalf("expected score 7, got %v", got.Score)
	}
	if got.PassedWeight != 7 || got.TotalWeight != 10 {
		t.Fatalf("unexpected weights: passed=%v total=%v", got.PassedWeight, got.TotalWeight)
	}
}

func TestPartialCreditAppliesNegativeMarkingWhenUnsolved(t *testing.T) {
	got := PartialCredit(ScoreInput{
		MaxScore:         10,
		IsNegativeMarked: true,
		NegativeScore:    2,
		Cases: []CaseResult{
			{Passed: true, Weight: 1},
			{Passed: false, Weight: 1},
		},
	})
	if got.Score != -2 {
		t.Fatalf("expected negative score -2, got %v", got.Score)
	}
}
