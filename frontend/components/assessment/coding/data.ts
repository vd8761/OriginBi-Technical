export type QuestionType = "code-pretext" | "image" | "media" | "mcq";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface TestCase {
    input: string;
    expected: string;
    stdin?: string;
    comparator?: string;
    comparatorConfig?: unknown;
}

export interface ExecutionLimits {
    compileTimeoutMs: number;
    runtimeTimeoutMs: number;
    memoryLimitMB: number;
    maxOutputBytes: number;
    maxSourceBytes: number;
    stackLimitMB: number;
    maxProcesses: number;
    maxOpenFiles: number;
}

export const DEFAULT_LIMITS_BY_LANG: Record<string, ExecutionLimits> = {
    python: {
        compileTimeoutMs: 4000,
        runtimeTimeoutMs: 5000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 64 * 1024,
        stackLimitMB: 16,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
    javascript: {
        compileTimeoutMs: 4000,
        runtimeTimeoutMs: 5000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 64 * 1024,
        stackLimitMB: 16,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
    java: {
        compileTimeoutMs: 8000,
        runtimeTimeoutMs: 6000,
        memoryLimitMB: 512,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 96 * 1024,
        stackLimitMB: 64,
        maxProcesses: 64,
        maxOpenFiles: 24,
    },
    cpp: {
        compileTimeoutMs: 10000,
        runtimeTimeoutMs: 4000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 96 * 1024,
        stackLimitMB: 64,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
    c: {
        compileTimeoutMs: 8000,
        runtimeTimeoutMs: 4000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 64 * 1024,
        stackLimitMB: 64,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
};

export const FALLBACK_LIMITS: ExecutionLimits = DEFAULT_LIMITS_BY_LANG.python;

export function getLimitsFor(lang: string, override?: Partial<ExecutionLimits>): ExecutionLimits {
    const base = DEFAULT_LIMITS_BY_LANG[lang] ?? FALLBACK_LIMITS;
    return { ...base, ...(override ?? {}) };
}

// Region of lines that the candidate cannot modify. Matches the JSON shape
// produced by the admin authoring panel and validated on the backend by
// assessment.coding's runtime.go on every run/submit.
export interface LockedRegion {
    startLine: number;
    endLine: number;
    reason?: string;
}

export interface FileNode {
    path: string;
    content: string;
    readOnly?: boolean;
    language?: string;
    // When present, these line ranges are visually locked in the editor and
    // edit attempts are reverted on the client. Backend re-validates on every
    // run, so this is UX only — defense in depth is server-side.
    lockedRegions?: LockedRegion[];
}

export interface Question {
    id: number;
    type: QuestionType;
    difficulty: Difficulty;
    marks: number;
    section: string;
    title: string;
    prompt: string;
    pretext?: { language: string; code: string };
    image?: { url: string | null; caption: string; alt: string };
    media?: { type: "video"; embedUrl: string | null; caption: string };
    options?: string[];
    correct?: number;
    explanation?: string;
    starterCode?: Record<string, string>;
    starterFiles?: Record<string, FileNode[]>;
    entryFile?: Record<string, string>;
    testCases?: TestCase[];
    limits?: Partial<ExecutionLimits>;
    // Plugin slugs (e.g., "language.python") the question allows. Intersected
    // with user entitlements + section config on the candidate side; if the
    // intersection is empty the candidate is bounced to /explore/coding.
    allowedLanguages?: string[];
}

export const TOTAL_TIME_SECONDS = 90 * 60;
