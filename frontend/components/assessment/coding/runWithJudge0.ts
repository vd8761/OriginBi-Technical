import {
    JUDGE0_LANG_ID,
    JUDGE0_MULTIFILE_ID,
    runBatch,
    runOnce,
    toJudge0Limits,
    type Judge0Result,
} from "@/lib/judge0";
import { buildBundle } from "@/lib/judge0Bundle";
import type { ExecutionLimits, FileNode, TestCase } from "./data";

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

const formatMs = (seconds: string | null): string => {
    if (!seconds) return "0ms";
    const ms = Math.round(parseFloat(seconds) * 1000);
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
};

const formatMemory = (kb: number | null): string => {
    if (kb == null) return "0 MB";
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${kb} KB`;
};

// Map Judge0 status.id to our RunResultType. status IDs:
// 1 In Queue, 2 Processing, 3 Accepted, 4 Wrong Answer, 5 TLE,
// 6 Compilation Error, 7-12 Runtime Errors, 13 Internal, 14 Exec Format.
const mapStatus = (statusId: number, hasFailingTests: boolean): RunResultType => {
    if (statusId === 3) return hasFailingTests ? "partial" : "success";
    if (statusId === 4) return "partial";
    if (statusId === 5) return "timeout";
    if (statusId === 6) return "compile-error";
    if (statusId >= 7 && statusId <= 12) return "error";
    return "error";
};

const headlineFor = (statusId: number, description: string): string => {
    if (statusId === 3) return "Accepted";
    if (statusId === 6) return "Compile Error";
    if (statusId === 5) return "Time Limit Exceeded";
    return description || "Error";
};

const stderrFor = (r: Judge0Result): string => {
    if (r.compileOutput) return r.compileOutput;
    if (r.stderr) return r.stderr;
    if (r.message) return r.message;
    return "";
};

// Strip CommonJS export wrapper so a helper file's declarations become plain
// top-level declarations when concatenated into the entry.
//   module.exports = { foo, bar };  ->  removed
//   exports.foo = ...;              ->  foo = ...;
//   module.exports = foo;           ->  removed
const stripJsExports = (src: string): string => {
    return src
        .replace(/^\s*module\.exports\s*=\s*\{[^}]*\}\s*;?\s*$/gm, "")
        .replace(/^\s*module\.exports\s*=\s*[A-Za-z_$][\w$]*\s*;?\s*$/gm, "")
        .replace(/^\s*exports\.([A-Za-z_$][\w$]*)\s*=\s*/gm, "const $1 = ");
};

// Strip relative `require('./helpers.js')` lines from the entry. Absolute
// requires (e.g. `require('fs')`) are kept untouched.
const stripRelativeRequires = (src: string): string => {
    return src
        .replace(/^\s*(?:const|let|var)\s+[^=;]+=\s*require\(\s*['"]\.\/[^'"]+['"]\s*\)\s*;?\s*$/gm, "")
        .replace(/^\s*require\(\s*['"]\.\/[^'"]+['"]\s*\)\s*;?\s*$/gm, "");
};

// For JavaScript with helper files, flatten everything into a single source so
// we can submit single-file (Judge0 lang ID 63) — the multi-file lang ID 89
// isn't reliably available across Judge0 images.
const inlineJsForSingleFile = (files: FileNode[], entryFile: string | undefined): string => {
    const entry =
        files.find((f) => f.path === entryFile) ??
        files.find((f) => !f.readOnly && f.path.endsWith(".js")) ??
        files.find((f) => f.path.endsWith(".js"));
    if (!entry) return files[0]?.content ?? "";
    const helpers = files.filter(
        (f) => f !== entry && f.path.endsWith(".js") && !f.readOnly,
    );
    if (helpers.length === 0) return entry.content ?? "";
    const helperBlock = helpers
        .map((h) => `// --- ${h.path} (inlined) ---\n${stripJsExports(h.content ?? "")}`)
        .join("\n\n");
    const entrySrc = stripRelativeRequires(entry.content ?? "");
    return `${helperBlock}\n\n// --- ${entry.path} ---\n${entrySrc}`;
};

