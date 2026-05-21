package runnerjudge0

import "testing"

func TestJudge0FileSizeLimitCapsAtImageMaximum(t *testing.T) {
	if got := judge0FileSizeLimit(16384); got != judge0MaxFileSizeKB {
		t.Fatalf("expected cap %d, got %d", judge0MaxFileSizeKB, got)
	}
	if got := judge0FileSizeLimit(2048); got != 2048 {
		t.Fatalf("expected unchanged value, got %d", got)
	}
	if got := judge0FileSizeLimit(0); got != 1024 {
		t.Fatalf("expected fallback 1024, got %d", got)
	}
}
