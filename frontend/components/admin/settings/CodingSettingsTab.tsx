"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Code2,
    FileText,
    HelpCircle,
    Loader2,
    RotateCw,
    Settings as SettingsIcon,
    Sparkles,
    X,
} from "lucide-react";
import {
    Card,
    Modal,
    useConfirm,
} from "@/components/admin/ui";
import {
    listAdminCodingLanguages,
    deleteAdminCodingLanguageConfig,
    previewAdminCodingLanguageConfig,
    type AdminCodingLanguageEntry,
    type AdminCodingBankCounts,
    type AdminCodingLanguageConfig,
    type AdminCodingPreviewResponse,
    type AssessmentQuestionType,
} from "@/lib/api";

const CodingSettingsTab: React.FC = () => {
    const router = useRouter();
    const [languages, setLanguages] = useState<AdminCodingLanguageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState<{
        slug: string;
        data: AdminCodingPreviewResponse | null;
        loading: boolean;
        error: string | null;
    } | null>(null);
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

    const openConfigure = useCallback(
        (slug: string) => {
            const bare = slug.replace(/^language\./, "");
            router.push(`/admin/settings/coding/${encodeURIComponent(bare)}`);
        },
        [router],
    );

    const clearAllConfigs = useCallback(
        async (entry: AdminCodingLanguageEntry) => {
            const enabledTypes: AssessmentQuestionType[] = (
                ["coding", "mcq", "fillblank"] as AssessmentQuestionType[]
            ).filter((t) => entry.configs?.[t]);
            if (enabledTypes.length === 0) return;
            const ok = await confirm({
                title: "Reset all categories?",
                message: `${entry.name} will revert to the default policy for every assessment type. In-progress attempts keep their snapshot.`,
                confirmLabel: "Reset",
                variant: "warning",
            });
            if (!ok) return;
            try {
                for (const t of enabledTypes) {
                    await deleteAdminCodingLanguageConfig(entry.slug, t);
                }
                await reload();
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            }
        },
        [confirm, reload],
    );

    const openPreview = useCallback(async (slug: string) => {
        setPreviewing({ slug, data: null, loading: true, error: null });
        try {
            const data = await previewAdminCodingLanguageConfig(slug);
            setPreviewing({ slug, data, loading: false, error: null });
        } catch (err) {
            setPreviewing({
                slug,
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : String(err),
            });
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
                    <h3 className="admin-card-title" style={{ fontSize: 17 }}>
                        Assessment Builder
                    </h3>
                    <p className="admin-card-subtitle" style={{ marginTop: 4 }}>
                        Per-language toggles for Coding, MCQ, and Fill-in-the-Blank pools. Snapshots into the
                        candidate&apos;s attempt at Start.
                    </p>
                </div>
                <button type="button" onClick={() => void reload()} className="admin-btn admin-btn-secondary">
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
                <div
                    className="admin-row"
                    style={{ justifyContent: "center", padding: 48, color: "var(--admin-fg-3)" }}
                >
                    <Loader2 size={18} className="admin-animate-spin" /> Loading languages…
                </div>
            ) : languages.length === 0 ? (
                <Card>
                    <p
                        style={{
                            padding: 24,
                            textAlign: "center",
                            color: "var(--admin-fg-3)",
                            fontSize: 13,
                        }}
                    >
                        No language plugins installed yet. Add languages under{" "}
                        <strong>System → Languages</strong> first.
                    </p>
                </Card>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                        gap: 14,
                    }}
                >
                    {languages.map((l) => (
                        <LanguageCard
                            key={l.slug}
                            entry={l}
                            onConfigure={() => openConfigure(l.slug)}
                            onPreview={() => void openPreview(l.slug)}
                            onClear={() => void clearAllConfigs(l)}
                        />
                    ))}
                </div>
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
    onConfigure,
    onPreview,
    onClear,
}: {
    entry: AdminCodingLanguageEntry;
    onConfigure: () => void;
    onPreview: () => void;
    onClear: () => void;
}) {
    const configs = entry.configs ?? { coding: null, mcq: null, fillblank: null };
    const banks = entry.banks ?? {
        coding: entry.bank ?? { total: 0, easy: 0, medium: 0, hard: 0 },
        mcq: { total: 0, easy: 0, medium: 0, hard: 0 },
        fillblank: { total: 0, easy: 0, medium: 0, hard: 0 },
    };
    const enabledCount = (
        ["coding", "mcq", "fillblank"] as AssessmentQuestionType[]
    ).filter((t) => configs[t]?.enabled).length;
    const hasAnyConfig = (["coding", "mcq", "fillblank"] as AssessmentQuestionType[]).some(
        (t) => configs[t],
    );

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
                            <h4
                                style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: "var(--admin-fg)",
                                }}
                            >
                                {entry.name}
                            </h4>
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
                            background: enabledCount > 0 ? "var(--admin-green-soft)" : "rgba(255, 183, 3, 0.12)",
                            color: enabledCount > 0 ? "var(--admin-green)" : "var(--admin-amber, #ffb703)",
                        }}
                    >
                        {enabledCount > 0
                            ? `${enabledCount} / 3 enabled`
                            : "Default policy"}
                    </span>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 8,
                    }}
                >
                    <TypeSummary
                        label="Coding"
                        icon={<Code2 size={13} />}
                        cfg={configs.coding}
                        bank={banks.coding}
                    />
                    <TypeSummary
                        label="MCQ"
                        icon={<HelpCircle size={13} />}
                        cfg={configs.mcq}
                        bank={banks.mcq}
                    />
                    <TypeSummary
                        label="Fill"
                        icon={<FileText size={13} />}
                        cfg={configs.fillblank}
                        bank={banks.fillblank}
                    />
                </div>

                <div className="admin-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                    {hasAnyConfig && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="admin-btn admin-btn-ghost"
                            title="Reset all categories to default"
                        >
                            <X size={13} /> Reset
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onPreview}
                        className="admin-btn admin-btn-secondary"
                        disabled={banks.coding.total === 0}
                        title={
                            banks.coding.total === 0
                                ? "Coding bank has no eligible questions yet"
                                : "Preview a sample coding selection"
                        }
                    >
                        <Sparkles size={13} /> Preview
                    </button>
                    <button type="button" onClick={onConfigure} className="admin-btn admin-btn-primary">
                        <SettingsIcon size={13} /> Configure
                    </button>
                </div>
            </div>
        </Card>
    );
}

