"use client";

import React, { useState } from "react";

interface PaymentModalProps {
    title: string;
    subtitle?: string;
    amount: number;
    accent?: string;
    onCancel: () => void;
    onSuccess: () => void;
}

type Stage = "review" | "processing" | "success";

const generateRef = () => {
    const segment = () =>
        Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
    return `OB-${segment()}-${segment()}`;
};

const PaymentModal: React.FC<PaymentModalProps> = ({
    title,
    subtitle,
    amount,
    accent = "#1ED36A",
    onCancel,
    onSuccess,
}) => {
    const [stage, setStage] = useState<Stage>("review");
    const [refId] = useState(generateRef);
    const [paidAt, setPaidAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);

    const handlePay = () => {
        setStage("processing");
        window.setTimeout(() => {
            setPaidAt(new Date());
            setStage("success");
        }, 1200);
    };

    const handleCopyRef = () => {
        if (typeof navigator !== "undefined") {
            navigator.clipboard?.writeText(refId).catch(() => { /* noop */ });
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                aria-label="Close payment dialog"
                className="absolute inset-0 bg-[#0f1712]/70 backdrop-blur-sm"
                onClick={stage === "review" ? onCancel : undefined}
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-modal-title"
                className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
            >
                <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ background: accent }}
                />

                <div className="flex flex-col gap-6 p-7 sm:p-8">
                    {stage === "review" && (
                        <>
                            <header className="flex flex-col gap-2">
                                <span
                                    className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                                    style={{ background: `${accent}20`, color: accent }}
                                >
                                    Demo Payment
                                </span>
                                <h2
                                    id="payment-modal-title"
                                    className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight"
                                >
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-[13px] text-slate-500 dark:text-gray-400 leading-relaxed">
                                        {subtitle}
                                    </p>
                                )}
                            </header>

                            <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-5">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Total payable
                                    </span>
                                    <span className="text-[26px] font-bold text-slate-900 dark:text-white">
                                        ₹{amount}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400 dark:text-gray-500">
                                    Demo only &middot; no real charge will be made.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 text-[12.5px] text-slate-500 dark:text-gray-400">
                                <p className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                                    Click &quot;Pay Now&quot; to simulate a successful payment.
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                                    After payment, the assessment unlocks for you.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="rounded-full border border-slate-200/70 dark:border-white/10 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePay}
                                    className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-md transition-all hover:opacity-95 active:scale-95"
                                    style={{ background: accent, boxShadow: `0 8px 18px ${accent}40` }}
                                >
                                    Pay ₹{amount}
                                </button>
                            </div>
                        </>
                    )}

                    {stage === "processing" && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div
                                className="h-12 w-12 rounded-full border-[3px] border-slate-200 dark:border-white/10 animate-spin"
                                style={{ borderTopColor: accent }}
                            />
                            <p className="text-[14px] font-semibold text-slate-700 dark:text-white">
                                Processing payment...
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-gray-400">
                                Verifying transaction (demo)
                            </p>
                        </div>
                    )}

                    {stage === "success" && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div
                                    className="flex h-14 w-14 items-center justify-center rounded-full"
                                    style={{ background: `${accent}20`, color: accent }}
                                >
                                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[18px] font-bold text-slate-900 dark:text-white">
                                        Payment confirmed
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-slate-500 dark:text-gray-400">
                                        ₹{amount} received &middot; this assessment is now ready to be taken whenever you choose to start.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-gray-500">
                                            Reference number
                                        </span>
                                        <span className="font-mono text-[14px] font-bold text-slate-900 dark:text-white truncate">
                                            {refId}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyRef}
                                        className="rounded-full border border-slate-200/70 dark:border-white/10 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/[0.06] transition-all"
                                        style={copied ? { color: accent, borderColor: `${accent}55` } : undefined}
                                    >
                                        {copied ? "Copied" : "Copy"}
                                    </button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-gray-400">
                                    <span>
                                        <span className="text-slate-400 dark:text-gray-500">Amount: </span>
                                        ₹{amount}
                                    </span>
                                    <span>
                                        <span className="text-slate-400 dark:text-gray-500">Paid at: </span>
                                        {paidAt ? paidAt.toLocaleString() : "—"}
                                    </span>
                                    <span>
                                        <span className="text-slate-400 dark:text-gray-500">Status: </span>
                                        <span style={{ color: accent }}>Confirmed</span>
                                    </span>
                                </div>
                            </div>

                            <p className="text-[12px] text-slate-500 dark:text-gray-400 leading-relaxed">
                                Save this reference number for your records. You can start the assessment from this page any time &mdash; we won&apos;t auto-launch it for you.
                            </p>

                            <button
                                type="button"
                                onClick={onSuccess}
                                className="self-stretch rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-md transition-all hover:opacity-95 active:scale-95"
                                style={{ background: accent, boxShadow: `0 8px 18px ${accent}40` }}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default PaymentModal;
