// TypeScript port of evaluation-testcase/comparators.go (Compare). Used by the
// dev-only direct-to-Judge0 fallback so candidate-visible "Run tests" results
// agree with backend grading on questions that use non-default comparators.
// Keep this file in lockstep with backend/exam-engine/plugins/evaluation-testcase/comparators.go.

export function compare(
    comparator: string | undefined,
    expected: string,
    actual: string,
    config?: unknown,
): boolean {
    void config; // reserved for future comparators; mirrors the Go signature.
    const c = (comparator ?? "").trim().toLowerCase();
    switch (c) {
        case "":
        case "trim_equal":
            return actual.trim() === expected.trim();
        case "strict":
            return actual === expected;
        case "json":
            return compareJSON(expected, actual);
        case "regex":
            try {
                return new RegExp(expected).test(actual);
            } catch {
                return false;
            }
        default:
            if (typeof console !== "undefined") {
                console.warn(`unknown comparator ${JSON.stringify(comparator)}; treating as fail`);
            }
            return false;
    }
}

function compareJSON(expected: string, actual: string): boolean {
    let e: unknown;
    let a: unknown;
    try {
        e = JSON.parse(expected);
    } catch {
        return false;
    }
    try {
        a = JSON.parse(actual);
    } catch {
        return false;
    }
    return canonicalize(e) === canonicalize(a);
}

// canonicalize emits a stable string representation so two JSON values compare
// equal iff they would round-trip identically via json.Marshal on the Go side.
// Object keys are sorted; arrays preserve order.
function canonicalize(v: unknown): string {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
    const keys = Object.keys(v as Record<string, unknown>).sort();
    return (
        "{" +
        keys
            .map((k) => JSON.stringify(k) + ":" + canonicalize((v as Record<string, unknown>)[k]))
            .join(",") +
        "}"
    );
}
