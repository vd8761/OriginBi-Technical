package pluginhost

import (
	"slices"
	"testing"

	"github.com/google/uuid"
)

// makeManifests builds an in-memory plugin set from a slug->requires map.
// Used by the graph tests to keep fixture intent visible in one line per
// plugin.
func makeManifests(specs map[string][]string) map[string]*Manifest {
	out := make(map[string]*Manifest, len(specs))
	for slug, requires := range specs {
		out[slug] = &Manifest{
			ID:       uuid.New(),
			Slug:     slug,
			Requires: append([]string(nil), requires...),
		}
	}
	return out
}

func TestResolveGraph_HappyPath(t *testing.T) {
	// assessment.coding ← evaluation.testcase ← (root)
	// runner.judge0 (no deps)
	// language.python depends on assessment.coding + runner.judge0
	m := makeManifests(map[string][]string{
		"assessment.coding":   nil,
		"runner.judge0":       nil,
		"evaluation.testcase": {"assessment.coding", "runner.judge0"},
		"language.python":     {"assessment.coding", "runner.judge0"},
	})

	order, errs := resolveGraph(m)
	if len(errs) != 0 {
		t.Fatalf("expected no graph errors, got %d: %v", len(errs), errs)
	}

	// Topo invariant: deps come before dependents.
	pos := map[string]int{}
	for i, slug := range order {
		pos[slug] = i
	}
	for slug, deps := range map[string][]string{
		"evaluation.testcase": {"assessment.coding", "runner.judge0"},
		"language.python":     {"assessment.coding", "runner.judge0"},
	} {
		for _, dep := range deps {
			if pos[dep] >= pos[slug] {
				t.Errorf("topo order violated: %s (pos %d) must come before %s (pos %d)", dep, pos[dep], slug, pos[slug])
			}
		}
	}
}

func TestResolveGraph_MissingRequire(t *testing.T) {
	m := makeManifests(map[string][]string{
		"evaluation.testcase": {"assessment.coding"},
		// assessment.coding intentionally missing
	})

	_, errs := resolveGraph(m)
	if len(errs) == 0 {
		t.Fatal("expected missing-require error, got none")
	}
	var found bool
	for _, e := range errs {
		if e.PluginSlug == "evaluation.testcase" && e.Kind == "missing-require" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected missing-require for evaluation.testcase, got %+v", errs)
	}
}

func TestResolveGraph_Cycle(t *testing.T) {
	// a → b → c → a
	m := makeManifests(map[string][]string{
		"a": {"b"},
		"b": {"c"},
		"c": {"a"},
	})

	_, errs := resolveGraph(m)
	if len(errs) == 0 {
		t.Fatal("expected cycle errors, got none")
	}
	cycleParticipants := map[string]bool{}
	for _, e := range errs {
		if e.Kind == "cycle" {
			cycleParticipants[e.PluginSlug] = true
		}
	}
	for _, slug := range []string{"a", "b", "c"} {
		if !cycleParticipants[slug] {
			t.Errorf("expected %s in cycle participants, got %v", slug, cycleParticipants)
		}
	}
}

func TestResolveGraph_StableOrder(t *testing.T) {
	// Same fixture, multiple runs — output must be byte-identical.
	specs := map[string][]string{
		"assessment.coding":   nil,
		"runner.judge0":       nil,
		"evaluation.testcase": {"assessment.coding", "runner.judge0"},
		"language.python":     {"assessment.coding", "runner.judge0"},
		"language.java":       {"assessment.coding", "runner.judge0"},
		"evaluator.openai":    {"evaluation.llm"},
		"evaluation.llm":      {"assessment.coding"},
	}

	first, errs := resolveGraph(makeManifests(specs))
	if len(errs) != 0 {
		t.Fatalf("expected no errors, got %v", errs)
	}
	for i := 0; i < 5; i++ {
		next, _ := resolveGraph(makeManifests(specs))
		if !slices.Equal(first, next) {
			t.Fatalf("non-deterministic load order:\n  first: %v\n  next:  %v", first, next)
		}
	}
}

func TestFilterErrorsBlocking(t *testing.T) {
	errs := []*DependencyError{
		{PluginSlug: "assessment.coding", Kind: "missing-require", Detail: "x"},
		{PluginSlug: "evaluation.testcase", Kind: "missing-require", Detail: "y"},
		{PluginSlug: "language.go", Kind: "missing-require", Detail: "z"},
	}
	blocking := map[string]bool{"assessment.coding": true}
	got := FilterErrorsBlocking(errs, blocking)
	if len(got) != 1 || got[0].PluginSlug != "assessment.coding" {
		t.Fatalf("expected only assessment.coding to be blocking, got %+v", got)
	}
}
