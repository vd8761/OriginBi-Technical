package runnerjudge0

import (
	"strings"
	"testing"
)

func TestStripJSExportsRewritesObjectAndNamedForms(t *testing.T) {
	in := `function add(a, b) { return a + b; }
module.exports = { add };
`
	got := stripJSExports(in)
	if strings.Contains(got, "module.exports") {
		t.Fatalf("expected module.exports stripped, got:\n%s", got)
	}
	if !strings.Contains(got, "function add(a, b)") {
		t.Fatalf("expected helper kept, got:\n%s", got)
	}
}

func TestStripJSExportsRewritesNamedFunctionExpression(t *testing.T) {
	in := `module.exports = function multiply(a, b) {
    return a * b;
};
`
	got := stripJSExports(in)
	if strings.Contains(got, "module.exports") {
		t.Fatalf("expected module.exports prefix removed, got:\n%s", got)
	}
	if !strings.Contains(got, "function multiply(a, b)") {
		t.Fatalf("expected function declaration, got:\n%s", got)
	}
}

func TestStripJSExportsRewritesNamedAssignment(t *testing.T) {
	in := `const square = (x) => x * x;
module.exports = square;
`
	got := stripJSExports(in)
	if strings.Contains(got, "module.exports") {
		t.Fatalf("expected module.exports stripped, got:\n%s", got)
	}
	if !strings.Contains(got, "const square") {
		t.Fatalf("expected const declaration kept, got:\n%s", got)
	}
}

func TestStripJSExportsRewritesExportsDotName(t *testing.T) {
	in := `exports.greet = (name) => "hi " + name;
`
	got := stripJSExports(in)
	if !strings.Contains(got, "const greet = (name)") {
		t.Fatalf("expected const greet rewrite, got:\n%s", got)
	}
}

func TestStripJSExportsLeavesAnonymousFormAlone(t *testing.T) {
	// Anonymous module.exports = function() {} cannot be safely hoisted; we
	// leave it for the candidate to see as a syntax error rather than
	// silently dropping their helper.
	in := `module.exports = function(a, b) {
    return a - b;
};
`
	got := stripJSExports(in)
	if !strings.Contains(got, "module.exports = function(a, b)") {
		t.Fatalf("expected anonymous form unchanged, got:\n%s", got)
	}
}
