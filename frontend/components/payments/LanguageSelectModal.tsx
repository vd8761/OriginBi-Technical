"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { CODING_LANGUAGES, type CodingLanguage } from "@/lib/exams";
import { type PaymentKey, codingPaymentKey } from "@/lib/payments";
import { readableTextOn } from "@/lib/colors";

type LangStatus = "ready" | "completed" | "locked";

const statusRank: Record<LangStatus, number> = {
    ready: 0,
    completed: 1,
    locked: 2,
};

interface LanguageSelectModalProps {
    accent?: string;
    price: number;
    isPaid: (key: PaymentKey) => boolean;
    isCompleted: (key: PaymentKey) => boolean;
    onClose: () => void;
    onPick: (language: CodingLanguage) => void;
}

const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
    accent = "#f59e0b",
    price,
    isPaid,
    isCompleted,
    onClose,
    onPick,
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const orderedLanguages = useMemo(() => {
        return CODING_LANGUAGES
            .map((lang) => {
                const key = codingPaymentKey(lang.id);
                const paid = isPaid(key);
                const completed = isCompleted(key);
                const status: LangStatus = completed
                    ? "completed"
                    : paid
                        ? "ready"
                        : "locked";
                return { lang, paid, completed, status };
            })
            .sort((a, b) => statusRank[a.status] - statusRank[b.status]);
    }, [isPaid, isCompleted]);

    const selected = orderedLanguages.find((entry) => entry.lang.id === selectedId) ?? null;
    const selectedLang = selected?.lang ?? null;

    const handleConfirm = () => {
        if (!selectedLang) return;
        onPick(selectedLang);
    };

    const ctaLabel = !selected
        ? "Select a language"
        : selected.completed
            ? `${selected.lang.name} completed`
            : selected.paid
                ? `Start in ${selected.lang.name}`
                : price === 0
                    ? `Unlock ${selected.lang.name} for Free`
                    : `Pay ₹${price} for ${selected.lang.name}`;

    const footerNote = !selected
        ? "Pick a language to continue."
        : selected.completed
            ? `${selected.lang.name} is completed. Retakes will be added through a later policy.`
            : selected.paid
                ? `${selected.lang.name} is unlocked. Start any time.`
                : price === 0
                    ? `Unlock ${selected.lang.name} for free.`
                    : `You'll pay ₹${price} to unlock ${selected.lang.name}.`;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                aria-label="Close language selection"
                className="absolute inset-0 bg-[#0f1712]/70"
                onClick={onClose}
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="language-select-title"
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
            >
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: accent }} />

                <header className="flex flex-col gap-2 px-7 pt-7 sm:px-8 sm:pt-8">
                    <span
                        className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `${accent}20`, color: accent }}
                    >
                        Pick a language
                    </span>
                    <h2
                        id="language-select-title"
                        className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight"
                    >
                        Choose your coding language
                    </h2>
                    <p className="text-[13px] text-slate-500 dark:text-gray-400 leading-relaxed">
                        {price === 0
                            ? "Unlock each language for free — you can come back and unlock another later."
                            : `Each language is unlocked separately. Pay ₹${price} per language — you can come back and pay for another later.`}
                    </p>
                </header>

                <div
                    role="radiogroup"
                    aria-label="Coding language"
                    className="grid gap-2.5 overflow-y-auto px-7 py-6 sm:grid-cols-2 sm:px-8"
                >
                    {orderedLanguages.map(({ lang, status }) => {
                        const isSelected = selectedId === lang.id;
                        return (
                            <button
                                key={lang.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => setSelectedId(lang.id)}
                                className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${isSelected
                                        ? "border-transparent shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
                                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:-translate-y-0.5 hover:shadow-md"
                                    }`}
                                style={
                                    isSelected
                                        ? {
                                            background: `${lang.accent}10`,
                                            boxShadow: `0 0 0 2px ${lang.accent}, 0 10px 24px ${lang.accent}26`,
                                        }
                                        : undefined
                                }
                            >
                                <div className="flex w-full items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                                            style={{ background: `${lang.accent}1a` }}
                                        >
                                            <Image
                                                src={lang.icon}
                                                alt={`${lang.name} logo`}
                                                width={32}
                                                height={32}
                                                className="h-8 w-8 object-contain"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                                                {lang.name}
                                            </p>
                                            <p className="text-[11.5px] text-slate-500 dark:text-gray-400">
                                                {lang.description}
                                            </p>
                                        </div>
                                    </div>
                                    {status === "completed" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                                            Completed
                                        </span>
                                    ) : status === "ready" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                            Ready
                                        </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                            style={{ background: `${lang.accent}18`, color: lang.accent }}
                                        >
                                            {price === 0 ? "Free" : `₹${price}`}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex w-full items-center justify-between">
                                    <span
                                        className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${isSelected
                                                ? "text-slate-700 dark:text-white"
                                                : "text-slate-400 dark:text-gray-500"
                                            }`}
                                    >
                                        {isSelected
                                            ? "Selected"
                                            : status === "completed"
                                                ? "Completed"
                                                : status === "ready"
                                                    ? "Tap to start"
                                                    : "Tap to select"}
                                    </span>
                                    <span
                                        className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${isSelected
                                                ? "border-transparent"
                                                : "border-slate-300 dark:border-white/20"
                                            }`}
                                        style={isSelected ? { background: lang.accent } : undefined}
                                        aria-hidden="true"
                                    >
                                        {isSelected && (
                                            <svg
                                                className="h-2.5 w-2.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke={readableTextOn(lang.accent)}
                                                strokeWidth={4}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-200 dark:border-white/10 px-7 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <p className="text-[11.5px] text-slate-500 dark:text-gray-400">
                        {footerNote}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!selectedLang}
                            className="rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-white/[0.06] dark:disabled:text-gray-500"
                            style={
                                selectedLang
                                    ? {
                                        background: selectedLang.accent,
                                        color: readableTextOn(selectedLang.accent),
                                        boxShadow: `0 8px 18px ${selectedLang.accent}40`,
                                    }
                                    : undefined
                            }
                        >
                            {ctaLabel}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default LanguageSelectModal;
