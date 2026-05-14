"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/contexts/SessionContext";

interface PaymentModalProps {
    title: string;
    subtitle?: string;
    amount: number;
    accent?: string;
    assessmentId?: number | string;
    assessmentCode?: string;
    onCancel: () => void;
    onSuccess: () => void | Promise<void>;
}

type Stage = "review" | "processing" | "success" | "error";
const TECH_API_BASE =
    process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
    "";

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
    assessmentId,
    assessmentCode,
    onCancel,
    onSuccess,
}) => {
    const { user } = useSession();
    const [stage, setStage] = useState<Stage>("review");
    const [refId, setRefId] = useState(generateRef);
    const [paidAt, setPaidAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const successHandledRef = useRef(false);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handlePay = async () => {
        if (stage !== "review" || successHandledRef.current) return;
        setStage("processing");
        setErrorMessage(null);

        // Fallback email if no logged-in user is found
        const email = user?.email || "candidate@originbi.com";
        const isRazorpayDisabled = process.env.NEXT_PUBLIC_RAZORPAY === "false";

        try {
            // Frontend-only sandbox mode: bypass backend order creation entirely.
            if (isRazorpayDisabled) {
                await onSuccess();
                successHandledRef.current = true;
                if (mountedRef.current) {
                    setRefId(`SANDBOX-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
                    setPaidAt(new Date());
                    setStage("success");
                }
                return;
            }

            // 1. Create Razorpay order on backend
            const orderRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    assessmentId: assessmentId || 1,
                    assessmentCode: assessmentCode || "general",
                    amount,
                }),
            });

            if (!orderRes.ok) {
                throw new Error("Failed to create purchase order on server.");
            }

            const order = await orderRes.json();

            // 2. Load Razorpay script dynamically
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;

            script.onload = () => {
                const options = {
                    key: order.keyId,
                    amount: order.amount,
                    currency: order.currency,
                    name: "OriginBI",
                    description: `Technical Assessment - ${title}`,
                    order_id: order.orderId,
                    handler: async (response: any) => {
                        setStage("processing");
                        try {
                            // 3. Verify payment signature on backend
                            const verifyRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/verify-payment`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    email,
                                    assessmentId: assessmentId || 1,
                                    assessmentCode: assessmentCode || "general",
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    amount,
                                }),
                             });

                            if (!verifyRes.ok) {
                                throw new Error("Payment signature verification failed.");
                            }

                            await onSuccess();
                            successHandledRef.current = true;
                            if (mountedRef.current) {
                                setRefId(response.razorpay_payment_id || generateRef());
                                setPaidAt(new Date());
                                setStage("success");
                            }
                        } catch (err: any) {
                            console.error("Verification error:", err);
                            if (mountedRef.current) {
                                setErrorMessage(err.message || "Failed to verify payment with server.");
                                setStage("error");
                            }
                        }
                    },
                    modal: {
                        onDismiss: () => {
                            if (mountedRef.current) setStage("review");
                        },
                    },
                    prefill: {
                        name: user?.name || "Candidate",
                        email: email,
                        contact: user?.mobile_number || "",
                    },
                    theme: {
                        color: accent,
                    },
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            };

            script.onerror = () => {
                throw new Error("Failed to load secure Razorpay checkout gateway.");
            };

            document.body.appendChild(script);
        } catch (err: any) {
            const message = err?.message || "";
            const isNetworkFailure =
                err instanceof TypeError ||
                /failed to fetch|networkerror|err_connection_refused/i.test(message);
            if (isNetworkFailure) {
                if (mountedRef.current) {
                    setErrorMessage("Payment service is unavailable right now. Start the assessment backend or use sandbox mode.");
                    setStage("error");
                }
                return;
            }
            console.error("Payment flow failed:", err);
            if (mountedRef.current) {
                setErrorMessage(err.message || "Unable to initiate payment.");
                setStage("error");
            }
        }
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
                onClick={stage === "review" || stage === "error" ? onCancel : undefined}
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
                                    Secure Payment Gateway
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
                                <p className="mt-2 text-[11.5px] text-slate-400 dark:text-gray-500 leading-relaxed">
                                    Includes instant lifetime access to the test. Our secure payment gateway ensures your transaction is protected.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 text-[12.5px] text-slate-500 dark:text-gray-400">
                                <p className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                                    One-time purchase, no recurring fees.
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                                    After checkout, the assessment unlocks on your dashboard.
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
                                    className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-md transition-all hover:opacity-95 active:scale-95 animate-pulse"
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
                                Connecting to checkout gateway...
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-gray-400">
                                Setting up secure transaction session.
                            </p>
                        </div>
                    )}

                    {stage === "error" && (
                        <div className="flex flex-col gap-5 py-4">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">
                                    Transaction Failed
                                </h3>
                                <p className="text-[12.5px] text-slate-500 dark:text-gray-400 leading-relaxed">
                                    {errorMessage || "An unexpected error occurred during payment processing."}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end mt-4">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="rounded-full border border-slate-200/70 dark:border-white/10 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePay}
                                    className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-md transition-all"
                                    style={{ background: accent }}
                                >
                                    Retry Payment
                                </button>
                            </div>
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
                                Save this reference number for your records. The assessment has been scheduled and is ready now.
                            </p>

                            <button
                                type="button"
                                onClick={onCancel}
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
