"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, Link2, Loader2 } from "lucide-react";
import { createAdminQuestion, type AdminQuestionInput } from "@/lib/api";
import { Modal } from "@/components/admin/ui";
import {
    downloadSampleJson,
    downloadSampleXlsx,
    parseImportFile,
    parseJsonText,
} from "@/lib/codingSamples";

// Phases drive which subtree of the modal is visible. Linear progression:
// idle → parsing → preview → importing → done. The user can cancel from
// preview, and can abort during importing (between rows, not in-flight).
type Phase = "idle" | "parsing" | "preview" | "importing" | "done";
type Tab = "file" | "url" | "paste";

interface ImportRowResult {
    row: number;
    title: string;
    ok: boolean;
    error?: string;
}

interface BulkImportModalProps {
    open: boolean;
    onClose: () => void;
    onImported: (count: number) => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ open, onClose, onImported }) => {
    const [tab, setTab] = useState<Tab>("file");
    const [phase, setPhase] = useState<Phase>("idle");
    const [parseError, setParseError] = useState<string | null>(null);
    const [parsed, setParsed] = useState<AdminQuestionInput[]>([]);
    const [progress, setProgress] = useState<{ done: number; total: number; results: ImportRowResult[] }>({
        done: 0,
        total: 0,
        results: [],
    });
    const [dragging, setDragging] = useState(false);
    const [url, setUrl] = useState("");
    const [pasteText, setPasteText] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const abortRef = useRef<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const statusListRef = useRef<HTMLDivElement | null>(null);

    // Reset state every time the modal is reopened so a previous import's
    // progress / errors don't bleed into a new session.
    useEffect(() => {
        if (!open) return;
        setTab("file");
        setPhase("idle");
        setParseError(null);
        setParsed([]);
        setProgress({ done: 0, total: 0, results: [] });
        setDragging(false);
        setUrl("");
        setPasteText("");
        setFileName(null);
        abortRef.current = false;
    }, [open]);

    // Auto-scroll the per-row status list to the latest entry so the admin
    // sees current progress without reaching for the scrollbar.
    useEffect(() => {
        if (statusListRef.current) {
            statusListRef.current.scrollTop = statusListRef.current.scrollHeight;
        }
    }, [progress.results.length]);

    const handleParsed = useCallback((rows: AdminQuestionInput[], source: string) => {
        if (!rows.length) {
            setParseError(`${source}: parsed 0 questions`);
            setPhase("idle");
            return;
        }
        setParsed(rows);
        setParseError(null);
        setPhase("preview");
    }, []);

    const handleFile = useCallback(async (file: File) => {
        setFileName(file.name);
        setPhase("parsing");
        setParseError(null);
        try {
            const rows = await parseImportFile(file);
            handleParsed(rows, file.name);
        } catch (err) {
            setParseError(err instanceof Error ? err.message : String(err));
            setPhase("idle");
        }
    }, [handleParsed]);

    const handleUrl = useCallback(async () => {
        const trimmed = url.trim();
        if (!trimmed) return;
        setPhase("parsing");
        setParseError(null);
        try {
            // Direct browser fetch; only works for CORS-friendly hosts (GitHub
            // raw, S3 with the right headers, same-origin). If the host blocks
            // CORS the error surfaces here and the user can fall back to File
            // or Paste.
            const res = await fetch(trimmed, { mode: "cors" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const isJson = trimmed.toLowerCase().endsWith(".json")
                || (res.headers.get("Content-Type") ?? "").includes("application/json");
            if (isJson) {
                const text = await res.text();
                const rows = parseJsonText(text);
                handleParsed(rows, trimmed);
                return;
            }
            const blob = await res.blob();
            const file = new File([blob], trimmed.split("/").pop() || "import.xlsx", {
                type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const rows = await parseImportFile(file);
            handleParsed(rows, trimmed);
        } catch (err) {
            setParseError(
                err instanceof Error
                    ? `${err.message} (URL fetches can be blocked by CORS — try File or Paste instead.)`
                    : String(err),
            );
            setPhase("idle");
        }
    }, [url, handleParsed]);

    const handlePaste = useCallback(() => {
        setPhase("parsing");
        setParseError(null);
        try {
            const rows = parseJsonText(pasteText);
            handleParsed(rows, "pasted JSON");
        } catch (err) {
            setParseError(err instanceof Error ? err.message : String(err));
            setPhase("idle");
        }
    }, [pasteText, handleParsed]);

    const beginImport = useCallback(async () => {
        if (!parsed.length) return;
        abortRef.current = false;
        setPhase("importing");
        setProgress({ done: 0, total: parsed.length, results: [] });
        for (let i = 0; i < parsed.length; i++) {
            if (abortRef.current) break;
            const item = parsed[i];
            const title = item.title ?? `Row ${i + 1}`;
            try {
                await createAdminQuestion(item);
                setProgress((p) => ({
                    done: p.done + 1,
                    total: p.total,
                    results: [...p.results, { row: i + 1, title, ok: true }],
                }));
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setProgress((p) => ({
                    done: p.done + 1,
                    total: p.total,
                    results: [...p.results, { row: i + 1, title, ok: false, error: msg }],
                }));
            }
        }
        setPhase("done");
    }, [parsed]);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) void handleFile(file);
    }, [handleFile]);

    const successCount = useMemo(() => progress.results.filter((r) => r.ok).length, [progress.results]);
    const failCount = useMemo(() => progress.results.filter((r) => !r.ok).length, [progress.results]);

    // Block close during an in-flight import — losing the progress view halfway
    // through is worse than the modal feeling temporarily "stuck".
    const handleClose = useCallback(() => {
        if (phase === "importing") return;
        if (phase === "done" && successCount > 0) onImported(successCount);
        onClose();
    }, [phase, successCount, onImported, onClose]);

    return (
        <Modal
            open={open}
            onClose={handleClose}
            eyebrow="Question Bank"
            title="Bulk import questions"
            wide
        >
            <p
                className="admin-card-subtitle"
                style={{ margin: 0, fontSize: 12.5 }}
            >
                Upload XLSX or JSON. Each row creates one question — mix coding, MCQ, and fill-in-the-blank in a single file.
                Set the row&apos;s <span className="admin-mono">type</span> column (XLSX) or <span className="admin-mono">type</span> field (JSON)
                to <span className="admin-mono">coding</span>, <span className="admin-mono">mcq</span>, or <span className="admin-mono">fillblank</span>.
            </p>

            <div
                className="admin-row"
                style={{
                    padding: "12px 14px",
                    borderRadius: "var(--admin-r-md)",
                    border: "1px solid var(--admin-border)",
                    background: "var(--admin-card)",
                    flexWrap: "wrap",
                    gap: 10,
                }}
            >
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--admin-fg-3)",
                    }}
                >
                    Need a template?
                </span>
                <button
                    type="button"
                    onClick={() => downloadSampleXlsx()}
                    className="admin-btn admin-btn-secondary"
                    style={{ minHeight: 32, padding: "6px 12px", fontSize: 12 }}
                >
                    <Download size={12} /> Sample XLSX
                </button>
                <button
                    type="button"
                    onClick={() => downloadSampleJson()}
                    className="admin-btn admin-btn-secondary"
                    style={{ minHeight: 32, padding: "6px 12px", fontSize: 12 }}
                >
                    <Download size={12} /> Sample JSON
                </button>
            </div>

            {phase === "idle" && (
                <>
                    <div className="admin-segment" style={{ alignSelf: "flex-start" }}>
                        {([
                            { id: "file", label: "File", icon: FileUp },
                            { id: "url", label: "By URL", icon: Link2 },
                            { id: "paste", label: "Paste JSON", icon: FileUp },
                        ] as { id: Tab; label: string; icon: typeof FileUp }[]).map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTab(t.id)}
                                    className={active ? "is-active" : ""}
                                >
                                    <Icon size={11} style={{ marginRight: 6, verticalAlign: "-1px" }} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {tab === "file" && (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 12,
                                padding: 28,
                                minHeight: 200,
                                textAlign: "center",
                                border: `2px dashed ${dragging ? "var(--admin-green)" : "var(--admin-border-strong)"}`,
                                borderRadius: "var(--admin-r-lg)",
                                background: dragging ? "var(--admin-green-soft)" : "var(--admin-card)",
                                transition: "border-color 150ms ease, background 150ms ease",
                            }}
                        >
                            <FileUp size={30} style={{ color: "var(--admin-fg-4)" }} />
                            <div>
                                <p
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "var(--admin-fg)",
                                        margin: 0,
                                    }}
                                >
                                    Drop an .xlsx or .json file here
                                </p>
                                <p style={{ fontSize: 11, color: "var(--admin-fg-4)", marginTop: 4 }}>or</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="admin-btn admin-btn-primary"
                            >
                                Choose file
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xlsm,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void handleFile(f);
                                    e.target.value = "";
                                }}
                            />
                        </div>
                    )}

                    {tab === "url" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <label className="admin-form-label">
                                Public URL to .xlsx or .json
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://raw.githubusercontent.com/.../coding-questions.json"
                                    className="admin-field"
                                />
                            </label>
                            <p style={{ fontSize: 11.5, color: "var(--admin-fg-3)", margin: 0 }}>
                                Only CORS-enabled hosts work directly from the browser (GitHub raw, S3
                                buckets with CORS headers). If the URL is blocked, use the File tab instead.
                            </p>
                            <button
                                type="button"
                                onClick={() => void handleUrl()}
                                disabled={!url.trim()}
                                className="admin-btn admin-btn-primary"
                                style={{ alignSelf: "flex-start", opacity: url.trim() ? 1 : 0.5 }}
                            >
                                Fetch and parse
                            </button>
                        </div>
                    )}

                    {tab === "paste" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <label className="admin-form-label">
                                Paste a questions JSON document
                                <textarea
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    rows={10}
                                    spellCheck={false}
                                    placeholder='{"questions": [ ... ]}'
                                    className="admin-field"
                                    style={{
                                        padding: 12,
                                        fontFamily: "var(--admin-font-mono)",
                                        fontSize: 12,
                                        lineHeight: 1.5,
                                        minHeight: 180,
                                        resize: "vertical",
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handlePaste}
                                disabled={!pasteText.trim()}
                                className="admin-btn admin-btn-primary"
                                style={{ alignSelf: "flex-start", opacity: pasteText.trim() ? 1 : 0.5 }}
                            >
                                Parse JSON
                            </button>
                        </div>
                    )}

                    {parseError && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                padding: 12,
                                borderRadius: "var(--admin-r-md)",
                                background: "var(--admin-red-soft, rgba(237, 47, 52, 0.1))",
                                border: "1px solid rgba(237, 47, 52, 0.32)",
                                color: "#ff8a8d",
                                fontSize: 12,
                            }}
                        >
                            <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>{parseError}</span>
                        </div>
                    )}
                </>
            )}

            {phase === "parsing" && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "48px 0",
                        color: "var(--admin-fg-3)",
                        fontSize: 13,
                    }}
                >
                    <Loader2 size={18} className="admin-animate-spin" />
                    Parsing…
                </div>
            )}

            {phase === "preview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                        className="admin-row"
                        style={{ gap: 8, fontSize: 13, color: "var(--admin-fg-2)" }}
                    >
                        <CheckCircle2 size={16} style={{ color: "var(--admin-green)" }} />
                        Parsed <strong style={{ color: "var(--admin-fg)" }}>{parsed.length}</strong>{" "}
                        question{parsed.length === 1 ? "" : "s"}
                        {fileName && (
                            <>
                                {" "}
                                from{" "}
                                <span
                                    className="admin-mono"
                                    style={{ fontSize: 11.5, color: "var(--admin-fg-3)" }}
                                >
                                    {fileName}
                                </span>
                            </>
                        )}
                        .
                    </div>
                    <div
                        className="admin-table-wrap"
                        style={{ maxHeight: 220, overflowY: "auto" }}
                    >
                        <table className="admin-table" style={{ minWidth: 0 }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Title</th>
                                    <th>Difficulty</th>
                                    <th>Max</th>
                                    <th>Tests</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.map((q, i) => (
                                    <tr key={i}>
                                        <td style={{ color: "var(--admin-fg-4)" }}>{i + 1}</td>
                                        <td style={{ color: "var(--admin-fg)", fontWeight: 700 }}>
                                            {q.title}
                                        </td>
                                        <td>{difficultyName(q.difficulty)}</td>
                                        <td>{q.max_score ?? "-"}</td>
                                        <td>{q.test_cases?.length ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="admin-row" style={{ justifyContent: "flex-end", gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => {
                                setParsed([]);
                                setPhase("idle");
                            }}
                            className="admin-btn admin-btn-secondary"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={() => void beginImport()}
                            className="admin-btn admin-btn-primary"
                        >
                            Import {parsed.length} question{parsed.length === 1 ? "" : "s"}
                        </button>
                    </div>
                </div>
            )}

            {(phase === "importing" || phase === "done") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="admin-row" style={{ justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-fg)" }}>
                            {phase === "importing" ? "Importing…" : "Import complete"}
                        </span>
                        <span
                            className="admin-mono"
                            style={{ fontSize: 12, color: "var(--admin-fg-2)" }}
                        >
                            {progress.done} / {progress.total}
                        </span>
                    </div>
                    <div className="admin-progress">
                        <div
                            className="admin-progress-fill"
                            style={{
                                width: `${progress.total === 0 ? 0 : (progress.done / progress.total) * 100}%`,
                            }}
                        />
                    </div>
                    <div className="admin-row" style={{ gap: 14, fontSize: 12 }}>
                        <span style={{ color: "var(--admin-green)" }}>
                            ✓ {successCount} created
                        </span>
                        {failCount > 0 && (
                            <span style={{ color: "#ff7a7e" }}>✗ {failCount} failed</span>
                        )}
                    </div>
                    <div
                        ref={statusListRef}
                        style={{
                            maxHeight: 220,
                            overflowY: "auto",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "var(--admin-r-md)",
                            background: "var(--admin-card)",
                            padding: 8,
                            fontSize: 11.5,
                        }}
                    >
                        {progress.results.map((r) => (
                            <div
                                key={r.row}
                                className="admin-row"
                                style={{ gap: 8, padding: "3px 4px", alignItems: "flex-start" }}
                            >
                                {r.ok ? (
                                    <CheckCircle2
                                        size={12}
                                        style={{ marginTop: 2, color: "var(--admin-green)", flexShrink: 0 }}
                                    />
                                ) : (
                                    <AlertTriangle
                                        size={12}
                                        style={{ marginTop: 2, color: "#ff7a7e", flexShrink: 0 }}
                                    />
                                )}
                                <span style={{ color: "var(--admin-fg-4)" }}>#{r.row}</span>
                                <span style={{ color: "var(--admin-fg)", fontWeight: 700 }}>
                                    {r.title}
                                </span>
                                {!r.ok && (
                                    <span className="admin-mono" style={{ color: "#ff7a7e" }}>
                                        — {r.error}
                                    </span>
                                )}
                            </div>
                        ))}
                        {progress.results.length === 0 && (
                            <div
                                style={{
                                    padding: "8px 4px",
                                    color: "var(--admin-fg-4)",
                                    fontStyle: "italic",
                                }}
                            >
                                Waiting for first row…
                            </div>
                        )}
                    </div>
                    <div className="admin-row" style={{ justifyContent: "flex-end", gap: 8 }}>
                        {phase === "importing" && (
                            <button
                                type="button"
                                onClick={() => {
                                    abortRef.current = true;
                                }}
                                className="admin-btn admin-btn-secondary"
                                style={{
                                    borderColor: "rgba(255, 183, 3, 0.4)",
                                    color: "var(--admin-amber, #ffb703)",
                                }}
                            >
                                Stop after current row
                            </button>
                        )}
                        {phase === "done" && (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="admin-btn admin-btn-primary"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

function difficultyName(n: number | undefined): string {
    if (!n) return "-";
    if (n <= 2) return "Easy";
    if (n <= 4) return "Medium";
    return "Hard";
}

export default BulkImportModal;
