"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CodingAssessment from "@/components/assessment/coding/CodingAssessment";
import { LANG_META } from "@/components/assessment/coding/CodeEditor";
import { fetchCandidatePluginConfig, PluginProvider, type EnabledPluginConfig } from "@/plugins";
import {
    ApiError,
    listMyLanguages,
    startAttempt,
    type AttemptSnapshot,
    type MeLanguage,
} from "@/lib/api";

const VALID_LANGS = Object.keys(LANG_META);
type AssessmentMode = "trial" | "main";

// Normalize the legacy URL param "python" to the plugin slug "language.python"
// so we can compare against /v1/me/languages output (which is plugin-slug shaped).
const toPluginSlug = (legacy: string) =>
    legacy.startsWith("language.") ? legacy : `language.${legacy}`;

function LoadingView() {
    return (
        <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] text-white/60">
            <div className="flex items-center gap-3 text-[13px]">
                <div className="h-4 w-4 rounded-full border-2 border-[#1ED36A]/30 border-t-[#1ED36A] animate-spin-fast" />
                Loading assessment...
            </div>
        </div>
    );
}

function CodingAssessmentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = (searchParams.get("lang") || "").toLowerCase();
    const rawMode = searchParams.get("mode");
    const mode: AssessmentMode = rawMode === "trial" ? "trial" : "main";
    const [snapshot, setSnapshot] = useState<AttemptSnapshot | null>(null);
    const [plugins, setPlugins] = useState<EnabledPluginConfig[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!lang || !VALID_LANGS.includes(lang)) {
            router.replace("/explore/coding");
            return;
        }
        let cancelled = false;
        // Run snapshot + entitlement lookup in parallel. We need entitlements to
        // verify the candidate actually owns this language before we even render
        // the editor (backend enforces this on run/submit, but bouncing early
        // gives a cleaner UX than letting them edit code that can't run).
        Promise.all([
            startAttempt({ assignmentRef: `coding:${lang}` }),
            listMyLanguages().catch((err) => {
                // Entitlement endpoint is optional during transition; warn but
                // don't fail the whole load — backend still gates run/submit.
                console.warn("listMyLanguages failed", err);
                return { languages: [] as MeLanguage[] };
            }),
        ])
            .then(async ([snap, ents]) => {
                if (cancelled) return;
                const wanted = toPluginSlug(lang);
                const allowed = new Set(ents.languages.map((l) => l.slug));
                // Only enforce when we have a non-empty list — empty list means
                // the endpoint is unreachable or the user has none entitled.
                if (ents.languages.length > 0 && !allowed.has(wanted)) {
                    setError(
                        `You don't have access to ${lang}. Purchase or request entitlement before retrying.`,
                    );
                    return;
                }
                const pluginConfig = await fetchCandidatePluginConfig(snap.attempt.id);
                if (cancelled) return;
                setPlugins(pluginConfig);
                setSnapshot(snap);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err instanceof ApiError && [401, 403, 404, 409].includes(err.status)) {
                    router.replace("/explore/coding");
                    return;
                }
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Unable to start the coding assessment.",
                );
            });
        return () => {
            cancelled = true;
        };
    }, [lang, router]);

    if (!lang || !VALID_LANGS.includes(lang) || (!snapshot && !error)) {
        return <LoadingView />;
    }

    if (error) {
        return (
            <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] text-white/70">
                <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                    <p className="text-sm font-bold text-white">Assessment unavailable</p>
                    <p className="mt-2 text-[13px]">{error}</p>
                    <button
                        type="button"
                        onClick={() => router.replace("/explore/coding")}
                        className="mt-5 rounded-full bg-[#1ED36A] px-5 py-2 text-xs font-bold text-white"
                    >
                        Back to Coding
                    </button>
                </div>
            </div>
        );
    }

    return (
        <PluginProvider enabled={plugins} attemptId={snapshot?.attempt.id ?? null}>
            <CodingAssessment lang={lang} snapshot={snapshot} mode={mode} enabledPlugins={plugins} />
        </PluginProvider>
    );
}

export default function CodingAssessmentPage() {
    return (
        <Suspense fallback={<LoadingView />}>
            <CodingAssessmentInner />
        </Suspense>
    );
}