function TypeSummary({
    label,
    icon,
    cfg,
    bank,
}: {
    label: string;
    icon: React.ReactNode;
    cfg: AdminCodingLanguageConfig | null;
    bank: AdminCodingBankCounts;
}) {
    const enabled = !!cfg?.enabled;
    return (
        <div
            style={{
                padding: 10,
                borderRadius: "var(--admin-r-md)",
                background: "var(--admin-card-2)",
                border: "1px solid var(--admin-border)",
            }}
        >
            <div
                className="admin-row"
                style={{
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: enabled ? "var(--admin-green)" : "var(--admin-fg-4)",
                }}
            >
                {icon}
                {label}
            </div>
            <p
                style={{
                    margin: "4px 0 0",
                    fontSize: 15,
                    fontWeight: 800,
                    color: enabled ? "var(--admin-fg)" : "var(--admin-fg-3)",
                    lineHeight: 1.1,
                }}
            >
                {enabled && cfg ? `${cfg.totalQuestions} qs` : "Off"}
            </p>
            <p className="admin-mono" style={{ margin: "2px 0 0", fontSize: 10, color: "var(--admin-fg-4)" }}>
                bank {bank.total}
            </p>
        </div>
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
            title="Sample candidate selection (coding bank)"
            wide
        >
            <p className="admin-card-subtitle" style={{ margin: 0, fontSize: 12.5 }}>
                Dry-run of the coding builder using the current config. Re-roll to see a different random pick. MCQ and
                Fill-in-the-Blank previews will land after the per-language picker is extended.
            </p>

            {state.loading && (
                <div
                    className="admin-row"
                    style={{ justifyContent: "center", padding: 40, color: "var(--admin-fg-3)", gap: 10 }}
                >
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
                    <div className="admin-row" style={{ gap: 14, fontSize: 12, color: "var(--admin-fg-2)" }}>
                        <span>
                            <strong>{state.data.picked.length}</strong> questions
                        </span>
                        <span>
                            Easy: <strong>{state.data.spillover.delivered.easy}</strong> /{" "}
                            {state.data.spillover.targets.easy || "any"}
                        </span>
                        <span>
                            Medium: <strong>{state.data.spillover.delivered.medium}</strong> /{" "}
                            {state.data.spillover.targets.medium || "any"}
                        </span>
                        <span>
                            Hard: <strong>{state.data.spillover.delivered.hard}</strong> /{" "}
                            {state.data.spillover.targets.hard || "any"}
                        </span>
                    </div>
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
