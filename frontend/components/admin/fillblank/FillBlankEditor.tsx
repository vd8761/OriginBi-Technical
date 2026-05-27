"use client";

// FillBlankEditor — dedicated authoring panel for assessment.fillblank
// questions. Mirrors plugins/assessment-fillblank/schemas/question-body.schema.json.
//
// The prompt embeds {{<id>}} placeholders that map to the `blanks` array by id;
// the editor surfaces a live "placeholders detected" indicator so the author
// can keep prompt and blanks in sync without round-tripping through the
// backend validator.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/admin/ui";
import CustomSelect from "@/components/ui/CustomSelect";
import TagChips from "@/components/admin/coding/TagChips";
import FormatAwareEditor, {
    type FormattedText,
} from "@/components/admin/coding/FormatAwareEditor";
import {
    createAdminQuestion,
    getAdminQuestion,
    listPlugins,
    updateAdminQuestion,
    type Plugin,
} from "@/lib/api";

type MatchMode = "exact" | "ci" | "trim" | "regex";

interface Blank {
    id: string;
    answers: string[];
    matchMode?: MatchMode;
    hint?: string;
    placeholder?: string;
}

interface FillBlankBody {
    type: "fillblank";
    title: string;
    section?: string;
    category?: string;
    difficulty?: "easy" | "medium" | "hard";
    promptFormat?: "markdown" | "html" | "plain";
    prompt: string;
    language: string;
    blanks: Blank[];
    tags?: string[];
    mode?: "trial" | "main";
    explanation?: string;
}

interface FormState {
    title: string;
    difficulty: number;
    maxScore: number;
    isNegativeMarked: boolean;
    negativeScore: number;
    body: FillBlankBody;
}

// Marking convention: easy=1, medium=3, hard=5.
const DEFAULT_MAX_SCORE_BY_DIFFICULTY: Record<number, number> = {
    1: 1,
    3: 3,
    5: 5,
};

const EMPTY: FormState = {
    title: "",
    difficulty: 1,
    maxScore: 1,
    isNegativeMarked: false,
    negativeScore: 0,
    body: {
        type: "fillblank",
        title: "",
        difficulty: "easy",
        promptFormat: "markdown",
        prompt: "",
        language: "",
        blanks: [{ id: "1", answers: [""], matchMode: "ci" }],
        tags: [],
        mode: "main",
    },
};

function difficultyFromInt(n: number): "easy" | "medium" | "hard" {
    if (n >= 5) return "hard";
    if (n >= 3) return "medium";
    return "easy";
}

// Pull {{id}} placeholder names out of a prompt string. De-dupes and preserves
// first-seen order so the live indicator matches the author's mental model.
const PLACEHOLDER_RE = /\{\{\s*([^}\s]+)\s*\}\}/g;
function extractPlaceholders(prompt: string): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const m of prompt.matchAll(PLACEHOLDER_RE)) {
        const id = m[1];
        if (!seen.has(id)) {
            seen.add(id);
            out.push(id);
        }
    }
    return out;
}

interface FillBlankEditorProps {
    mode: "new" | "edit";
    questionId?: string;
}

