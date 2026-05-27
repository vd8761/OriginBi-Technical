"use client";

// McqEditor — dedicated authoring panel for assessment.mcq questions.
// Mirrors the JSON Schema in plugins/assessment-mcq/schemas/question-body.schema.json.
//
// This is intentionally NOT the coding editor: MCQs have a single language,
// a fixed set of option chips, and a correct-answer key, so the form is
// flat (no tabs) and renders in ~400 lines.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/admin/ui";
import { Switch } from "@/components/ui/Switch";
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

// Mirrors the Option struct in plugins/assessment-mcq/types.go.
interface Option {
    id: string;
    text: string;
    explanation?: string;
}

interface McqBody {
    type: "mcq";
    title: string;
    section?: string;
    category?: string;
    difficulty?: "easy" | "medium" | "hard";
    promptFormat?: "markdown" | "html" | "plain";
    prompt: string;
    language: string;
    options: Option[];
    correctOptionIds: string[];
    multiSelect?: boolean;
    shuffleOptions?: boolean;
    tags?: string[];
    mode?: "trial" | "main";
    explanation?: string;
}

interface FormState {
    title: string;
    difficulty: number; // 1 = easy, 3 = medium, 5 = hard
    maxScore: number;
    isNegativeMarked: boolean;
    negativeScore: number;
    body: McqBody;
}

// Marking convention reflected in the bank: easy=1, medium=3, hard=5. New
// MCQs pre-fill with the easy default so admins don't need to think about it.
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
        type: "mcq",
        title: "",
        difficulty: "easy",
        promptFormat: "markdown",
        prompt: "",
        language: "",
        options: [
            { id: "a", text: "" },
            { id: "b", text: "" },
            { id: "c", text: "" },
            { id: "d", text: "" },
        ],
        correctOptionIds: [],
        multiSelect: false,
        shuffleOptions: true,
        tags: [],
        mode: "main",
    },
};

function difficultyToInt(d?: "easy" | "medium" | "hard"): number {
    if (d === "medium") return 3;
    if (d === "hard") return 5;
    return 1;
}

function difficultyFromInt(n: number): "easy" | "medium" | "hard" {
    if (n >= 5) return "hard";
    if (n >= 3) return "medium";
    return "easy";
}

interface McqEditorProps {
    mode: "new" | "edit";
    questionId?: string;
}

