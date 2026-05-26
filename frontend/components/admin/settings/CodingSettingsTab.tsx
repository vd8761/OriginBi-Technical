"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Code2,
    Loader2,
    RotateCw,
    Save,
    Settings as SettingsIcon,
    Sparkles,
    X,
} from "lucide-react";
import {
    Card,
    Modal,
    SegmentedToggle,
    useConfirm,
} from "@/components/admin/ui";
import {
    listAdminCodingLanguages,
    updateAdminCodingLanguageConfig,
    deleteAdminCodingLanguageConfig,
    previewAdminCodingLanguageConfig,
    type AdminCodingLanguageEntry,
    type AdminCodingBankCounts,
    type AdminCodingPreviewResponse,
} from "@/lib/api";

type Mode = "count" | "percent";

interface EditorState {
    slug: string;
    name: string;
    bank: AdminCodingBankCounts;
    mode: Mode;
    total: number;
    easy: number;
    medium: number;
    hard: number;
    allowSpillover: boolean;
    includeTags: string[];
    timeSecondsOverride: number | null;
    saving: boolean;
    error: string | null;
}

const CodingSettingsTab: React.FC = () => {
    const [languages, setLanguages] = useState<AdminCodingLanguageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [previewing, setPreviewing] = useState<{ slug: string; data: AdminCodingPreviewResponse | null; loading: boolean; error: string | null } | null>(null);
    const confirm = useConfirm();

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { languages } = await listAdminCodingLanguages();
            setLanguages(languages);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const openEditor = useCallback((entry: AdminCodingLanguageEntry) => {
        const cfg = entry.config;
        setEditor({
            slug: entry.slug,
            name: entry.name,
            bank: entry.bank,
            mode: cfg?.inputMode ?? "count",
            total: cfg?.totalQuestions ?? Math.min(10, entry.bank.total || 1),
            easy: cfg?.easyCount ?? 0,
            medium: cfg?.mediumCount ?? 0,
            hard: cfg?.hardCount ?? 0,
            allowSpillover: cfg?.allowSpillover ?? true,
            includeTags: cfg?.includeTags ?? [],
            timeSecondsOverride: cfg?.timeSecondsOverride ?? null,
            saving: false,
            error: null,
        });
    }, []);

    const saveEditor = useCallback(async () => {
        if (!editor) return;
        // In percent mode we resolve to integer counts so the constraint
        // (easy+med+hard = total) is preserved. Hard rounds up so the total
        // bucket is hit exactly.
        let { easy, medium, hard } = editor;
        const { total } = editor;
        if (editor.mode === "percent") {
            easy = Math.floor((editor.easy / 100) * total);
            medium = Math.floor((editor.medium / 100) * total);
            hard = total - easy - medium;
            if (hard < 0) {
                setEditor({ ...editor, error: "Percentages exceed 100%." });
                return;
            }
        }
        if (easy + medium + hard !== total) {
            setEditor({ ...editor, error: "Counts must sum to total." });
            return;
        }
        setEditor({ ...editor, saving: true, error: null });
        try {
            await updateAdminCodingLanguageConfig(editor.slug, {
                totalQuestions: total,
                easyCount: easy,
                mediumCount: medium,
                hardCount: hard,
                inputMode: editor.mode,
                allowSpillover: editor.allowSpillover,
                includeTags: editor.includeTags,
                timeSecondsOverride: editor.timeSecondsOverride,
            });
            setEditor(null);
            await reload();
        } catch (err) {
            setEditor((curr) => curr ? { ...curr, saving: false, error: err instanceof Error ? err.message : String(err) } : curr);
        }
    }, [editor, reload]);

    const clearConfig = useCallback(async (slug: string, name: string) => {
        const ok = await confirm({
            title: "Reset to default?",
            message: `${name} will revert to the default policy: every active bank question matching this language is eligible, no quota.`,
            confirmLabel: "Reset",
            variant: "warning",
        });
        if (!ok) return;
        try {
            await deleteAdminCodingLanguageConfig(slug);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [confirm, reload]);

    const openPreview = useCallback(async (slug: string) => {
        setPreviewing({ slug, data: null, loading: true, error: null });
        try {
            const data = await previewAdminCodingLanguageConfig(slug);
            setPreviewing({ slug, data, loading: false, error: null });
        } catch (err) {
            setPreviewing({ slug, data: null, loading: false, error: err instanceof Error ? err.message : String(err) });
        }
    }, []);

    const reroll = useCallback(async () => {
        if (!previewing) return;
        await openPreview(previewing.slug);
    }, [openPreview, previewing]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="admin-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                    <h3 className="admin-card-title" style={{ fontSize: 17 }}>Coding Exam Builder</h3>
                    <p className="admin-card-subtitle" style={{ marginTop: 4 }}>
                        Per-language question counts, difficulty mix, and topic filters. Snapshots into the candidate&apos;s attempt at Start.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void reload()}
                    className="admin-btn admin-btn-secondary"
                >
                    <RotateCw size={13} /> Refresh
                </button>
            </div>

            {error && (
                <div
                    style={{
                        padding: 12,
                        borderRadius: "var(--admin-r-md)",
                        background: "var(--admin-red-soft, rgba(237, 47, 52, 0.1))",
                        border: "1px solid rgba(237, 47, 52, 0.32)",
                        color: "#ff8a8d",
                        fontSize: 12.5,
                    }}
                >
                    {error}
                </div>
            )}

            {loading ? (
                <div className="admin-row" style={{ justifyContent: "center", padding: 48, color: "var(--admin-fg-3)" }}>
                    <Loader2 size={18} className="admin-animate-spin" /> Loading languages…
                </div>
            ) : languages.length === 0 ? (
                <Card>
                    <p style={{ padding: 24, textAlign: "center", color: "var(--admin-fg-3)", fontSize: 13 }}>
                        No language plugins installed yet. Add languages under <strong>System → Languages</strong> first.
                    </p>
                </Card>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: 14,
                    }}
                >
                    {languages.map((l) => (
                        <LanguageCard
                            key={l.slug}
                            entry={l}
                            onEdit={() => openEditor(l)}
                            onPreview={() => void openPreview(l.slug)}
                            onClear={() => void clearConfig(l.slug, l.name)}
                        />
                    ))}
                </div>
            )}

            {editor && (
                <EditorModal
                    editor={editor}
                    setEditor={setEditor}
                    onSave={() => void saveEditor()}
                    onClose={() => setEditor(null)}
                />
            )}

            {previewing && (
                <PreviewModal
                    state={previewing}
                    onReroll={() => void reroll()}
                    onClose={() => setPreviewing(null)}
                />
            )}
        </div>
    );
};

