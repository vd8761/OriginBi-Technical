"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { FileNode, Question } from "./data";
import { getLimitsFor, type ExecutionLimits } from "./data";
import { runWithJudge0, type RunResult, type TestResult } from "./runWithJudge0";
import { reindent } from "./reindent";
import FileTabs from "./FileTabs";
import FileTreePanel from "./FileTreePanel";
import { usePluginRuntime } from "@/plugins";
import type { CodeRunRequest } from "@/lib/api";

interface StreamingTestEvent {
    runId?: string;
    ordinal?: number;
    passed?: boolean;
    actual?: string;
    time?: string;
}

interface StreamingRunStart {
    runId?: string;
    totalTests?: number;
}

export const PREFS_KEY = "originbi.coding.prefs";

export interface CodingPrefs {
    tabSize?: number;
    findEnabled?: boolean;
    suggestionsEnabled?: boolean;
    lintsEnabled?: boolean;
}

export const readPrefs = (): CodingPrefs => {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        return raw ? (JSON.parse(raw) as CodingPrefs) : {};
    } catch {
        return {};
    }
};

export const writePrefs = (next: CodingPrefs) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
        // ignore quota / privacy-mode errors
    }
};

const sanitizeTabSize = (n: unknown): number => {
    const v = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
    return v === 2 || v === 4 || v === 8 ? v : 4;
};

const MonacoEditor = dynamic(() => import("./MonacoEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-[#111814] text-[12px] text-white/40">
            <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                Loading editor…
            </div>
        </div>
    ),
});

export interface LangMeta {
    label: string;
    ext: string;
    color: string;
    comment: string;
}

export const LANG_META: Record<string, LangMeta> = {
    python: { label: "Python", ext: ".py", color: "#4AC6EA", comment: "#" },
    javascript: { label: "JavaScript", ext: ".js", color: "#FFB703", comment: "//" },
    java: { label: "Java", ext: ".java", color: "#ED2F34", comment: "//" },
    cpp: { label: "C++", ext: ".cpp", color: "#5337BC", comment: "//" },
    c: { label: "C", ext: ".c", color: "#A8B9CC", comment: "//" },
};

interface CodeEditorProps {
    question: Question;
    lang: string;
    fontSize: number;
    theme: "dark" | "light";
    onCodeChange?: (code: string) => void;
    initialFiles?: FileNode[];
    initialEntryFile?: string;
    onWorkspaceChange?: (payload: { language: string; files: FileNode[]; entryFile: string }) => void;
    serverRun?: (input: CodeRunRequest) => Promise<RunResult | undefined>;
    /** When false, Ctrl+F find widget is disabled. Default true. */
    findEnabled?: boolean;
    /** When false, autocomplete is disabled. Default true. */
    suggestionsEnabled?: boolean;
    /** When false, language-service squiggles are hidden. Default true. */
    lintsEnabled?: boolean;
}

const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
};

