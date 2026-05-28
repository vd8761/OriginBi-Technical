"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Code2,
    FileText,
    HelpCircle,
    Loader2,
    RotateCw,
    Save,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import {
    Card,
    SegmentedToggle,
} from "@/components/admin/ui";
import { Switch } from "@/components/ui/Switch";
import {
    getAdminLanguageConfigBundle,
    updateAdminCodingLanguageConfig,
    deleteAdminCodingLanguageConfig,
    type AdminCodingBankCounts,
    type AdminCodingLanguageConfig,
    type AdminLanguageConfigBundle,
    type AssessmentQuestionType,
} from "@/lib/api";

type Mode = "count" | "percent";

interface SectionState {
    enabled: boolean;
    mode: Mode;
    total: number;
    easy: number;
    medium: number;
    hard: number;
    allowSpillover: boolean;
    includeTags: string[];
    timeSecondsOverride: number | null;
    // Persistence: tracks whether the row was loaded from server (existed
    // previously) so a disable+save knows to call DELETE on the row instead of
    // an UPDATE-with-enabled=false. Both leave the same UX result, but DELETE
    // matches the previous "Reset" semantics admins are used to.
    persisted: boolean;
    saving: boolean;
    error: string | null;
}

interface SectionMeta {
    type: AssessmentQuestionType;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const SECTIONS: SectionMeta[] = [
    {
        type: "coding",
        label: "Coding",
        description: "Editor-based programming tasks with starter code and test cases.",
        icon: <Code2 size={18} />,
    },
    {
        type: "mcq",
        label: "MCQ",
        description: "Multiple-choice questions, single- or multi-select.",
        icon: <HelpCircle size={18} />,
    },
    {
        type: "fillblank",
        label: "Fill in the Blanks",
        description: "Prompts with {{n}} placeholders the candidate fills in.",
        icon: <FileText size={18} />,
    },
];

function defaultSection(): SectionState {
    return {
        enabled: false,
        mode: "count",
        total: 10,
        easy: 4,
        medium: 4,
        hard: 2,
        allowSpillover: true,
        includeTags: [],
        timeSecondsOverride: null,
        persisted: false,
        saving: false,
        error: null,
    };
}

function configToSection(cfg: AdminCodingLanguageConfig | null): SectionState {
    if (!cfg) {
        return defaultSection();
    }
    return {
        enabled: cfg.enabled,
        mode: cfg.inputMode,
        total: cfg.totalQuestions,
        easy: cfg.easyCount,
        medium: cfg.mediumCount,
        hard: cfg.hardCount,
        allowSpillover: cfg.allowSpillover,
        includeTags: cfg.includeTags ?? [],
        timeSecondsOverride: cfg.timeSecondsOverride ?? null,
        persisted: true,
        saving: false,
        error: null,
    };
}

function bareLang(slug: string): string {
    return slug.replace(/^language\./, "");
}

function CodingLanguageConfigInner() {
    const params = useParams<{ lang: string }>();
    const router = useRouter();
    const langParam = decodeURIComponent(params?.lang ?? "");
    const slug = langParam.startsWith("language.") ? langParam : `language.${langParam}`;

    useRegisterAdminPage({
        eyebrow: "Settings · Assessment Builder",
        title: `${bareLang(slug)} configuration`,
        subtitle: "Toggle question categories and set per-difficulty quotas for this language.",
        breadcrumb: [
            { label: "Settings", href: "/admin/settings" },
            { label: "Coding Builder", href: "/admin/settings" },
            { label: bareLang(slug) },
        ],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState<string>(bareLang(slug));
    const [banks, setBanks] = useState<Record<AssessmentQuestionType, AdminCodingBankCounts>>({
        coding: { total: 0, easy: 0, medium: 0, hard: 0 },
        mcq: { total: 0, easy: 0, medium: 0, hard: 0 },
        fillblank: { total: 0, easy: 0, medium: 0, hard: 0 },
    });
    const [sections, setSections] = useState<Record<AssessmentQuestionType, SectionState>>({
        coding: defaultSection(),
        mcq: defaultSection(),
        fillblank: defaultSection(),
    });

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const bundle: AdminLanguageConfigBundle = await getAdminLanguageConfigBundle(slug);
            setBanks({
                coding: bundle.banks.coding,
                mcq: bundle.banks.mcq,
                fillblank: bundle.banks.fillblank,
            });
            setSections({
                coding: configToSection(bundle.configs.coding),
                mcq: configToSection(bundle.configs.mcq),
                fillblank: configToSection(bundle.configs.fillblank),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void reload();
    }, [reload]);

    // The list page already resolves the human-readable language name; we
    // fall back to a slug-derived label here to avoid an extra request when
    // someone deep-links to this page.
    useEffect(() => {
        setName(bareLang(slug));
    }, [slug]);

    const updateSection = useCallback(
        (type: AssessmentQuestionType, patch: Partial<SectionState>) => {
            setSections((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
        },
        [],
    );

    const onSave = useCallback(
        async (type: AssessmentQuestionType) => {
            const s = sections[type];
            // Resolve count/percent to integer counts so the backend's "sum =
            // total" constraint holds regardless of how the admin entered them.
            let easy = s.easy;
            let medium = s.medium;
            let hard = s.hard;
            const total = s.total;
            if (s.mode === "percent") {
                easy = Math.floor((s.easy / 100) * total);
                medium = Math.floor((s.medium / 100) * total);
                hard = total - easy - medium;
                if (hard < 0) {
                    updateSection(type, { error: "Percentages exceed 100%." });
                    return;
                }
            }
            if (easy + medium + hard !== total) {
                updateSection(type, { error: "Easy + Medium + Hard must equal Total." });
                return;
            }
            updateSection(type, { saving: true, error: null });
            try {
                // Disable + previously-persisted means "remove the quota"; the
                // user expects the same UX as the legacy Reset button.
                if (!s.enabled && s.persisted) {
                    await deleteAdminCodingLanguageConfig(slug, type);
                    updateSection(type, { saving: false, persisted: false });
                    return;
                }
                if (!s.enabled) {
                    // Disabled and never persisted — nothing to write.
                    updateSection(type, { saving: false });
                    return;
                }
                await updateAdminCodingLanguageConfig(
                    slug,
                    {
                        enabled: s.enabled,
                        totalQuestions: total,
                        easyCount: easy,
                        mediumCount: medium,
                        hardCount: hard,
                        inputMode: s.mode,
                        allowSpillover: s.allowSpillover,
                        includeTags: s.includeTags,
                        timeSecondsOverride: s.timeSecondsOverride,
                    },
                    type,
                );
                updateSection(type, { saving: false, persisted: true });
            } catch (err) {
                updateSection(type, {
                    saving: false,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        },
        [sections, slug, updateSection],
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="admin-page-eyebrow">Settings / Assessment Builder</p>
                    <h2 className="admin-page-title">{name} configuration</h2>
                    <p className="admin-page-copy">
                        Enable the question categories you want this language to draw from at exam-build time. Each category
                        keeps its own difficulty quota.
                    </p>
                </div>
                <div className="admin-row">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/settings")}
                        className="admin-btn admin-btn-secondary"
                    >
                        <ArrowLeft size={14} /> Back to settings
                    </button>
                    <button
                        type="button"
                        onClick={() => void reload()}
                        className="admin-btn admin-btn-secondary"
                    >
                        <RotateCw size={13} /> Refresh
                    </button>
                </div>
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
                    <Loader2 size={18} className="admin-animate-spin" /> Loading configuration…
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {SECTIONS.map((meta) => (
                        <SectionCard
                            key={meta.type}
                            meta={meta}
                            state={sections[meta.type]}
                            bank={banks[meta.type]}
                            onPatch={(patch) => updateSection(meta.type, patch)}
                            onSave={() => void onSave(meta.type)}
                        />
                    ))}
                </div>
            )}

            <p style={{ fontSize: 11.5, color: "var(--admin-fg-4)", marginTop: 8 }}>
                Tip: bulk-import MCQ and Fill-in-the-Blank questions from the{" "}
                <Link href="/admin/coding" style={{ color: "var(--admin-fg-2)" }}>
                    Coding Question Bank
                </Link>{" "}
                page — the importer accepts a single mixed JSON or XLSX with rows for any of the three types.
            </p>
        </div>
    );
}

function SectionCard({
    meta,
    state,
    bank,
    onPatch,
    onSave,
}: {
    meta: SectionMeta;
    state: SectionState;
    bank: AdminCodingBankCounts;
    onPatch: (patch: Partial<SectionState>) => void;
    onSave: () => void;
}) {
    const sum = state.easy + state.medium + state.hard;
    const sumTarget = state.mode === "percent" ? 100 : state.total;
    const sumMatches = sum === sumTarget;

    const healthFor = useMemo(
        () => (have: number, want: number): "good" | "warn" | "bad" => {
            if (want === 0) return "good";
            if (have >= want) return "good";
            if (have >= Math.ceil(want * 0.75)) return "warn";
            return "bad";
        },
        [],
    );
    const toneColors: Record<string, string> = {
        good: "var(--admin-green)",
        warn: "var(--admin-amber, #ffb703)",
        bad: "#ff6a6e",
    };

    return (
        <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 4 }}>
                <div className="admin-row" style={{ justifyContent: "space-between", gap: 12 }}>
                    <div className="admin-row" style={{ gap: 12 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "var(--admin-r-md)",
                                background: "rgba(255, 183, 3, 0.12)",
                                color: "var(--admin-amber, #ffb703)",
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            {meta.icon}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--admin-fg)" }}>
                                {meta.label}
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--admin-fg-3)" }}>
                                {meta.description}
                            </p>
                        </div>
                    </div>
                    <label
                        className="admin-row"
                        style={{ gap: 8, fontSize: 12, color: "var(--admin-fg-2)", fontWeight: 700, cursor: "pointer" }}
                    >
                        <span>{state.enabled ? "Enabled" : "Disabled"}</span>
                        <Switch
                            checked={state.enabled}
                            onCheckedChange={(val) => onPatch({ enabled: val })}
                        />
                    </label>
                </div>

                <div
                    style={{
                        display: "grid",
                        // auto-fit lets the 4 buckets wrap to 2x2 on narrow
                        // viewports without overflowing.
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: 8,
                        padding: 10,
                        borderRadius: "var(--admin-r-md)",
                        background: "var(--admin-card-2)",
                        border: "1px solid var(--admin-border)",
                    }}
                >
                    <BucketCell label="Bank total" want={undefined} have={bank.total} tone="good" colors={toneColors} />
                    <BucketCell
                        label="Easy"
                        want={state.enabled ? state.easy : undefined}
                        have={bank.easy}
                        tone={healthFor(bank.easy, state.enabled ? state.easy : 0)}
                        colors={toneColors}
                    />
                    <BucketCell
                        label="Medium"
                        want={state.enabled ? state.medium : undefined}
                        have={bank.medium}
                        tone={healthFor(bank.medium, state.enabled ? state.medium : 0)}
                        colors={toneColors}
                    />
                    <BucketCell
                        label="Hard"
                        want={state.enabled ? state.hard : undefined}
                        have={bank.hard}
                        tone={healthFor(bank.hard, state.enabled ? state.hard : 0)}
                        colors={toneColors}
                    />
                </div>

                {state.enabled && (
                    <>
                        <div
                            style={{
                                display: "grid",
                                // Two-column form on tablet+, single-column on
                                // mobile — fields stay tappable + readable.
                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 16,
                            }}
                        >
                            <Field label="Mode">
                                <SegmentedToggle
                                    value={state.mode}
                                    onChange={(v) => onPatch({ mode: v as Mode })}
                                    options={[
                                        { value: "count", label: "Count" },
                                        { value: "percent", label: "Percent" },
                                    ]}
                                />
                            </Field>
                            <Field label="Total questions">
                                <NumberInput value={state.total} min={1} onChange={(v) => onPatch({ total: v })} />
                            </Field>
                            <Field label={state.mode === "percent" ? "Easy (%)" : "Easy (count)"}>
                                <NumberInput value={state.easy} min={0} onChange={(v) => onPatch({ easy: v })} />
                            </Field>
                            <Field label={state.mode === "percent" ? "Medium (%)" : "Medium (count)"}>
                                <NumberInput value={state.medium} min={0} onChange={(v) => onPatch({ medium: v })} />
                            </Field>
                            <Field label={state.mode === "percent" ? "Hard (%)" : "Hard (count)"}>
                                <NumberInput value={state.hard} min={0} onChange={(v) => onPatch({ hard: v })} />
                            </Field>
                            {meta.type === "coding" && (
                                <Field label="Time override (seconds, optional)">
                                    <NumberInput
                                        value={state.timeSecondsOverride ?? 0}
                                        min={0}
                                        placeholder="0 = inherit"
                                        onChange={(v) =>
                                            onPatch({ timeSecondsOverride: v > 0 ? v : null })
                                        }
                                    />
                                </Field>
                            )}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: "var(--admin-r-md)",
                                border: `1px solid ${sumMatches ? "rgba(30, 211, 106, 0.32)" : "rgba(237, 47, 52, 0.32)"}`,
                                background: sumMatches
                                    ? "var(--admin-green-soft)"
                                    : "var(--admin-red-soft, rgba(237, 47, 52, 0.08))",
                                color: sumMatches ? "var(--admin-green)" : "#ff8a8d",
                                fontSize: 12.5,
                                fontWeight: 600,
                            }}
                        >
                            {sumMatches ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                            {state.mode === "percent"
                                ? `Easy + Medium + Hard = ${sum}% (need 100%)`
                                : `Easy + Medium + Hard = ${sum} (need ${state.total})`}
                        </div>

                        <label
                            className="admin-row"
                            style={{ gap: 10, fontSize: 13, color: "var(--admin-fg-2)", cursor: "pointer" }}
                        >
                            <input
                                type="checkbox"
                                checked={state.allowSpillover}
                                onChange={(e) => onPatch({ allowSpillover: e.target.checked })}
                                style={{ accentColor: "var(--admin-green)", width: 15, height: 15 }}
                            />
                            Allow spillover from adjacent difficulty buckets when one is short
                        </label>
                    </>
                )}

                {state.error && (
                    <div
                        style={{
                            padding: 10,
                            borderRadius: "var(--admin-r-md)",
                            background: "var(--admin-red-soft, rgba(237, 47, 52, 0.08))",
                            border: "1px solid rgba(237, 47, 52, 0.32)",
                            color: "#ff8a8d",
                            fontSize: 12.5,
                        }}
                    >
                        {state.error}
                    </div>
                )}

                <div className="admin-row" style={{ justifyContent: "flex-end", gap: 8 }}>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={state.saving || (state.enabled && !sumMatches)}
                        className="admin-btn admin-btn-primary"
                        style={{ opacity: state.saving ? 0.55 : 1 }}
                    >
                        {state.saving ? <Loader2 size={13} className="admin-animate-spin" /> : <Save size={13} />}
                        Save {meta.label}
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
            <p className="admin-mono" style={{ margin: 0, fontSize: 10, color: "var(--admin-fg-4)" }}>
                bank {have}
            </p>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--admin-fg-2)" }}>{label}</span>
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
            style={{ fontSize: 14, minHeight: 40 }}
        />
    );
}

export default function CodingLanguageConfigPage() {
    return (
        <AdminGuard>
            <CodingLanguageConfigInner />
        </AdminGuard>
    );
}