// ─── Per-language card ─────────────────────────────────────────────────────

function LanguageCard({
    entry,
    onEdit,
    onPreview,
    onClear,
}: {
    entry: AdminCodingLanguageEntry;
    onEdit: () => void;
    onPreview: () => void;
    onClear: () => void;
}) {
    const cfg = entry.config;
    const bank = entry.bank;
    const hasConfig = Boolean(cfg);

    // Bank-health: compare configured counts against bank-available counts.
    const healthFor = (have: number, want: number): "good" | "warn" | "bad" => {
        if (!hasConfig || want === 0) return "good";
        if (have >= want) return "good";
        if (have >= Math.ceil(want * 0.75)) return "warn";
        return "bad";
    };
    const colors: Record<string, string> = {
        good: "var(--admin-green)",
        warn: "var(--admin-amber, #ffb703)",
        bad: "#ff6a6e",
    };

    return (
        <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 4 }}>
                <div className="admin-row" style={{ justifyContent: "space-between", gap: 10 }}>
                    <div className="admin-row" style={{ gap: 10 }}>
                        <div
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: "var(--admin-r-md)",
                                background: "rgba(255, 183, 3, 0.12)",
                                color: "var(--admin-amber, #ffb703)",
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            <Code2 size={18} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--admin-fg)" }}>{entry.name}</h4>
                            <p
                                className="admin-mono"
                                style={{ margin: 0, fontSize: 10.5, color: "var(--admin-fg-4)" }}
                            >
                                {entry.slug}
                            </p>
                        </div>
                    </div>
                    <span
                        style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: hasConfig ? "var(--admin-green-soft)" : "rgba(255, 183, 3, 0.12)",
                            color: hasConfig ? "var(--admin-green)" : "var(--admin-amber, #ffb703)",
                        }}
                    >
                        {hasConfig ? "Configured" : "Default policy"}
                    </span>
                </div>

                {hasConfig ? (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 8,
                            padding: 10,
                            borderRadius: "var(--admin-r-md)",
                            background: "var(--admin-card-2)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <BucketCell label="Total" want={cfg?.totalQuestions} have={bank.total} tone={healthFor(bank.total, cfg?.totalQuestions ?? 0)} colors={colors} />
                        <BucketCell label="Easy"  want={cfg?.easyCount}    have={bank.easy}   tone={healthFor(bank.easy, cfg?.easyCount ?? 0)} colors={colors} />
                        <BucketCell label="Medium" want={cfg?.mediumCount} have={bank.medium} tone={healthFor(bank.medium, cfg?.mediumCount ?? 0)} colors={colors} />
                        <BucketCell label="Hard"  want={cfg?.hardCount}    have={bank.hard}   tone={healthFor(bank.hard, cfg?.hardCount ?? 0)} colors={colors} />
                    </div>
                ) : (
                    <div
                        style={{
                            padding: 12,
                            borderRadius: "var(--admin-r-md)",
                            background: "var(--admin-card-2)",
                            border: "1px solid var(--admin-border)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: "var(--admin-fg-2)",
                        }}
                    >
                        <p style={{ margin: 0, fontWeight: 700 }}>
                            No quota set — every candidate gets every eligible question.
                        </p>
                        <p
                            className="admin-mono"
                            style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--admin-fg-3)" }}
                        >
                            Bank: {bank.total} total · {bank.easy} easy · {bank.medium} medium · {bank.hard} hard
                        </p>
                    </div>
                )}

                {cfg && cfg.includeTags.length > 0 && (
                    <div className="admin-row" style={{ flexWrap: "wrap", gap: 6 }}>
                        {cfg.includeTags.map((t) => (
                            <span
                                key={t}
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    background: "var(--admin-card)",
                                    border: "1px solid var(--admin-border-strong)",
                                    color: "var(--admin-fg-2)",
                                }}
                            >
                                #{t}
                            </span>
                        ))}
                    </div>
                )}

                <div className="admin-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                    {hasConfig && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="admin-btn admin-btn-ghost"
                            title="Reset to default policy"
                        >
                            <X size={13} /> Reset
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onPreview}
                        className="admin-btn admin-btn-secondary"
                        disabled={bank.total === 0}
                        title={bank.total === 0 ? "Bank has no eligible questions yet" : "Preview a sample selection"}
                    >
                        <Sparkles size={13} /> Preview
                    </button>
                    <button type="button" onClick={onEdit} className="admin-btn admin-btn-primary">
                        <SettingsIcon size={13} /> {hasConfig ? "Edit" : "Configure"}
                    </button>
                </div>
            </div>
        </Card>
    );
}

