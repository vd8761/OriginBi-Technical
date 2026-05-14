package evaluationtestcase

import "encoding/json"

type CaseResult struct {
	Passed bool
	Weight float64
}

type ScoreInput struct {
	MaxScore         float64
	IsNegativeMarked bool
	NegativeScore    float64
	Cases            []CaseResult
}

type ScoreResult struct {
	Score        float64 `json:"score"`
	PassedTests  int     `json:"passedTests"`
	TotalTests   int     `json:"totalTests"`
	PassedWeight float64 `json:"passedWeight"`
	TotalWeight  float64 `json:"totalWeight"`
	Solved       bool    `json:"solved"`
}

func PartialCredit(in ScoreInput) ScoreResult {
	out := ScoreResult{TotalTests: len(in.Cases)}
	for _, tc := range in.Cases {
		weight := tc.Weight
		if weight <= 0 {
			weight = 1
		}
		out.TotalWeight += weight
		if tc.Passed {
			out.PassedTests++
			out.PassedWeight += weight
		}
	}
	out.Solved = out.TotalTests > 0 && out.PassedTests == out.TotalTests
	if out.TotalWeight > 0 {
		out.Score = in.MaxScore * out.PassedWeight / out.TotalWeight
	}
	if !out.Solved && in.IsNegativeMarked {
		out.Score = -in.NegativeScore
	}
	return out
}

func Feedback(runID string, maxScore float64, result ScoreResult) []byte {
	feedback, _ := json.Marshal(map[string]any{
		"type":         "coding",
		"runId":        runID,
		"passedTests":  result.PassedTests,
		"totalTests":   result.TotalTests,
		"passedWeight": result.PassedWeight,
		"totalWeight":  result.TotalWeight,
		"maxScore":     maxScore,
		"score":        result.Score,
		"solved":       result.Solved,
	})
	return feedback
}
