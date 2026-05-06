import type { ExecutionLimits, TestCase } from "./data";

export interface TestResult extends TestCase {
    passed: boolean;
    actual: string;
    time: string;
}

export type RunResultType =
    | "success"
    | "partial"
    | "error"
    | "compile-error"
    | "timeout"
    | "memory-exceeded"
    | "output-exceeded"
    | "source-too-large";

export interface RunResult {
    type: RunResultType;
    stdout: string;
    stderr: string;
    testResults: TestResult[] | null;
    time: string;
    memory: string;
    limitHit?: keyof ExecutionLimits;
    summary?: string;
}

const byteSize = (s: string) => new Blob([s]).size;

export function simulateRun(
    code: string,
    lang: string,
    testCases: TestCase[] | undefined,
    limits: ExecutionLimits,
): RunResult {
    const sourceBytes = byteSize(code);

    if (sourceBytes > limits.maxSourceBytes) {
        return {
            type: "source-too-large",
            stdout: "",
            stderr: `Source file too large: ${sourceBytes} bytes (limit ${limits.maxSourceBytes} bytes).`,
            testResults: null,
            time: "0ms",
            memory: "0 MB",
            limitHit: "maxSourceBytes",
            summary: "Source file exceeded the maximum allowed size.",
        };
    }

    const hasContent = code.trim().length > 30;
    const hasSolution =
        !code.includes("pass") &&
        !code.includes("// Write") &&
        !code.includes("# Write") &&
        !code.includes("/* TODO");

    if (!hasContent) {
        return {
            type: "compile-error",
            stdout: "",
            stderr: `${lang === "python" || lang === "javascript" ? "SyntaxError" : "CompileError"}: Empty or incomplete solution.`,
            testResults: null,
            time: "0ms",
            memory: "0 MB",
            summary: "Compilation failed before execution.",
        };
    }

    if (!hasSolution) {
        return {
            type: "error",
            stdout: "",
            stderr: "Your solution is incomplete. Please implement the required function before running.",
            testResults: null,
            time: "12ms",
            memory: "14.2 MB",
            summary: "Solution placeholder detected — fill in your code.",
        };
    }

    const total = testCases ? testCases.length : 0;
    const passCount = total ? Math.floor(Math.random() * (total + 1)) : 0;
    const results: TestResult[] = testCases
        ? testCases.map((tc, i) => ({
            ...tc,
            passed: i < passCount,
            actual: i < passCount ? tc.expected : Math.random() > 0.5 ? "None" : "[]",
            time: `${Math.floor(Math.random() * 40 + 2)}ms`,
        }))
        : [];

    const elapsedMs = Math.floor(Math.random() * 80 + 10);
    const memoryMB = Math.random() * 10 + 12;

    if (elapsedMs > limits.runtimeTimeoutMs) {
        return {
            type: "timeout",
            stdout: "",
            stderr: `TimeLimitExceeded: execution exceeded ${limits.runtimeTimeoutMs} ms.`,
            testResults: results,
            time: `${elapsedMs}ms`,
            memory: `${memoryMB.toFixed(1)} MB`,
            limitHit: "runtimeTimeoutMs",
            summary: "Execution timed out.",
        };
    }

    if (memoryMB > limits.memoryLimitMB) {
        return {
            type: "memory-exceeded",
            stdout: "",
            stderr: `MemoryLimitExceeded: peak ${memoryMB.toFixed(1)} MB > ${limits.memoryLimitMB} MB.`,
            testResults: results,
            time: `${elapsedMs}ms`,
            memory: `${memoryMB.toFixed(1)} MB`,
            limitHit: "memoryLimitMB",
            summary: "Process exceeded memory budget.",
        };
    }

    const stdout = `Running ${lang} solution...\n${passCount}/${total} test cases passed.`;
    if (byteSize(stdout) > limits.maxOutputBytes) {
        return {
            type: "output-exceeded",
            stdout: stdout.slice(0, 200) + "…",
            stderr: `OutputLimitExceeded: stdout above ${limits.maxOutputBytes} bytes.`,
            testResults: results,
            time: `${elapsedMs}ms`,
            memory: `${memoryMB.toFixed(1)} MB`,
            limitHit: "maxOutputBytes",
            summary: "Output exceeded byte cap.",
        };
    }

    return {
        type: total > 0 && passCount === total ? "success" : "partial",
        stdout,
        stderr: "",
        testResults: results,
        time: `${elapsedMs}ms`,
        memory: `${memoryMB.toFixed(1)} MB`,
        summary:
            total > 0 && passCount === total
                ? "All sample test cases passed."
                : `${passCount}/${total} sample test cases passed.`,
    };
}