function BucketCell({
    label,
    want,
    have,
    tone,
    colors,
}: {
    label: string;
    want: number | undefined;
    have: number;
    tone: "good" | "warn" | "bad";
    colors: Record<string, string>;
}) {
    return (
        <div style={{ textAlign: "center" }}>
            <p
                style={{
                    margin: 0,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--admin-fg-4)",
                }}
            >
                {label}
            </p>
            <p
                style={{
                    margin: "4px 0 2px",
                    fontSize: 18,
                    fontWeight: 800,
                    color: want === undefined ? "var(--admin-fg-3)" : colors[tone],
                    lineHeight: 1,
                }}
            >
                {want ?? "—"}
            </p>
            <p
                className="admin-mono"
                style={{ margin: 0, fontSize: 10, color: "var(--admin-fg-4)" }}
            >
                bank {have}
            </p>
        </div>
    );
}

// ─── Editor modal ──────────────────────────────────────────────────────────

function EditorModal({
    editor,
    setEditor,
    onSave,
    onClose,
}: {
    editor: EditorState;
    setEditor: (e: EditorState | null) => void;
    onSave: () => void;
    onClose: () => void;
}) {
    const sum = editor.easy + editor.medium + editor.hard;
    const sumMatches = editor.mode === "percent" ? sum === 100 : sum === editor.total;

    const [tagDraft, setTagDraft] = useState("");
    const addTag = () => {
        const t = tagDraft.trim().toLowerCase();
        if (!t) return;
        if (editor.includeTags.includes(t)) return;
        setEditor({ ...editor, includeTags: [...editor.includeTags, t] });
        setTagDraft("");
    };
    const removeTag = (t: string) =>
        setEditor({ ...editor, includeTags: editor.includeTags.filter((x) => x !== t) });

    return (
        <Modal
            open
            onClose={onClose}
            eyebrow={`Coding · ${editor.name}`}
            title="Exam builder configuration"
            wide
        >
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--admin-fg-2)" }}>
                Saved settings apply to the next candidate who starts the exam. In-progress attempts keep their snapshot.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Field label="Mode">
                    <SegmentedToggle
                        value={editor.mode}
                        onChange={(v) => setEditor({ ...editor, mode: v as Mode })}
                        options={[
                            { value: "count", label: "Count" },
                            { value: "percent", label: "Percent" },
                        ]}
                    />
                </Field>
                <Field label="Total questions">
                    <NumberInput
                        value={editor.total}
                        min={1}
                        onChange={(v) => setEditor({ ...editor, total: v })}
                    />
                </Field>

                <Field label={editor.mode === "percent" ? "Easy (%)" : "Easy (count)"}>
                    <NumberInput
                        value={editor.easy}
                        min={0}
                        onChange={(v) => setEditor({ ...editor, easy: v })}
                    />
                </Field>
                <Field label={editor.mode === "percent" ? "Medium (%)" : "Medium (count)"}>
                    <NumberInput
                        value={editor.medium}
                        min={0}
                        onChange={(v) => setEditor({ ...editor, medium: v })}
                    />
                </Field>
                <Field label={editor.mode === "percent" ? "Hard (%)" : "Hard (count)"}>
                    <NumberInput
                        value={editor.hard}
                        min={0}
                        onChange={(v) => setEditor({ ...editor, hard: v })}
                    />
                </Field>
                <Field label="Time override (seconds, optional)">
                    <NumberInput
                        value={editor.timeSecondsOverride ?? 0}
                        min={0}
                        placeholder="0 = inherit from exam"
                        onChange={(v) => setEditor({ ...editor, timeSecondsOverride: v > 0 ? v : null })}
                    />
                </Field>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: "var(--admin-r-md)",
                    border: `1px solid ${sumMatches ? "rgba(30, 211, 106, 0.32)" : "rgba(237, 47, 52, 0.32)"}`,
                    background: sumMatches ? "var(--admin-green-soft)" : "var(--admin-red-soft, rgba(237, 47, 52, 0.08))",
                    color: sumMatches ? "var(--admin-green)" : "#ff8a8d",
                    fontSize: 13.5,
                    fontWeight: 600,
                }}
            >
                {sumMatches ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {editor.mode === "percent"
                    ? `Easy + Medium + Hard = ${sum}% (need 100%)`
                    : `Easy + Medium + Hard = ${sum} (need ${editor.total})`}
            </div>

            <Field label="Tag filter (only pick questions with at least one of these tags)">
                <div className="admin-row" style={{ flexWrap: "wrap", gap: 8 }}>
                    {editor.includeTags.map((t) => (
                        <span
                            key={t}
                            className="admin-row"
                            style={{
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                padding: "6px 12px",
                                borderRadius: 999,
                                background: "var(--admin-card)",
                                border: "1px solid var(--admin-border-strong)",
                                color: "var(--admin-fg-2)",
                            }}
                        >
                            #{t}
                            <button
                                type="button"
                                onClick={() => removeTag(t)}
                                style={{
                                    background: "transparent",
                                    border: 0,
                                    color: "var(--admin-fg-4)",
                                    cursor: "pointer",
                                    padding: 0,
                                    display: "inline-flex",
                                }}
                                aria-label={`Remove ${t}`}
                            >
                                <X size={13} />
                            </button>
                        </span>
                    ))}
                    <input
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                            }
                        }}
                        placeholder="Type a tag, press Enter"
                        className="admin-field"
                        style={{ flex: 1, minWidth: 200, fontSize: 14, minHeight: 42 }}
                    />
                </div>
            </Field>

            <label
                className="admin-row"
                style={{ gap: 10, fontSize: 14, color: "var(--admin-fg-2)", cursor: "pointer", lineHeight: 1.5 }}
            >
                <input
                    type="checkbox"
                    checked={editor.allowSpillover}
                    onChange={(e) => setEditor({ ...editor, allowSpillover: e.target.checked })}
                    style={{ accentColor: "var(--admin-green)", width: 16, height: 16 }}
                />
                Allow spillover from adjacent difficulty buckets when a bucket is short
            </label>

            {editor.error && (
                <div
                    style={{
                        padding: 12,
                        borderRadius: "var(--admin-r-md)",
                        background: "var(--admin-red-soft, rgba(237, 47, 52, 0.08))",
                        border: "1px solid rgba(237, 47, 52, 0.32)",
                        color: "#ff8a8d",
                        fontSize: 13.5,
                        lineHeight: 1.5,
                    }}
                >
                    {editor.error}
                </div>
            )}

            <div className="admin-row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={onClose} className="admin-btn admin-btn-secondary">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={editor.saving || !sumMatches}
                    className="admin-btn admin-btn-primary"
                    style={{ opacity: editor.saving || !sumMatches ? 0.55 : 1 }}
                >
                    {editor.saving ? <Loader2 size={13} className="admin-animate-spin" /> : <Save size={13} />}
                    Save
                </button>
            </div>
        </Modal>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    // Override the cramped admin-form-label defaults (10px uppercase) with a
    // readable in-modal style: regular case, 13px, normal letter-spacing.
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--admin-fg-2)",
                    letterSpacing: 0,
                    textTransform: "none",
                }}
            >
                {label}
            </span>
            {children}
        </label>
    );
}