const buildSubmissionPayload = async (
    lang: string,
    files: FileNode[],
    entryFile: string | undefined,
): Promise<{ languageId: number; sourceCode: string; sourceIsBase64: boolean }> => {
    // JS: always inline helpers and submit single-file. Avoids the multi-file
    // language (ID 89) which isn't reliably enabled.
    if (lang === "javascript") {
        const langId = JUDGE0_LANG_ID.javascript;
        return {
            languageId: langId,
            sourceCode: inlineJsForSingleFile(files, entryFile),
            sourceIsBase64: false,
        };
    }

    const executableFiles = files.filter(
        (f) => !f.readOnly || /\.(py|js|java|cpp|cc|cxx|c|h|hpp)$/.test(f.path),
    );
    const useMultiFile = executableFiles.length > 1;
    if (useMultiFile) {
        const { base64Zip } = await buildBundle(lang, executableFiles, entryFile);
        return {
            languageId: JUDGE0_MULTIFILE_ID,
            sourceCode: base64Zip,
            sourceIsBase64: true,
        };
    }
    const langId = JUDGE0_LANG_ID[lang];
    if (!langId) {
        throw new Error(`Unsupported language: ${lang}`);
    }
    return {
        languageId: langId,
        sourceCode: executableFiles[0]?.content ?? files[0]?.content ?? "",
        sourceIsBase64: false,
    };
};

export interface RunWithJudge0Input {
    lang: string;
    files: FileNode[];
    entryFile?: string;
    limits: ExecutionLimits;
    mode: "custom" | "tests";
    customStdin?: string;
    testCases?: TestCase[];
    signal?: AbortSignal;
}

const sourceTooLarge = (files: FileNode[], limits: ExecutionLimits): RunResult | null => {
    const totalBytes = files.reduce((acc, f) => acc + byteSize(f.content ?? ""), 0);
    if (totalBytes <= limits.maxSourceBytes) return null;
    return {
        type: "source-too-large",
        stdout: "",
        stderr: `Source files too large: ${totalBytes} bytes (limit ${limits.maxSourceBytes} bytes).`,
        testResults: null,
        time: "0ms",
        memory: "0 MB",
        limitHit: "maxSourceBytes",
        summary: "Source exceeded the maximum allowed size.",
    };
};

const stdinFor = (tc: TestCase): string => tc.stdin ?? tc.input ?? "";

const expectedFor = (tc: TestCase): string => (tc.expected ?? "").trim();

const compareOutput = (actual: string, expected: string): boolean =>
    actual.trim() === expected.trim();

export async function runWithJudge0(input: RunWithJudge0Input): Promise<RunResult> {
    const tooLarge = sourceTooLarge(input.files, input.limits);
    if (tooLarge) return tooLarge;

    const { languageId, sourceCode, sourceIsBase64 } = await buildSubmissionPayload(
        input.lang,
        input.files,
        input.entryFile,
    );
    const limits = toJudge0Limits(input.limits);

    if (input.mode === "custom") {
        const r = await runOnce({
            languageId,
            sourceCode,
            sourceIsBase64,
            stdin: input.customStdin ?? "",
            limits,
            signal: input.signal,
        });
        const type = mapStatus(r.status.id, false);
        return {
            type,
            stdout: r.stdout,
            stderr: stderrFor(r),
            testResults: null,
            time: formatMs(r.time),
            memory: formatMemory(r.memory),
            summary: headlineFor(r.status.id, r.status.description),
        };
    }

    const tests = input.testCases ?? [];
    if (tests.length === 0) {
        return {
            type: "error",
            stdout: "",
            stderr: "No test cases defined for this question.",
            testResults: null,
            time: "0ms",
            memory: "0 MB",
            summary: "No test cases.",
        };
    }

    const results = await runBatch({
        languageId,
        sourceCode,
        sourceIsBase64,
        stdins: tests.map(stdinFor),
        limits,
        signal: input.signal,
    });

    let firstNonAccepted: Judge0Result | null = null;
    const testResults: TestResult[] = tests.map((tc, i) => {
        const r = results[i];
        const passed = r.status.id === 3 && compareOutput(r.stdout, expectedFor(tc));
        if (!passed && !firstNonAccepted) firstNonAccepted = r;
        return {
            ...tc,
            passed,
            actual: r.stdout.trim() || stderrFor(r).trim() || r.status.description,
            time: formatMs(r.time),
        };
    });

    const passCount = testResults.filter((t) => t.passed).length;
    const totalTime = results.reduce(
        (acc, r) => acc + (r.time ? parseFloat(r.time) : 0),
        0,
    );
    const peakMemoryKb = results.reduce(
        (acc, r) => Math.max(acc, r.memory ?? 0),
        0,
    );

    let type: RunResultType = passCount === tests.length ? "success" : "partial";
    let stderr = "";
    if (firstNonAccepted) {
        const fail = firstNonAccepted as Judge0Result;
        const mapped = mapStatus(fail.status.id, true);
        if (mapped !== "partial") type = mapped;
        stderr = stderrFor(fail);
    }

    return {
        type,
        stdout: results.map((r) => r.stdout).join("\n---\n"),
        stderr,
        testResults,
        time: formatMs(totalTime.toString()),
        memory: formatMemory(peakMemoryKb || null),
        summary:
            passCount === tests.length
                ? "All test cases passed."
                : `${passCount}/${tests.length} test cases passed.`,
    };
}