export default function McqEditor({ mode, questionId }: McqEditorProps) {
    const router = useRouter();
    const [state, setState] = useState<FormState>(EMPTY);
    const [languages, setLanguages] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [error, setError] = useState<string>("");

    // Load language plugins for the language dropdown. Cheap, cached by the
    // backend; we don't gate the form on it (it can render with an empty list
    // and the admin will see no choices).
    useEffect(() => {
        listPlugins({ category: "language" })
            .then(({ plugins }) => setLanguages(plugins))
            .catch(() => setLanguages([]));
    }, []);

    // Edit-mode bootstrap.
    useEffect(() => {
        if (mode !== "edit" || !questionId) return;
        setLoading(true);
        getAdminQuestion(questionId)
            .then((q) => {
                const body = (q.body ?? {}) as Partial<McqBody>;
                setState({
                    title: q.title,
                    difficulty: q.difficulty,
                    maxScore: q.maxScore,
                    isNegativeMarked: q.isNegativeMarked,
                    negativeScore: q.negativeScore,
                    body: {
                        type: "mcq",
                        title: body.title ?? q.title,
                        section: body.section,
                        category: body.category,
                        difficulty: body.difficulty ?? difficultyFromInt(q.difficulty),
                        promptFormat: body.promptFormat ?? "markdown",
                        prompt: body.prompt ?? "",
                        language: body.language ?? "",
                        options: Array.isArray(body.options) && body.options.length > 0
                            ? body.options
                            : EMPTY.body.options,
                        correctOptionIds: Array.isArray(body.correctOptionIds) ? body.correctOptionIds : [],
                        multiSelect: body.multiSelect ?? false,
                        shuffleOptions: body.shuffleOptions ?? true,
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

    const setBody = useCallback(<K extends keyof McqBody>(key: K, value: McqBody[K]) => {
        setState((s) => ({ ...s, body: { ...s.body, [key]: value } }));
    }, []);

    const onDifficultyChange = (next: number) => {
        setState((s) => ({
            ...s,
            difficulty: next,
            // Auto-suggest the marking-convention default when the admin hasn't
            // hand-edited away from the previous bucket's default. Keep custom
            // values intact so a deliberate 7-point bonus isn't clobbered.
            maxScore: DEFAULT_MAX_SCORE_BY_DIFFICULTY[s.difficulty] === s.maxScore
                ? DEFAULT_MAX_SCORE_BY_DIFFICULTY[next]
                : s.maxScore,
            body: { ...s.body, difficulty: difficultyFromInt(next) },
        }));
    };

    const updateOption = (idx: number, patch: Partial<Option>) => {
        setBody(
            "options",
            state.body.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
        );
    };

    const addOption = () => {
        const usedIds = new Set(state.body.options.map((o) => o.id));
        // Walk the lowercase alphabet, then fall back to "opt-N" once a..z is
        // exhausted. Keeps ids stable + short for the common case.
        let nextId = "";
        for (let code = 97; code <= 122; code++) {
            const c = String.fromCharCode(code);
            if (!usedIds.has(c)) {
                nextId = c;
                break;
            }
        }
        if (!nextId) {
            for (let i = state.body.options.length + 1; ; i++) {
                if (!usedIds.has(`opt-${i}`)) {
                    nextId = `opt-${i}`;
                    break;
                }
            }
        }
        setBody("options", [...state.body.options, { id: nextId, text: "" }]);
    };

    const removeOption = (idx: number) => {
        const removed = state.body.options[idx];
        const nextOptions = state.body.options.filter((_, i) => i !== idx);
        const nextCorrect = state.body.correctOptionIds.filter((id) => id !== removed.id);
        setState((s) => ({
            ...s,
            body: { ...s.body, options: nextOptions, correctOptionIds: nextCorrect },
        }));
    };

    const toggleCorrect = (id: string) => {
        const isCorrect = state.body.correctOptionIds.includes(id);
        if (state.body.multiSelect) {
            setBody(
                "correctOptionIds",
                isCorrect
                    ? state.body.correctOptionIds.filter((x) => x !== id)
                    : [...state.body.correctOptionIds, id],
            );
        } else {
            // Single-select: clicking the already-correct option clears it.
            setBody("correctOptionIds", isCorrect ? [] : [id]);
        }
    };

    const validate = (): string | null => {
        if (!state.title.trim()) return "Title is required.";
        if (!state.body.language) return "Language is required.";
        if (!state.body.prompt.trim()) return "Prompt is required.";
        const ids = state.body.options.map((o) => o.id.trim());
        if (ids.some((id) => !id)) return "Every option needs an id.";
        if (new Set(ids).size !== ids.length) return "Option ids must be unique.";
        if (state.body.options.some((o) => !o.text.trim())) return "Every option needs text.";
        if (state.body.options.length < 2) return "At least 2 options required.";
        if (state.body.correctOptionIds.length === 0) return "Mark at least one option correct.";
        const idSet = new Set(ids);
        if (state.body.correctOptionIds.some((id) => !idSet.has(id))) {
            return "A correct-option id does not match any option.";
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
            const payload = {
                title: state.title,
                plugin_slug: "assessment.mcq",
                body: { ...state.body, title: state.title } as unknown as Record<string, unknown>,
                max_score: state.maxScore,
                is_negative_marked: state.isNegativeMarked,
                negative_score: state.negativeScore,
                difficulty: state.difficulty,
            };
            if (mode === "new") {
                const created = await createAdminQuestion(payload);
                router.push(`/admin/mcq/${created.id}`);
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
            {/* Top metadata strip */}
            <Card>
                <div className="admin-filter-bar" style={{ alignItems: "flex-end" }}>
                    <div className="admin-filter-field" data-w="grow">
                        <span className="admin-filter-label">Title</span>
                        <input
                            className="admin-field"
                            value={state.title}
                            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                            placeholder="e.g. Python list reversal"
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
                            placeholder="e.g. Python"
                        />
                    </div>
                    <div className="admin-filter-field" data-w="md">
                        <span className="admin-filter-label">Category</span>
                        <input
                            className="admin-field"
                            value={state.body.category ?? ""}
                            onChange={(e) => setBody("category", e.target.value || undefined)}
                            placeholder="e.g. Sequences"
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
                <h3 className="admin-card-title" style={{ fontSize: 14, marginBottom: 12 }}>
                    Question prompt
                </h3>
                <FormatAwareEditor
                    label="Prompt"
                    value={promptFormatted}
                    onChange={(next) => {
                        setBody("promptFormat", next.kind);
                        setBody("prompt", next.content);
                    }}
                    height={220}
                />
            </Card>

            {/* Options */}
            <Card>
                <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                        <h3 className="admin-card-title" style={{ fontSize: 14, margin: 0 }}>
                            Options
                        </h3>
                        <p className="admin-card-subtitle" style={{ fontSize: 12, margin: "4px 0 0" }}>
                            {state.body.multiSelect
                                ? "Multi-select — candidate may pick more than one option."
                                : "Single-select — exactly one correct option."}
                        </p>
                    </div>
                    <div className="admin-row" style={{ gap: 12 }}>
                        <label className="admin-row" style={{ gap: 8, fontSize: 12, color: "var(--admin-fg-2)" }}>
                            Multi-select
                            <Switch
                                checked={!!state.body.multiSelect}
                                onCheckedChange={(val) => {
                                    setBody("multiSelect", val);
                                    // When switching to single-select keep only the
                                    // first existing correct id so we never end up in
                                    // a state the validator rejects.
                                    if (!val && state.body.correctOptionIds.length > 1) {
                                        setBody("correctOptionIds", state.body.correctOptionIds.slice(0, 1));
                                    }
                                }}
                            />
                        </label>
                        <label className="admin-row" style={{ gap: 8, fontSize: 12, color: "var(--admin-fg-2)" }}>
                            Shuffle
                            <Switch
                                checked={state.body.shuffleOptions !== false}
                                onCheckedChange={(val) => setBody("shuffleOptions", val)}
                            />
                        </label>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {state.body.options.map((opt, idx) => {
                        const isCorrect = state.body.correctOptionIds.includes(opt.id);
                        return (
                            <div
                                key={idx}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "auto 80px 1fr auto",
                                    gap: 10,
                                    alignItems: "center",
                                    padding: 10,
                                    border: `1px solid ${
                                        isCorrect ? "rgba(30,211,106,0.45)" : "var(--admin-border)"
                                    }`,
                                    borderRadius: "var(--admin-r-md)",
                                    background: isCorrect ? "var(--admin-green-soft)" : "var(--admin-card-2)",
                                }}
                            >
                                <label
                                    className="admin-row"
                                    style={{ gap: 8, fontSize: 11, fontWeight: 800, color: "var(--admin-fg-2)" }}
                                >
                                    <input
                                        type={state.body.multiSelect ? "checkbox" : "radio"}
                                        name="mcq-correct"
                                        checked={isCorrect}
                                        onChange={() => toggleCorrect(opt.id)}
                                        style={{ accentColor: "var(--admin-green)", width: 16, height: 16 }}
                                    />
                                    Correct
                                </label>
                                <input
                                    className="admin-field"
                                    value={opt.id}
                                    onChange={(e) => {
                                        const oldId = opt.id;
                                        const newId = e.target.value;
                                        updateOption(idx, { id: newId });
                                        // Keep correctOptionIds in sync with id renames.
                                        if (state.body.correctOptionIds.includes(oldId)) {
                                            setBody(
                                                "correctOptionIds",
                                                state.body.correctOptionIds.map((x) => (x === oldId ? newId : x)),
                                            );
                                        }
                                    }}
                                    placeholder="id"
                                    style={{ fontSize: 13, fontFamily: "var(--admin-font-mono)" }}
                                />
                                <input
                                    className="admin-field"
                                    value={opt.text}
                                    onChange={(e) => updateOption(idx, { text: e.target.value })}
                                    placeholder="Option text"
                                />
                                <button
                                    type="button"
                                    className="admin-btn admin-btn-ghost"
                                    onClick={() => removeOption(idx)}
                                    disabled={state.body.options.length <= 2}
                                    title={state.body.options.length <= 2 ? "MCQ needs at least 2 options" : "Remove"}
                                    aria-label="Remove option"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="admin-row" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                    <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={addOption}
                        disabled={state.body.options.length >= 10}
                        title={state.body.options.length >= 10 ? "Max 10 options" : "Add another option"}
                    >
                        <Plus size={14} /> Add option
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