function NumberInput({
    value,
    min,
    placeholder,
    onChange,
}: {
    value: number;
    min?: number;
    placeholder?: string;
    onChange: (v: number) => void;
}) {
    return (
        <input
            type="number"
            value={Number.isFinite(value) ? value : ""}
            min={min}
            placeholder={placeholder}
            onChange={(e) => {
                const n = Number(e.target.value);
                onChange(Number.isFinite(n) ? n : 0);
            }}
            className="admin-field"
            style={{ fontSize: 14, minHeight: 42 }}
        />
    );
}

// ─── Preview modal ─────────────────────────────────────────────────────────

function PreviewModal({
    state,
    onReroll,
    onClose,
}: {
    state: { slug: string; data: AdminCodingPreviewResponse | null; loading: boolean; error: string | null };
    onReroll: () => void;
    onClose: () => void;
}) {
    return (
        <Modal
            open
            onClose={onClose}
            eyebrow={`Preview · ${state.slug.replace(/^language\./, "")}`}
            title="Sample candidate selection"
            wide
        >
            <p className="admin-card-subtitle" style={{ margin: 0, fontSize: 12.5 }}>
                Dry-run of the builder using the current config. Re-roll to see a different random pick. No DB writes.
            </p>

            {state.loading && (
                <div className="admin-row" style={{ justifyContent: "center", padding: 40, color: "var(--admin-fg-3)", gap: 10 }}>
                    <Loader2 size={18} className="admin-animate-spin" /> Building preview…
                </div>
            )}
            {state.error && (
                <div
                    style={{
                        padding: 12,
                        borderRadius: "var(--admin-r-md)",
                        background: "var(--admin-red-soft, rgba(237, 47, 52, 0.08))",
                        border: "1px solid rgba(237, 47, 52, 0.32)",
                        color: "#ff8a8d",
                        fontSize: 12,
                    }}
                >
                    {state.error}
                </div>
            )}
            {state.data && (
                <>
                    <div
                        className="admin-row"
                        style={{ gap: 14, fontSize: 12, color: "var(--admin-fg-2)" }}
                    >
                        <span><strong>{state.data.picked.length}</strong> questions</span>
                        <span>Easy: <strong>{state.data.spillover.delivered.easy}</strong> / {state.data.spillover.targets.easy || "any"}</span>
                        <span>Medium: <strong>{state.data.spillover.delivered.medium}</strong> / {state.data.spillover.targets.medium || "any"}</span>
                        <span>Hard: <strong>{state.data.spillover.delivered.hard}</strong> / {state.data.spillover.targets.hard || "any"}</span>
                    </div>
                    {state.data.spillover.borrows && Object.keys(state.data.spillover.borrows).length > 0 && (
                        <div
                            style={{
                                padding: 10,
                                borderRadius: "var(--admin-r-md)",
                                background: "rgba(255, 183, 3, 0.12)",
                                border: "1px solid rgba(255, 183, 3, 0.32)",
                                color: "var(--admin-amber, #ffb703)",
                                fontSize: 12,
                            }}
                        >
                            <strong>Spillover:</strong>{" "}
                            {Object.entries(state.data.spillover.borrows).map(([k, v]) => (
                                <span key={k} style={{ marginRight: 10 }}>{k}: {v}</span>
                            ))}
                        </div>
                    )}
                    <div className="admin-table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
                        <table className="admin-table" style={{ minWidth: 0 }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Title</th>
                                    <th>Bucket</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.data.picked.map((q, i) => (
                                    <tr key={q.questionVersionId}>
                                        <td style={{ color: "var(--admin-fg-4)" }}>{i + 1}</td>
                                        <td style={{ color: "var(--admin-fg)", fontWeight: 700 }}>{q.title}</td>
                                        <td>{q.bucket}</td>
                                        <td>{q.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <div className="admin-row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button
                    type="button"
                    onClick={onReroll}
                    disabled={state.loading}
                    className="admin-btn admin-btn-secondary"
                >
                    <RotateCw size={13} /> Re-roll
                </button>
                <button type="button" onClick={onClose} className="admin-btn admin-btn-primary">
                    Close
                </button>
            </div>
        </Modal>
    );
}

export default CodingSettingsTab;
