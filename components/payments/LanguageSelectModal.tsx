"use client";

import React from "react";
import { CODING_LANGUAGES, type CodingLanguage } from "@/lib/exams";
import { type PaymentKey, codingPaymentKey } from "@/lib/payments";

interface LanguageSelectModalProps {
    accent?: string;
    price: number;
    isPaid: (key: PaymentKey) => boolean;
    onClose: () => void;
    onPick: (language: CodingLanguage) => void;
}

const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
    accent = "#f59e0b",
    price,
    isPaid,
    onClose,
    onPick,
}) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                aria-label="Close language selection"
                className="absolute inset-0 bg-[#0f1712]/70 backdrop-blur-sm"
                onClick={onClose}
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="language-select-title"
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
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
                        Each language is unlocked separately. Pay ₹{price} per language &mdash; you can come back and pay for another later.
                    </p>
                </header>

                <div className="grid gap-2.5 overflow-y-auto px-7 py-6 sm:grid-cols-2 sm:px-8">
                    {CODING_LANGUAGES.map((lang) => {
                        const paid = isPaid(codingPaymentKey(lang.id));
                        return (
                            <button
                                key={lang.id}
                                type="button"
                                onClick={() => onPick(lang)}
                                className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-md"
                                style={{ ["--accent" as never]: lang.accent }}
                            >
                                <div className="flex w-full items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl text-[14px] font-bold text-white"
                                            style={{ background: lang.accent }}
                                        >
                                            {lang.name.slice(0, 2)}
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
                                    {paid ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                            Paid
                                        </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                            style={{ background: `${accent}18`, color: accent }}
                                        >
                                            ₹{price}
                                        </span>
                                    )}
                                </div>
                                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300">
                                    {paid ? "Start in this language →" : "Pay & unlock →"}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200/70 dark:border-white/10 px-7 py-4 sm:px-8">
                    <p className="text-[11.5px] text-slate-500 dark:text-gray-400">
                        Already paid for one language? Pick another anytime &mdash; payments stack.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200/70 dark:border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                    >
                        Close
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default LanguageSelectModal;
