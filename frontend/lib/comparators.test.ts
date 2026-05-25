import { describe, expect, it } from "vitest";
import { compare } from "./comparators";

describe("compare", () => {
    it("treats empty/trim_equal comparator as trimmed equality", () => {
        expect(compare(undefined, "hello\n", "  hello  ")).toBe(true);
        expect(compare("", "hello\n", "  hello  ")).toBe(true);
        expect(compare("trim_equal", "hello\n", "  hello  ")).toBe(true);
        expect(compare("trim_equal", "hello", "world")).toBe(false);
    });

    it("strict comparator requires byte-exact equality", () => {
        expect(compare("strict", "hello\n", "hello\n")).toBe(true);
        expect(compare("strict", "hello\n", "hello")).toBe(false);
        expect(compare("strict", "hello", " hello")).toBe(false);
    });

    it("json comparator canonicalizes object key order and whitespace", () => {
        expect(compare("json", '{"a":1,"b":2}', '{"b":2,"a":1}')).toBe(true);
        expect(compare("json", '{"a":1}', '{"a":1, "b":2}')).toBe(false);
        expect(compare("json", "[1,2,3]", "[1,2,3]")).toBe(true);
        expect(compare("json", "[1,2,3]", "[3,2,1]")).toBe(false);
    });

    it("json comparator returns false on invalid actual JSON", () => {
        expect(compare("json", '{"a":1}', "not json")).toBe(false);
    });

    it("regex comparator matches expected as a JS regex against actual", () => {
        expect(compare("regex", "^hello", "hello world")).toBe(true);
        expect(compare("regex", "^world", "hello world")).toBe(false);
    });

    it("regex comparator returns false on invalid regex source", () => {
        expect(compare("regex", "(", "anything")).toBe(false);
    });

    it("unknown comparator returns false (including legacy custom_checker)", () => {
        expect(compare("custom_checker", "x", "x")).toBe(false);
        expect(compare("not-a-comparator", "x", "x")).toBe(false);
    });

    it("comparator is case-insensitive and whitespace-tolerant", () => {
        expect(compare(" STRICT ", "hello", "hello")).toBe(true);
        expect(compare("Trim_Equal", " hi ", "hi")).toBe(true);
    });
});
