import { describe, expect, it } from "vitest";

// stripJsExports is module-private. Mirror its regex contract here as a
// behavioral spec. If a candidate-visible regression happens, both the
// real implementation in runWithJudge0.ts and this spec should be updated
// together.
const stripJsExports = (src: string): string => {
    return src
        .replace(/^\s*module\.exports\s*=\s*\{[^}]*\}\s*;?\s*$/gm, "")
        .replace(/^(\s*)module\.exports\s*=\s*function\s+([A-Za-z_$][\w$]*)\s*\(/gm, "$1function $2(")
        .replace(/^\s*module\.exports\s*=\s*[A-Za-z_$][\w$]*\s*;?\s*$/gm, "")
        .replace(/^\s*exports\.([A-Za-z_$][\w$]*)\s*=\s*/gm, "const $1 = ");
};

describe("stripJsExports (behavioral spec)", () => {
    it("removes module.exports = { name } object form", () => {
        const out = stripJsExports("function add(a,b){return a+b;}\nmodule.exports = { add };\n");
        expect(out).not.toMatch(/module\.exports/);
        expect(out).toContain("function add(a,b)");
    });

    it("rewrites module.exports = function NAME(...) {...} to a declaration", () => {
        const out = stripJsExports("module.exports = function multiply(a, b) {\n  return a * b;\n};\n");
        expect(out).not.toMatch(/module\.exports/);
        expect(out).toContain("function multiply(a, b)");
    });

    it("removes module.exports = identifier and keeps the helper", () => {
        const out = stripJsExports("const square = (x) => x*x;\nmodule.exports = square;\n");
        expect(out).not.toMatch(/module\.exports/);
        expect(out).toContain("const square");
    });

    it("rewrites exports.NAME = expr to const NAME = expr", () => {
        const out = stripJsExports("exports.greet = (name) => 'hi ' + name;\n");
        expect(out).toContain("const greet = (name)");
    });

    it("leaves anonymous module.exports = function(...) {...} alone", () => {
        const src = "module.exports = function(a, b) {\n  return a - b;\n};\n";
        const out = stripJsExports(src);
        expect(out).toContain("module.exports = function(a, b)");
    });
});