export default function FillBlankEditor({ mode, questionId }: FillBlankEditorProps) {
    const router = useRouter();
    const [state, setState] = useState<FormState>(EMPTY);
    const [languages, setLanguages] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        listPlugins({ category: "language" })
            .then(({ plugins }) => setLanguages(plugins))
            .catch(() => setLanguages([]));
    }, []);

    useEffect(() => {
        if (mode !== "edit" || !questionId) return;
        setLoading(true);
        getAdminQuestion(questionId)
            .then((q) => {
                const body = (q.body ?? {}) as Partial<FillBlankBody>;
                setState({
                    title: q.title,
                    difficulty: q.difficulty,
                    maxScore: q.maxScore,
                    isNegativeMarked: q.isNegativeMarked,
                    negativeScore: q.negativeScore,
                    body: {
                        type: "fillblank",
                        title: body.title ?? q.title,
                        section: body.section,
                        category: body.category,
                        difficulty: body.difficulty ?? difficultyFromInt(q.difficulty),
                        promptFormat: body.promptFormat ?? "markdown",
                        prompt: body.prompt ?? "",
                        language: body.language ?? "",
                        blanks: Array.isArray(body.blanks) && body.blanks.length > 0
                            ? body.blanks
                            : EMPTY.body.blanks,
                        tags: body.tags ?? [],
                        mode: body.mode ?? "main",
                        explanation: body.explanation,
                    },
                });
                setError("");
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load question."))
            .finally(() => setLoading(false));
    }, [mode, questionId]);

    const setBody = useCallback(<K extends keyof FillBlankBody>(key: K, value: FillBlankBody[K]) => {
        setState((s) => ({ ...s, body: { ...s.body, [key]: value } }));
    }, []);

    const onDifficultyChange = (next: number) => {
        setState((s) => ({
            ...s,
            difficulty: next,
            maxScore: DEFAULT_MAX_SCORE_BY_DIFFICULTY[s.difficulty] === s.maxScore
                ? DEFAULT_MAX_SCORE_BY_DIFFICULTY[next]
                : s.maxScore,
            body: { ...s.body, difficulty: difficultyFromInt(next) },
        }));
    };

    const updateBlank = (idx: number, patch: Partial<Blank>) => {
        setBody(
            "blanks",
            state.body.blanks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        );
    };

    const addBlank = () => {
        // Auto-assign the next numeric id if the existing ids are all numeric;
        // otherwise fall back to "b-N".
        const usedIds = new Set(state.body.blanks.map((b) => b.id));
        const allNumeric = state.body.blanks.every((b) => /^\d+$/.test(b.id));
        let nextId: string;
        if (allNumeric) {
            const max = state.body.blanks.reduce((m, b) => Math.max(m, parseInt(b.id, 10)), 0);
            nextId = String(max + 1);
        } else {
            let i = state.body.blanks.length + 1;
            while (usedIds.has(`b-${i}`)) i++;
            nextId = `b-${i}`;
        }
        setBody("blanks", [...state.body.blanks, { id: nextId, answers: [""], matchMode: "ci" }]);
    };

    const removeBlank = (idx: number) => {
        setBody("blanks", state.body.blanks.filter((_, i) => i !== idx));
    };

    const updateAnswer = (blankIdx: number, ansIdx: number, value: string) => {
        const blank = state.body.blanks[blankIdx];
        updateBlank(blankIdx, {
            answers: blank.answers.map((a, i) => (i === ansIdx ? value : a)),
        });
    };

    const addAnswer = (blankIdx: number) => {
        const blank = state.body.blanks[blankIdx];
        updateBlank(blankIdx, { answers: [...blank.answers, ""] });
    };

    const removeAnswer = (blankIdx: number, ansIdx: number) => {
        const blank = state.body.blanks[blankIdx];
        updateBlank(blankIdx, {
            answers: blank.answers.filter((_, i) => i !== ansIdx),
        });
    };

    const placeholdersInPrompt = useMemo(
        () => extractPlaceholders(state.body.prompt),
        [state.body.prompt],
    );
    const declaredIds = useMemo(
        () => new Set(state.body.blanks.map((b) => b.id)),
        [state.body.blanks],
    );

    const undeclaredPlaceholders = placeholdersInPrompt.filter((id) => !declaredIds.has(id));
    const unusedBlanks = state.body.blanks
        .filter((b) => !placeholdersInPrompt.includes(b.id))
        .map((b) => b.id);

    const validate = (): string | null => {
        if (!state.title.trim()) return "Title is required.";
        if (!state.body.language) return "Language is required.";
        if (!state.body.prompt.trim()) return "Prompt is required.";
        if (state.body.blanks.length === 0) return "At least one blank is required.";
        const ids = state.body.blanks.map((b) => b.id.trim());
        if (ids.some((id) => !id)) return "Every blank needs an id.";
        if (new Set(ids).size !== ids.length) return "Blank ids must be unique.";
        for (const b of state.body.blanks) {
            const answers = b.answers.filter((a) => a.trim());
            if (answers.length === 0) return `Blank "${b.id}" needs at least one accepted answer.`;
            if (b.matchMode === "regex") {
                for (const a of answers) {
                    try {
                        // eslint-disable-next-line no-new
                        new RegExp(a);
                    } catch {
                        return `Blank "${b.id}" has invalid regex: ${a}`;
                    }
                }
            }
        }
        if (state.maxScore <= 0) return "Max score must be positive.";
        return null;
    };

    const save = async () => {
        const msg = validate();
        if (msg) {
            setError(msg);
            return;
        }
        setSaving(true);
        setError("");
        try {
            // Strip empty trailing answer slots before sending — they validate
            // server-side too but the UX is cleaner if we trim here.
            const cleanedBlanks = state.body.blanks.map((b) => ({
                ...b,
                answers: b.answers.map((a) => a).filter((a) => a.trim() !== ""),
            }));
            const payload = {
                title: state.title,
                plugin_slug: "assessment.fillblank",
                body: {
                    ...state.body,
                    title: state.title,
                    blanks: cleanedBlanks,
                } as unknown as Record<string, unknown>,
                max_score: state.maxScore,
                is_negative_marked: state.isNegativeMarked,
                negative_score: state.negativeScore,
                difficulty: state.difficulty,
            };
            if (mode === "new") {
                const created = await createAdminQuestion(payload);
                router.push(`/admin/fillblank/${created.id}`);
                return;
            }
            await updateAdminQuestion(questionId!, payload);
            setSavedAt(new Date().toLocaleTimeString());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    const languageOptions = useMemo(
        () => [
            { value: "", label: "Select a language…" },
            ...languages.map((l) => ({ value: l.slug, label: l.name })),
        ],
        [languages],
    );

    const promptFormatted: FormattedText = useMemo(
        () => ({ kind: state.body.promptFormat ?? "markdown", content: state.body.prompt }),
        [state.body.promptFormat, state.body.prompt],
    );

    if (loading) {
        return (
            <div className="admin-row" style={{ justifyContent: "center", padding: 48, color: "var(--admin-fg-3)" }}>
                <Loader2 size={18} className="admin-animate-spin" /> Loading question…
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Metadata strip */}
            <Card>
                <div className="admin-filter-bar" style={{ alignItems: "flex-end" }}>
                    <div className="admin-filter-field" data-w="grow">
                        <span className="admin-filter-label">Title</span>
                        <input
                            className="admin-field"
                            value={state.title}
                            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                            placeholder="e.g. JavaScript const vs let"
                        />
                    </div>
                    <div className="admin-filter-field" data-w="md">
                        <span className="admin-filter-label">Language</span>
                        <CustomSelect
                            value={state.body.language}
                            onChange={(v) => setBody("language", v)}
                            options={languageOptions}
                        />
                    </div>
                    <div className="admin-filter-field" data-w="sm">
                        <span className="admin-filter-label">Difficulty</span>
                        <CustomSelect
                            value={String(state.difficulty)}
                            onChange={(v) => onDifficultyChange(Number(v))}
                            options={[
                                { value: "1", label: "Easy" },
                                { value: "3", label: "Medium" },
                                { value: "5", label: "Hard" },
                            ]}
                        />
                    </div>
                    <div className="admin-filter-field" data-w="sm">
                        <span className="admin-filter-label">Max score</span>
                        <input
                            type="number"
                            min={1}
                            className="admin-field"
                            value={state.maxScore}
                            onChange={(e) => setState((s) => ({ ...s, maxScore: Number(e.target.value) || 0 }))}
                        />
                    </div>
                    <div className="admin-filter-field" data-w="sm">
                        <span className="admin-filter-label">Pool</span>
                        <CustomSelect
                            value={state.body.mode ?? "main"}
                            onChange={(v) => setBody("mode", v as "trial" | "main")}
                            options={[
                                { value: "main", label: "Main" },
                                { value: "trial", label: "Trial" },
                            ]}
                        />
                    </div>
                </div>
                <div className="admin-filter-bar" style={{ marginTop: 12 }}>
                    <div className="admin-filter-field" data-w="md">
                        <span className="admin-filter-label">Section</span>
                        <input
                            className="admin-field"
                            value={state.body.section ?? ""}
                            onChange={(e) => setBody("section", e.target.value || undefined)}
                            placeholder="e.g. JavaScript"
                        />
                    </div>
                    <div className="admin-filter-field" data-w="md">
                        <span className="admin-filter-label">Category</span>
                        <input
                            className="admin-field"
                            value={state.body.category ?? ""}
                            onChange={(e) => setBody("category", e.target.value || undefined)}
                            placeholder="e.g. Bindings"
                        />
                    </div>
                    <div className="admin-filter-field" data-w="grow">
                        <span className="admin-filter-label">Tags</span>
                        <TagChips
                            value={state.body.tags ?? []}
                            onChange={(tags) => setBody("tags", tags)}
                            suggestions={[]}
                        />
                    </div>
                </div>
            </Card>

            {/* Prompt */}
            <Card>
                <h3 className="admin-card-title" style={{ fontSize: 14, marginBottom: 8 }}>
                    Prompt
                </h3>
                <p className="admin-card-subtitle" style={{ fontSize: 12, margin: "0 0 12px" }}>
                    Reference each blank with <code className="admin-mono">{`{{<id>}}`}</code> — for example,{" "}
                    <code className="admin-mono">{`Use {{1}} for constants.`}</code>
                </p>
                <FormatAwareEditor
                    label="Prompt"
                    value={promptFormatted}
                    onChange={(next) => {
                        setBody("promptFormat", next.kind);
                        setBody("prompt", next.content);
                    }}
                    height={200}
                    monacoPathKey="fillblank.prompt"
                />

                {/* Placeholder ↔ blank reconciliation indicator. Non-blocking;
                    the backend validator will reject undeclared placeholders so
                    we only nudge, not enforce, here. */}
                <div
                    className="admin-row"
                    style={{
                        marginTop: 10,
                        gap: 10,
                        flexWrap: "wrap",
                        fontSize: 11.5,
                        color: "var(--admin-fg-2)",
                    }}
                >
                    {placeholdersInPrompt.length === 0 ? (
                        <span style={{ color: "var(--admin-fg-4)" }}>
                            No placeholders detected yet.
                        </span>
                    ) : (
                        <>
                            <CheckCircle2 size={13} style={{ color: "var(--admin-green)" }} />
                            <span>
                                Detected placeholders:{" "}
                                {placeholdersInPrompt.map((p) => (
                                    <code
                                        key={p}
                                        className="admin-mono"
                                        style={{ marginRight: 6, color: "var(--admin-fg)" }}
                                    >
                                        {`{{${p}}}`}
                                    </code>
                                ))}
                            </span>
                        </>
                    )}
                    {undeclaredPlaceholders.length > 0 && (
                        <span style={{ color: "#ff9b6e" }}>
                            <AlertTriangle size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                            Undeclared in blanks: {undeclaredPlaceholders.join(", ")}
                        </span>
                    )}
                    {unusedBlanks.length > 0 && (
                        <span style={{ color: "var(--admin-amber, #ffb703)" }}>
                            <AlertTriangle size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                            Blanks not referenced in prompt: {unusedBlanks.join(", ")}
                        </span>
                    )}
                </div>
            </Card>

            {/* Blanks */}
            <Card>
                <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                        <h3 className="admin-card-title" style={{ fontSize: 14, margin: 0 }}>
                            Blanks &amp; accepted answers
                        </h3>
                        <p className="admin-card-subtitle" style={{ fontSize: 12, margin: "4px 0 0" }}>
                            Each blank lists one or more accepted answers. Match mode controls how candidate input is compared.
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {state.body.blanks.map((blank, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: 12,
                                border: "1px solid var(--admin-border)",
                                borderRadius: "var(--admin-r-md)",
                                background: "var(--admin-card-2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                            }}
                        >
                            <div className="admin-filter-bar" style={{ alignItems: "flex-end" }}>
                                <div className="admin-filter-field" data-w="sm">
                                    <span className="admin-filter-label">Blank id</span>
                                    <input
                                        className="admin-field"
                                        value={blank.id}
                                        onChange={(e) => updateBlank(idx, { id: e.target.value })}
                                        style={{ fontFamily: "var(--admin-font-mono)" }}
                                    />
                                </div>
                                <div className="admin-filter-field" data-w="sm">
                                    <span className="admin-filter-label">Match mode</span>
                                    <CustomSelect
                                        value={blank.matchMode ?? "ci"}
                                        onChange={(v) => updateBlank(idx, { matchMode: v as MatchMode })}
                                        options={[
                                            { value: "ci", label: "Case-insensitive" },
                                            { value: "exact", label: "Exact" },
                                            { value: "trim", label: "Trim + CI" },
                                            { value: "regex", label: "Regex" },
                                        ]}
                                    />
                                </div>
                                <div className="admin-filter-field" data-w="md">
                                    <span className="admin-filter-label">Placeholder text</span>
                                    <input
                                        className="admin-field"
                                        value={blank.placeholder ?? ""}
                                        onChange={(e) => updateBlank(idx, { placeholder: e.target.value || undefined })}
                                        placeholder="Shown inside the input box"
                                    />
                                </div>
                                <div className="admin-filter-field" data-w="grow">
                                    <span className="admin-filter-label">Hint (optional)</span>
                                    <input
                                        className="admin-field"
                                        value={blank.hint ?? ""}
                                        onChange={(e) => updateBlank(idx, { hint: e.target.value || undefined })}
                                        placeholder="One-line hint shown on hover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn-ghost"
                                    onClick={() => removeBlank(idx)}
                                    disabled={state.body.blanks.length <= 1}
                                    title={
                                        state.body.blanks.length <= 1
                                            ? "Fill-in needs at least one blank"
                                            : "Remove blank"
                                    }
                                    aria-label="Remove blank"
                                    style={{
                                        color: "var(--admin-red, #ed2f34)",
                                        alignSelf: "flex-end",
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div>
                                <span
                                    className="admin-filter-label"
                                    style={{ display: "block", marginBottom: 6 }}
                                >
                                    Accepted answers
                                </span>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {blank.answers.map((ans, ansIdx) => (
                                        <div
                                            key={ansIdx}
                                            className="admin-row"
                                            style={{ gap: 8, alignItems: "center" }}
                                        >
                                            <input
                                                className="admin-field"
                                                value={ans}
                                                onChange={(e) => updateAnswer(idx, ansIdx, e.target.value)}
                                                placeholder={
                                                    blank.matchMode === "regex"
                                                        ? "Regex pattern, e.g. ^const$"
                                                        : "Accepted answer"
                                                }
                                                style={{
                                                    flex: 1,
                                                    fontFamily:
                                                        blank.matchMode === "regex"
                                                            ? "var(--admin-font-mono)"
                                                            : undefined,
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn-ghost"
                                                onClick={() => removeAnswer(idx, ansIdx)}
                                                disabled={blank.answers.length <= 1}
                                                title={
                                                    blank.answers.length <= 1
                                                        ? "At least one answer required"
                                                        : "Remove answer"
                                                }
                                                aria-label="Remove answer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn-secondary"
                                    onClick={() => addAnswer(idx)}
                                    style={{ marginTop: 8 }}
                                >
                                    <Plus size={13} /> Add accepted answer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="admin-row" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={addBlank}>
                        <Plus size={14} /> Add blank
                    </button>
                </div>
            </Card>

            {/* Explanation */}
            <Card>
                <h3 className="admin-card-title" style={{ fontSize: 14, marginBottom: 12 }}>
                    Explanation (optional)
                </h3>
                <textarea
                    className="admin-field"
                    rows={4}
                    style={{ padding: 12, minHeight: 96, fontSize: 13, lineHeight: 1.5 }}
                    value={state.body.explanation ?? ""}
                    onChange={(e) => setBody("explanation", e.target.value || undefined)}
                    placeholder="Shown after-submit when review is enabled."
                />
            </Card>

            {/* Save bar */}
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
            <div className="admin-row" style={{ justifyContent: "flex-end", gap: 8 }}>
                {savedAt && (
                    <span style={{ fontSize: 12, color: "var(--admin-fg-3)" }}>Saved at {savedAt}</span>
                )}
                <button
                    type="button"
                    onClick={() => router.push("/admin/coding")}
                    className="admin-btn admin-btn-secondary"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="admin-btn admin-btn-primary"
                >
                    {saving ? <Loader2 size={14} className="admin-animate-spin" /> : <Save size={14} />}
                    {mode === "new" ? "Create" : "Save changes"}
                </button>
            </div>
        </div>
    );
}