const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms} ms`);

const LimitsStrip: React.FC<{ limits: ExecutionLimits; theme: "dark" | "light" }> = ({
    limits,
    theme,
}) => {
    const items = [
        { label: "Compile", value: formatMs(limits.compileTimeoutMs) },
        { label: "Runtime", value: formatMs(limits.runtimeTimeoutMs) },
        { label: "Memory", value: `${limits.memoryLimitMB} MB` },
        { label: "Stack", value: `${limits.stackLimitMB} MB` },
        { label: "Output", value: formatBytes(limits.maxOutputBytes) },
        { label: "Source", value: formatBytes(limits.maxSourceBytes) },
        { label: "Procs", value: String(limits.maxProcesses) },
        { label: "Files", value: String(limits.maxOpenFiles) },
    ];
    const isLight = theme === "light";
    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3.5 py-1.5 text-[10.5px]"
            style={{
                borderColor: isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)",
                background: isLight ? "rgba(30,211,106,0.06)" : "rgba(30,211,106,0.04)",
            }}
        >
            <span
                className="font-bold uppercase tracking-[0.08em]"
                style={{ color: "#1ED36A" }}
            >
                Limits
            </span>
            {items.map((it) => (
                <span key={it.label} className="flex items-center gap-1">
                    <span style={{ color: isLight ? "rgba(15,23,18,0.45)" : "rgba(255,255,255,0.4)" }}>
                        {it.label}
                    </span>
                    <span
                        className="font-mono font-bold"
                        style={{ color: isLight ? "#1f2a23" : "rgba(255,255,255,0.85)" }}
                    >
                        {it.value}
                    </span>
                </span>
            ))}
        </div>
    );
};

const OutputPanel: React.FC<{
    result: RunResult | null;
    running: boolean;
    theme: "dark" | "light";
    streamingTests?: TestResult[];
    streamingTotal?: number;
}> = ({ result, running, theme, streamingTests, streamingTotal }) => {
    const isLight = theme === "light";
    if (running) {
        const passed = streamingTests?.filter((t) => t.passed).length ?? 0;
        const completed = streamingTests?.length ?? 0;
        const total = streamingTotal ?? 0;
        const showProgress = total > 0;
        return (
            <div
                className="flex flex-1 flex-col items-center justify-center gap-2 text-[14px]"
                style={{ color: isLight ? "rgba(15,23,18,0.55)" : "rgba(255,255,255,0.5)" }}
            >
                <div className="flex items-center gap-3">
                    <div className="h-[18px] w-[18px] rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                    {showProgress ? `Running tests… ${completed}/${total}` : "Executing code…"}
                </div>
                {showProgress && completed > 0 && (
                    <div className="text-[12px]">
                        {passed}/{completed} passed so far
                    </div>
                )}
            </div>
        );
    }

    if (!result) {
        return (
            <div
                className="flex flex-1 flex-col items-center justify-center gap-2"
                style={{ color: isLight ? "rgba(15,23,18,0.35)" : "rgba(255,255,255,0.2)" }}
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="text-[13px]">Run your code to see output</span>
            </div>
        );
    }

    const isSuccess = result.type === "success";
    const isPartial = result.type === "partial" || result.type === "wrong-answer";
    const isLimit =
        result.type === "timeout" ||
        result.type === "memory-exceeded" ||
        result.type === "output-exceeded" ||
        result.type === "source-too-large";
    const accent = isSuccess
        ? "#1ED36A"
        : isPartial
            ? "#FFB703"
            : isLimit
                ? "#FFB703"
                : "#ED2F34";
    const isCustomRun = !result.testResults;
    const headline =
        result.type === "success"
            ? isCustomRun ? "Run Successful" : "All Tests Passed"
            : result.type === "partial"
                ? "Partial Pass"
                : result.type === "wrong-answer"
                    ? "Wrong Answer"
                    : result.type === "compile-error"
                        ? "Compile Error"
                        : result.type === "runtime-error"
                            ? "Runtime Error"
                            : result.type === "timeout"
                                ? "Time Limit Exceeded"
                                : result.type === "memory-exceeded"
                                    ? "Memory Limit Exceeded"
                                    : result.type === "output-exceeded"
                                        ? "Output Limit Exceeded"
                                        : result.type === "source-too-large"
                                            ? "Source Too Large"
                                            : "Error";

    const stdoutBg = isLight ? "#F7FAF8" : "#0F1712";
    const stdoutBorder = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.07)";
    const stdoutFg = isLight ? "rgba(15,23,18,0.75)" : "rgba(255,255,255,0.7)";

    return (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
            <div
                className="flex flex-wrap items-center gap-2.5 rounded-lg px-3 py-2"
                style={{
                    background: `${accent}14`,
                    border: `1px solid ${accent}40`,
                }}
            >
                <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
                <span className="text-[13px] font-bold" style={{ color: accent }}>
                    {headline}
                </span>
                {result.summary && (
                    <span
                        className="text-[11.5px]"
                        style={{ color: isLight ? "rgba(15,23,18,0.55)" : "rgba(255,255,255,0.55)" }}
                    >
                        {result.summary}
                    </span>
                )}
                <span className="flex-1" />
                {result.time && (
                    <span
                        className="font-mono text-[11px]"
                        style={{ color: isLight ? "rgba(15,23,18,0.45)" : "rgba(255,255,255,0.35)" }}
                    >
                        ⏱ {result.time}
                    </span>
                )}
                {result.memory && (
                    <span
                        className="font-mono text-[11px]"
                        style={{ color: isLight ? "rgba(15,23,18,0.45)" : "rgba(255,255,255,0.35)" }}
                    >
                        💾 {result.memory}
                    </span>
                )}
            </div>

            {result.stdout && (
                <div
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: stdoutBg, border: `1px solid ${stdoutBorder}` }}
                >
                    <div
                        className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{ color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.3)" }}
                    >
                        stdout
                    </div>
                    <pre
                        className="m-0 whitespace-pre-wrap font-mono text-[12px] leading-[1.6]"
                        style={{ color: stdoutFg }}
                    >
                        {result.stdout}
                    </pre>
                </div>
            )}

            {result.stderr && (
                <div
                    className="rounded-lg px-3 py-2.5"
                    style={{
                        background: "rgba(237,47,52,0.08)",
                        border: "1px solid rgba(237,47,52,0.25)",
                    }}
                >
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#ED2F34]">
                        stderr
                    </div>
                    <pre className="m-0 whitespace-pre-wrap font-mono text-[12px] leading-[1.6] text-[#F17074]">
                        {result.stderr}
                    </pre>
                </div>
            )}

            {result.testResults && result.testResults.length > 0 && (
                <div>
                    <div
                        className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{ color: isLight ? "rgba(15,23,18,0.45)" : "rgba(255,255,255,0.3)" }}
                    >
                        Test Cases
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {result.testResults.map((tc, i) => (
                            <div
                                key={i}
                                className="rounded-lg px-3 py-2.5"
                                style={{
                                    background: tc.passed
                                        ? "rgba(30,211,106,0.06)"
                                        : "rgba(237,47,52,0.06)",
                                    border: `1px solid ${tc.passed ? "rgba(30,211,106,0.2)" : "rgba(237,47,52,0.2)"
                                        }`,
                                }}
                            >
                                <div className="mb-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div
                                            className="flex h-4 w-4 items-center justify-center rounded-full"
                                            style={{ background: tc.passed ? "#1ED36A" : "#ED2F34" }}
                                        >
                                            {tc.passed ? (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            ) : (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            )}
                                        </div>
                                        <span
                                            className="text-[12px] font-bold"
                                            style={{ color: tc.passed ? "#1ED36A" : "#ED2F34" }}
                                        >
                                            Case {i + 1} — {tc.passed ? "Passed" : "Failed"}
                                        </span>
                                    </div>
                                    <span
                                        className="font-mono text-[10px]"
                                        style={{ color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.3)" }}
                                    >
                                        {tc.time}
                                    </span>
                                </div>
                                <div
                                    className="font-mono text-[11px] leading-[1.7]"
                                    style={{ color: isLight ? "rgba(15,23,18,0.6)" : "rgba(255,255,255,0.5)" }}
                                >
                                    <div>
                                        <span style={{ color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.3)" }}>Input:    </span>
                                        {tc.input}
                                    </div>
                                    <div>
                                        <span style={{ color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.3)" }}>Expected: </span>
                                        <span style={{ color: "#1ED36A" }}>{tc.expected}</span>
                                    </div>
                                    {!tc.passed && (
                                        <div>
                                            <span style={{ color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.3)" }}>Got:      </span>
                                            <span style={{ color: "#ED2F34" }}>{tc.actual}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const buildInitialFiles = (question: Question, lang: string): FileNode[] => {
    const explicit = question.starterFiles?.[lang];
    if (explicit && explicit.length > 0) {
        return explicit.map((f) => ({ ...f }));
    }
    const ext = LANG_META[lang]?.ext?.replace(".", "") ?? "txt";
    const fallback =
        question.starterCode?.[lang] ??
        `${LANG_META[lang]?.comment ?? "//"} Write your solution here`;
    return [{ path: `solution.${ext}`, content: fallback }];
};

const initialEntryFile = (question: Question, lang: string, files: FileNode[]) => {
    const explicit = question.entryFile?.[lang];
    if (explicit && files.some((f) => f.path === explicit)) return explicit;
    const writable = files.find((f) => !f.readOnly);
    return (writable ?? files[0]).path;
};

const CodeEditor: React.FC<CodeEditorProps> = ({
    question,
    lang,
    fontSize,
    theme,
    onCodeChange,
    initialFiles: restoredFiles,
    initialEntryFile: restoredEntryFile,
    onWorkspaceChange,
    serverRun,
    findEnabled = true,
    suggestionsEnabled = true,
    lintsEnabled = true,
}) => {
    const initialFiles = useMemo(
        () => (restoredFiles?.length ? restoredFiles.map((f) => ({ ...f })) : buildInitialFiles(question, lang)),
        [question, lang, restoredFiles],
    );
    const initialActive = useMemo(
        () => {
            if (restoredEntryFile && initialFiles.some((file) => file.path === restoredEntryFile)) {
                return restoredEntryFile;
            }
            return initialEntryFile(question, lang, initialFiles);
        },
        [question, lang, initialFiles, restoredEntryFile],
    );

    // Starters are authored at 4-space indent. If the user's saved pref differs,
    // normalize once on mount so the editor opens at the requested indent.
    const [files, setFiles] = useState<FileNode[]>(() => {
        const pref = sanitizeTabSize(readPrefs().tabSize);
        if (pref === 4) return initialFiles;
        return initialFiles.map((f) => ({ ...f, content: reindent(f.content ?? "", 4, pref) }));
    });
    const [activePath, setActivePath] = useState<string>(initialActive);
    const [openTabs, setOpenTabs] = useState<string[]>([initialActive]);
    const [treeOpen, setTreeOpen] = useState(true);
    const [result, setResult] = useState<RunResult | null>(null);
    const [running, setRunning] = useState(false);
    // Per-test results streamed in via SSE before the final HTTP response lands.
    // Cleared at the start of each run; the full result from setResult takes over
    // once the HTTP response returns.
    const [streamingTests, setStreamingTests] = useState<TestResult[]>([]);
    const [streamingTotal, setStreamingTotal] = useState(0);
    const currentRunIdRef = useRef<string | null>(null);
    const pluginRuntime = usePluginRuntime();
    const [outputOpen, setOutputOpen] = useState(false);
    const [outputHeight, setOutputHeight] = useState(260);
    const [showLimits, setShowLimits] = useState(true);
    const [bottomTab, setBottomTab] = useState<"input" | "output">("input");
    const [customInput, setCustomInput] = useState("");
    const [tabSize, setTabSizeState] = useState<number>(() => sanitizeTabSize(readPrefs().tabSize));
    const prevTabSize = useRef<number>(tabSize);
    const prevQId = useRef(question.id);

    const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setTabSize = useCallback(
        (next: number) => {
            const clamped = sanitizeTabSize(next);
            const from = prevTabSize.current;
            if (clamped === from) return;
            // Apply file rewrites and tab-size update outside any state-updater function
            // (calling setFiles inside another state's updater double-applies under
            // React strict mode and corrupts the indentation).
            setFiles((cur) =>
                cur.map((f) => ({ ...f, content: reindent(f.content ?? "", from, clamped) })),
            );
            setTabSizeState(clamped);
            prevTabSize.current = clamped;
            writePrefs({ ...readPrefs(), tabSize: clamped });
        },
        [],
    );
    const runAbortRef = useRef<AbortController | null>(null);

    const limits = useMemo(() => getLimitsFor(lang, question.limits), [lang, question.limits]);
    const isLight = theme === "light";

    const activeFile = files.find((f) => f.path === activePath) ?? files[0];

    useEffect(() => {
        if (question.id !== prevQId.current) {
            const raw = restoredFiles?.length
                ? restoredFiles.map((f) => ({ ...f }))
                : buildInitialFiles(question, lang);
            const next =
                tabSize === 4
                    ? raw
                    : raw.map((f) => ({ ...f, content: reindent(f.content ?? "", 4, tabSize) }));
            const entry =
                restoredEntryFile && next.some((file) => file.path === restoredEntryFile)
                    ? restoredEntryFile
                    : initialEntryFile(question, lang, next);
            setFiles(next);
            setOpenTabs([entry]);
            setActivePath(entry);
            setResult(null);
            prevQId.current = question.id;
        }
    }, [question, lang, restoredEntryFile, restoredFiles, tabSize]);

    useEffect(() => {
        onCodeChange?.(activeFile?.content ?? "");
    }, [activeFile?.content, onCodeChange]);

    useEffect(() => {
        onWorkspaceChange?.({
            language: lang,
            files,
            entryFile: activePath,
        });
    }, [activePath, files, lang, onWorkspaceChange]);

    useEffect(() => () => {
        runAbortRef.current?.abort();
    }, []);

    const handleEditorChange = useCallback(
        (next: string) => {
            setFiles((prev) =>
                prev.map((f) => (f.path === activePath ? { ...f, content: next } : f)),
            );
            setSaveState("saving");
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                setSaveState("saved");
                saveTimerRef.current = null;
            }, 500);
        },
        [activePath],
    );

    useEffect(() => () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }, []);

    const openFile = useCallback((path: string) => {
        setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
        setActivePath(path);
    }, []);

    const closeTab = useCallback(
        (path: string) => {
            setOpenTabs((prev) => {
                if (prev.length <= 1) return prev;
                const next = prev.filter((p) => p !== path);
                if (path === activePath) {
                    const idx = prev.indexOf(path);
                    setActivePath(next[Math.max(0, idx - 1)] ?? next[0]);
                }
                return next;
            });
        },
        [activePath],
    );

    const executeRun = useCallback(
        async (mode: "custom" | "tests") => {
            if (running) return;
            runAbortRef.current?.abort();
            const controller = new AbortController();
            runAbortRef.current = controller;
            setRunning(true);
            setStreamingTests([]);
            setStreamingTotal(0);
            currentRunIdRef.current = null;
            setOutputOpen(true);
            setBottomTab("output");
            try {
                const entryFile = question.entryFile?.[lang] ?? activePath;
                const res = serverRun
                    ? await serverRun({
                        mode,
                        language: lang,
                        files,
                        entryFile,
                        customStdin: mode === "custom" ? customInput : undefined,
                    })
                    : process.env.NODE_ENV !== "production"
                        ? await runWithJudge0({
                        lang,
                        files,
                        entryFile,
                        limits,
                        mode,
                        customStdin: mode === "custom" ? customInput : undefined,
                        testCases: mode === "tests" ? question.testCases : undefined,
                        signal: controller.signal,
                    })
                        : {
                            type: "error" as const,
                            stdout: "",
                            stderr: "Server code execution is required in production.",
                            testResults: null,
                            time: "0ms",
                            memory: "0 MB",
                            summary: "Code runner unavailable.",
                        };
                if (!res) return;
                setResult(res);
            } catch (e) {
                if ((e as { name?: string })?.name === "AbortError") return;
                const message = e instanceof Error ? e.message : String(e);
                setResult({
                    type: "error",
                    stdout: "",
                    stderr: `Code run failed: ${message}`,
                    testResults: null,
                    time: "0ms",
                    memory: "0 MB",
                    summary: "Network or server error.",
                });
            } finally {
                if (runAbortRef.current === controller) runAbortRef.current = null;
                setRunning(false);
            }
        },
        [
            running,
            lang,
            files,
            activePath,
            limits,
            customInput,
            question.entryFile,
            question.testCases,
            serverRun,
        ],
    );

    // Subscribe to the per-attempt SSE channel for incremental "Run tests"
    // progress. The server emits coding.run_started (with runId + totalTests)
    // and coding.test_finished (one per test). We bind the first runId we see
    // after a run kicks off and ignore stragglers from prior runs.
    useEffect(() => {
        if (!pluginRuntime) return;
        const offStart = pluginRuntime.subscribe("coding.run_started", (payload: unknown) => {
            const p = payload as StreamingRunStart;
            if (typeof p?.runId === "string") {
                currentRunIdRef.current = p.runId;
                setStreamingTests([]);
                setStreamingTotal(typeof p.totalTests === "number" ? p.totalTests : 0);
            }
        });
        const offFinish = pluginRuntime.subscribe("coding.test_finished", (payload: unknown) => {
            const p = payload as StreamingTestEvent;
            if (!p || typeof p.ordinal !== "number") return;
            if (currentRunIdRef.current && p.runId && p.runId !== currentRunIdRef.current) return;
            setStreamingTests((prev) => {
                const next = prev.filter((t) => (t as TestResult & { ordinal?: number }).ordinal !== p.ordinal);
                next.push({
                    input: "",
                    expected: "",
                    passed: !!p.passed,
                    actual: p.actual ?? "",
                    time: p.time ?? "",
                    ordinal: p.ordinal,
                } as TestResult & { ordinal?: number });
                next.sort((a, b) => ((a as { ordinal?: number }).ordinal ?? 0) - ((b as { ordinal?: number }).ordinal ?? 0));
                return next;
            });
        });
        return () => {
            offStart?.();
            offFinish?.();
        };
    }, [pluginRuntime]);

    const handleRun = useCallback(() => {
        void executeRun("custom");
    }, [executeRun]);

    const handleRunTests = useCallback(() => {
        void executeRun("tests");
    }, [executeRun]);

    const handleReset = () => {
        const raw = buildInitialFiles(question, lang);
        const next =
            tabSize === 4
                ? raw
                : raw.map((f) => ({ ...f, content: reindent(f.content ?? "", 4, tabSize) }));
        const entry = initialEntryFile(question, lang, next);
        setFiles(next);
        setOpenTabs([entry]);
        setActivePath(entry);
        setResult(null);
    };

    const handleFormat = useCallback(() => {
        setFiles((prev) =>
            prev.map((f) =>
                f.path === activePath
                    ? { ...f, content: reindent(f.content ?? "", null, tabSize) }
                    : f,
            ),
        );
    }, [activePath, tabSize]);

    if (question.type === "mcq") {
        return (
            <div
                className="flex h-full flex-col items-center justify-center gap-4"
                style={{
                    background: isLight ? "#F8FBF9" : "#111814",
                    color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.25)",
                }}
            >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="text-center">
                    <div
                        className="mb-1 text-[15px] font-semibold"
                        style={{ color: isLight ? "rgba(15,23,18,0.55)" : "rgba(255,255,255,0.4)" }}
                    >
                        Multiple Choice Question
                    </div>
                    <div
                        className="text-[13px]"
                        style={{ color: isLight ? "rgba(15,23,18,0.4)" : "rgba(255,255,255,0.2)" }}
                    >
                        Select your answer in the question panel on the left.
                    </div>
                </div>
            </div>
        );
    }

    const meta = LANG_META[lang] ?? LANG_META.python;

    const editorBg = isLight ? "#F8FBF9" : "#111814";
    const toolbarBorder = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.07)";
    const chipBg = isLight ? "rgba(15,23,18,0.04)" : "rgba(255,255,255,0.06)";
    const chipBorder = isLight ? "rgba(15,23,18,0.12)" : "rgba(255,255,255,0.1)";
    const chipText = isLight ? "#1f2a23" : "#fff";
    const subtle = isLight ? "rgba(15,23,18,0.45)" : "rgba(255,255,255,0.5)";
    const outputBg = isLight ? "#FAFCFB" : "#0D110F";
    const outputBorder = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.08)";

    return (
        <div className="flex h-full flex-col" style={{ background: editorBg }}>
            <div
                className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-3.5 py-2.5"
                style={{ borderColor: toolbarBorder }}
            >
                <div
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                    style={{ background: chipBg, border: `1px solid ${chipBorder}` }}
                >
                    <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                    <span className="text-[13px] font-semibold" style={{ color: chipText }}>
                        {meta.label}
                    </span>
                    <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: subtle }}
                    >
                        {meta.ext}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowLimits((s) => !s)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all"
                    style={{
                        background: showLimits
                            ? "rgba(30,211,106,0.12)"
                            : isLight
                                ? "rgba(15,23,18,0.04)"
                                : "rgba(255,255,255,0.04)",
                        border: `1px solid ${showLimits ? "rgba(30,211,106,0.35)" : chipBorder}`,
                        color: showLimits ? "#1ED36A" : subtle,
                    }}
                    title="Toggle execution limits"
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Limits
                </button>
                <label
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all"
                    style={{
                        background: isLight ? "rgba(15,23,18,0.04)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${chipBorder}`,
                        color: subtle,
                    }}
                    title="Spaces per indent (Tab key)"
                >
                    <span className="uppercase tracking-[0.06em]">Indent</span>
                    <select
                        value={tabSize}
                        onChange={(e) => setTabSize(parseInt(e.target.value, 10))}
                        aria-label="Indent size in spaces"
                        className="cursor-pointer border-0 bg-transparent text-[12px] font-bold outline-none"
                        style={{ color: chipText }}
                    >
                        {[2, 4, 8].map((n) => (
                            <option
                                key={n}
                                value={n}
                                style={{ background: isLight ? "#FFFFFF" : "#111814" }}
                            >
                                {n}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    onClick={handleFormat}
                    title="Format / re-indent active file (Shift+Alt+F)"
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all"
                    style={{
                        background: isLight ? "rgba(15,23,18,0.04)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${chipBorder}`,
                        color: subtle,
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <line x1="8" y1="12" x2="20" y2="12" />
                        <line x1="6" y1="18" x2="20" y2="18" />
                    </svg>
                    Format
                </button>
                <div className="flex-1" />
                <span
                    aria-live="polite"
                    className="flex items-center gap-1.5 text-[11px] font-semibold transition-opacity"
                    style={{
                        color: saveState === "saved" ? "#1ED36A" : isLight ? "rgba(15,23,18,0.55)" : "rgba(255,255,255,0.55)",
                        opacity: 0.95,
                    }}
                    title={saveState === "saved" ? "Changes are kept in this session" : "Changes are being applied"}
                >
                    {saveState === "saved" ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <span className="h-2 w-2 rounded-full bg-current animate-pulse-soft" />
                    )}
                    {saveState === "saved" ? "Saved" : "Saving…"}
                </span>
                <button
                    type="button"
                    onClick={handleReset}
                    title="Reset to starter code"
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all"
                    style={{
                        background: isLight ? "rgba(15,23,18,0.04)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${chipBorder}`,
                        color: subtle,
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-4" />
                    </svg>
                    Reset
                </button>
                <button
                    type="button"
                    onClick={handleRun}
                    disabled={running}
                    title="Run with Custom Input"
                    className="flex items-center gap-1.5 rounded-lg border border-[#1ED36A]/35 bg-[#1ED36A]/[0.12] px-4 py-1.5 text-[13px] font-bold text-[#1ED36A] transition-all hover:bg-[#1ED36A]/[0.18] disabled:cursor-not-allowed disabled:text-[#1ED36A]/50"
                >
                    {running ? (
                        <div className="h-3 w-3 rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#1ED36A">
                            <polygon points="5 3 19 12 5 21" />
                        </svg>
                    )}
                    {running ? "Running…" : "Run"}
                </button>
                {(question.testCases?.length ?? 0) > 0 && (
                    <button
                        type="button"
                        onClick={handleRunTests}
                        disabled={running}
                        title="Run all test cases"
                        className="flex items-center gap-1.5 rounded-lg border border-[#1ED36A] bg-[#1ED36A] px-4 py-1.5 text-[13px] font-extrabold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Run Tests
                    </button>
                )}
            </div>

            {showLimits && <LimitsStrip limits={limits} theme={theme} />}

            <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                <div className="flex flex-1 overflow-hidden min-h-0">
                    <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                        <div className="flex flex-shrink-0 items-stretch">
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <FileTabs
                                    tabs={openTabs.map((p) => {
                                        const f = files.find((x) => x.path === p);
                                        return { path: p, readOnly: f?.readOnly };
                                    })}
                                    active={activePath}
                                    onActivate={(p) => setActivePath(p)}
                                    onClose={closeTab}
                                    theme={theme}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setTreeOpen((s) => !s)}
                                title={treeOpen ? "Hide file tree" : "Show file tree"}
                                aria-label="Toggle file tree"
                                className="flex h-8 w-9 flex-shrink-0 cursor-pointer items-center justify-center transition-colors"
                                style={{
                                    background: treeOpen
                                        ? "rgba(30,211,106,0.12)"
                                        : isLight
                                            ? "rgba(15,23,18,0.04)"
                                            : "rgba(255,255,255,0.04)",
                                    borderLeft: `1px solid ${toolbarBorder}`,
                                    borderBottom: `1px solid ${toolbarBorder}`,
                                    color: treeOpen ? "#1ED36A" : subtle,
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex flex-1 min-h-0 overflow-hidden">
                            {activeFile && (
                                <MonacoEditor
                                    path={activeFile.path}
                                    value={activeFile.content}
                                    language={lang}
                                    fontSize={fontSize}
                                    tabSize={tabSize}
                                    theme={theme}
                                    readOnly={activeFile.readOnly}
                                    lockedRegions={activeFile.lockedRegions}
                                    onChange={handleEditorChange}
                                    onFormat={handleFormat}
                                    findEnabled={findEnabled}
                                    suggestionsEnabled={suggestionsEnabled}
                                    lintsEnabled={lintsEnabled}
                                />
                            )}
                        </div>
                    </div>
                    {treeOpen && (
                        <FileTreePanel
                            files={files}
                            activePath={activePath}
                            theme={theme}
                            onOpen={openFile}
                            onFilesChange={setFiles}
                            onPathRename={(oldPath, newPath) => {
                                setOpenTabs((prev) =>
                                    prev.map((p) => (p === oldPath ? newPath : p)),
                                );
                                setActivePath((p) => (p === oldPath ? newPath : p));
                            }}
                            onPathDelete={(path) => {
                                setOpenTabs((prev) => {
                                    if (!prev.includes(path)) return prev;
                                    if (prev.length === 1) {
                                        // Keep at least one tab — re-open another file if available.
                                        const fallback = files.find((f) => f.path !== path);
                                        if (fallback) {
                                            setActivePath(fallback.path);
                                            return [fallback.path];
                                        }
                                        return prev;
                                    }
                                    const next = prev.filter((p) => p !== path);
                                    if (path === activePath) {
                                        const idx = prev.indexOf(path);
                                        setActivePath(next[Math.max(0, idx - 1)] ?? next[0]);
                                    }
                                    return next;
                                });
                            }}
                        />
                    )}
                </div>

                {outputOpen ? (
                    <div
                        className="flex flex-shrink-0 flex-col border-t"
                        style={{
                            background: outputBg,
                            borderColor: outputBorder,
                            height: outputHeight,
                        }}
                    >
                        <div
                            className="flex flex-shrink-0 select-none cursor-ns-resize items-center gap-1 border-b px-3 py-1.5"
                            style={{ borderColor: outputBorder }}
                            onMouseDown={(e) => {
                                const startY = e.clientY;
                                const startH = outputHeight;
                                const onMove = (me: MouseEvent) =>
                                    setOutputHeight(
                                        Math.max(140, Math.min(540, startH - (me.clientY - startY))),
                                    );
                                const onUp = () => {
                                    document.removeEventListener("mousemove", onMove);
                                    document.removeEventListener("mouseup", onUp);
                                };
                                document.addEventListener("mousemove", onMove);
                                document.addEventListener("mouseup", onUp);
                            }}
                        >
                            {(["input", "output"] as const).map((tab) => {
                                const active = bottomTab === tab;
                                const label = tab === "input" ? "Custom Input" : "Output";
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setBottomTab(tab);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="cursor-pointer rounded-md border-0 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                                        style={{
                                            background: active
                                                ? "rgba(30,211,106,0.14)"
                                                : "transparent",
                                            color: active
                                                ? "#1ED36A"
                                                : isLight
                                                    ? "rgba(15,23,18,0.5)"
                                                    : "rgba(255,255,255,0.45)",
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                            <div
                                className="mx-auto h-[3px] w-7 flex-shrink-0 rounded-sm"
                                style={{
                                    background: isLight
                                        ? "rgba(15,23,18,0.18)"
                                        : "rgba(255,255,255,0.15)",
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOutputOpen(false);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="cursor-pointer border-0 bg-transparent text-[14px] leading-none"
                                style={{
                                    color: isLight
                                        ? "rgba(15,23,18,0.4)"
                                        : "rgba(255,255,255,0.3)",
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        {bottomTab === "input" ? (
                            <div className="flex flex-1 flex-col overflow-hidden">
                                <div
                                    className="flex-shrink-0 px-3.5 py-2 text-[10.5px]"
                                    style={{
                                        color: isLight
                                            ? "rgba(15,23,18,0.5)"
                                            : "rgba(255,255,255,0.45)",
                                    }}
                                >
                                    Each newline is a separate stdin line. Used by the
                                    <span className="font-bold"> Run </span>
                                    button.
                                </div>
                                <textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    spellCheck={false}
                                    placeholder={"Type your input here…\nOne line per stdin entry."}
                                    className="m-0 flex-1 resize-none border-0 bg-transparent px-3.5 pb-3 font-mono text-[12.5px] leading-[1.6] outline-none"
                                    style={{
                                        color: isLight
                                            ? "rgba(15,23,18,0.85)"
                                            : "rgba(255,255,255,0.85)",
                                    }}
                                />
                            </div>
                        ) : (
                            <OutputPanel
                                result={result}
                                running={running}
                                theme={theme}
                                streamingTests={streamingTests}
                                streamingTotal={streamingTotal}
                            />
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setOutputOpen(true)}
                        className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 border-0 px-3.5 py-2 text-[12px] font-bold"
                        style={{
                            borderTop: `1px solid ${outputBorder}`,
                            background: isLight ? "rgba(15,23,18,0.03)" : "rgba(255,255,255,0.03)",
                            color: result
                                ? result.type === "success"
                                    ? "#1ED36A"
                                    : result.type === "partial"
                                        ? "#FFB703"
                                        : "#ED2F34"
                                : isLight
                                    ? "rgba(15,23,18,0.55)"
                                    : "rgba(255,255,255,0.5)",
                        }}
                    >
                        <div className="h-1.5 w-1.5 rounded-full bg-current" />
                        {result
                            ? `Show Output — ${result.type === "success"
                                ? "All Passed"
                                : result.type === "partial"
                                    ? "Partial"
                                    : "Error"
                            }`
                            : "Open Custom Input"}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default CodeEditor;
