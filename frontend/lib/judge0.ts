// Judge0 REST client. The frontend is exported statically (no Next.js route
// handlers), so the browser talks to Judge0 directly. Judge0 here is local,
// CORS open, no auth.

const DEFAULT_BASE_URL = "http://localhost:2358";

export const JUDGE0_BASE_URL = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "/judge0-api" : (process.env.NEXT_PUBLIC_JUDGE0_URL || DEFAULT_BASE_URL);

export const JUDGE0_LANG_ID: Record<string, number> = {
    python: 71,
    javascript: 63,
    java: 62,
    cpp: 54,
    c: 50,
};

export const JUDGE0_MULTIFILE_ID = 89;

export interface Judge0Limits {
    cpu_time_limit?: number;
    wall_time_limit?: number;
    memory_limit?: number;
    stack_limit?: number;
    max_processes_and_or_threads?: number;
    max_file_size?: number;
}

export interface Judge0Submission {
    language_id: number;
    source_code: string;
    additional_files?: string;
    stdin?: string;
    limits?: Judge0Limits;
}

export interface Judge0Result {
    stdout: string;
    stderr: string;
    compileOutput: string;
    message: string;
    status: { id: number; description: string };
    time: string | null;
    memory: number | null;
    token: string;
}

const utf8ToBase64 = (s: string): string => {
    if (typeof window === "undefined") return Buffer.from(s, "utf-8").toString("base64");
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
};

const base64ToUtf8 = (s: string): string => {
    if (!s) return "";
    if (typeof window === "undefined") return Buffer.from(s, "base64").toString("utf-8");
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
};

const buildPayload = (sub: Judge0Submission, sourceIsAlreadyB64 = false) => {
    const body: Record<string, unknown> = {
        language_id: sub.language_id,
    };
    if (sub.language_id === JUDGE0_MULTIFILE_ID) {
        // Multi-file program: source_code MUST be blank, the zip goes in additional_files.
        body.source_code = "";
        body.additional_files = sub.additional_files ?? sub.source_code;
    } else {
        body.source_code = sourceIsAlreadyB64
            ? sub.source_code
            : utf8ToBase64(sub.source_code);
    }
    if (sub.stdin != null) body.stdin = utf8ToBase64(sub.stdin);
    if (sub.limits) Object.assign(body, sub.limits);
    return body;
};

const decodeResult = (raw: Record<string, unknown>): Judge0Result => ({
    stdout: base64ToUtf8((raw.stdout as string) ?? ""),
    stderr: base64ToUtf8((raw.stderr as string) ?? ""),
    compileOutput: base64ToUtf8((raw.compile_output as string) ?? ""),
    message: base64ToUtf8((raw.message as string) ?? ""),
    status: (raw.status as { id: number; description: string }) ?? {
        id: 13,
        description: "Internal Error",
    },
    time: (raw.time as string | null) ?? null,
    memory: (raw.memory as number | null) ?? null,
    token: (raw.token as string) ?? "",
});

export interface RunSubmissionInput {
    languageId: number;
    sourceCode: string;
    sourceIsBase64?: boolean;
    stdin?: string;
    limits?: Judge0Limits;
    signal?: AbortSignal;
}

export async function runOnce(input: RunSubmissionInput): Promise<Judge0Result> {
    const url = `${JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=true`;
    const body = buildPayload(
        {
            language_id: input.languageId,
            source_code: input.sourceCode,
            stdin: input.stdin,
            limits: input.limits,
        },
        input.sourceIsBase64,
    );
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: input.signal,
    });
    if (!res.ok) {
        throw new Error(`Judge0 submission failed: ${res.status} ${res.statusText}`);
    }
    const raw = await res.json();
    return decodeResult(raw);
}

export interface BatchSubmissionInput {
    languageId: number;
    sourceCode: string;
    sourceIsBase64?: boolean;
    stdins: string[];
    limits?: Judge0Limits;
    signal?: AbortSignal;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
}

interface BatchTokenResp {
    token: string;
}

export async function runBatch(input: BatchSubmissionInput): Promise<Judge0Result[]> {
    if (input.stdins.length === 0) return [];

    const submissions = input.stdins.map((stdin) =>
        buildPayload(
            {
                language_id: input.languageId,
                source_code: input.sourceCode,
                stdin,
                limits: input.limits,
            },
            input.sourceIsBase64,
        ),
    );

    const submitRes = await fetch(
        `${JUDGE0_BASE_URL}/submissions/batch?base64_encoded=true`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissions }),
            signal: input.signal,
        },
    );
    if (!submitRes.ok) {
        throw new Error(`Judge0 batch submission failed: ${submitRes.status} ${submitRes.statusText}`);
    }
    const tokenList = (await submitRes.json()) as BatchTokenResp[];
    const tokens = tokenList.map((t) => t.token);

    const intervalMs = input.pollIntervalMs ?? 400;
    const timeoutMs = input.pollTimeoutMs ?? 60_000;
    const start = Date.now();

    while (true) {
        if (Date.now() - start > timeoutMs) {
            throw new Error("Judge0 batch polling timed out");
        }
        const url = `${JUDGE0_BASE_URL}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=*`;
        const res = await fetch(url, { signal: input.signal });
        if (!res.ok) {
            throw new Error(`Judge0 batch poll failed: ${res.status} ${res.statusText}`);
        }
        const data = (await res.json()) as { submissions: Record<string, unknown>[] };
        const results = data.submissions ?? [];
        const allDone = results.every((r) => {
            const s = r.status as { id?: number } | undefined;
            return typeof s?.id === "number" && s.id >= 3;
        });
        if (allDone && results.length === tokens.length) {
            return results.map((r) => decodeResult(r));
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}

export interface ToJudge0LimitsInput {
    runtimeTimeoutMs: number;
    memoryLimitMB: number;
    stackLimitMB: number;
    maxProcesses: number;
    maxOutputBytes: number;
}

export function toJudge0Limits(l: ToJudge0LimitsInput): Judge0Limits {
    return {
        cpu_time_limit: Math.max(1, l.runtimeTimeoutMs / 1000),
        wall_time_limit: Math.max(2, (l.runtimeTimeoutMs * 2) / 1000),
        memory_limit: Math.round(l.memoryLimitMB * 1024),
        stack_limit: Math.round(l.stackLimitMB * 1024),
        max_processes_and_or_threads: l.maxProcesses,
        max_file_size: Math.max(1024, Math.round(l.maxOutputBytes / 1024)),
    };
}
