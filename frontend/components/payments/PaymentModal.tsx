"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/contexts/SessionContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

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

type Stage = "processing" | "success" | "error";
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
    const [stage, setStage] = useState<Stage>("processing");
    const [refId, setRefId] = useState(generateRef);
    const [paidAt, setPaidAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const successHandledRef = useRef(false);
    const paymentInitiatedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        // Pre-load Razorpay script
        const scriptId = "razorpay-checkout-js";
        if (!document.getElementById(scriptId)) {
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        }

        // Trigger payment automatically on mount
        if (!paymentInitiatedRef.current) {
            paymentInitiatedRef.current = true;
            handlePay();
        }

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handlePay = async () => {
        if (successHandledRef.current) return;
        setStage("processing");
        setErrorMessage(null);

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

            const orderPromise = fetch(`${TECH_API_BASE}/api/assessment/purchase/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    assessmentId: assessmentId || 1,
                    assessmentCode: assessmentCode || "general",
                    amount,
                }),
            });

            const orderRes = await orderPromise;
            if (!orderRes.ok) throw new Error("Gateway failed to issue order.");
            const order = await orderRes.json();

            // Check if Razorpay is explicitly disabled in client environment (already declared above)

            if (isRazorpayDisabled) {
                // Directly call backend to verify and record mock sandbox payment
                const verifyRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/verify-payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        assessmentId: assessmentId || 1,
                        assessmentCode: assessmentCode || "general",
                        razorpay_order_id: order.orderId,
                        razorpay_payment_id: `pay_sandbox_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                        razorpay_signature: "signature_mock",
                        amount,
                    }),
                });

                if (!verifyRes.ok) {
                    throw new Error("Sandbox payment recording failed on backend.");
                }

                await onSuccess();
                successHandledRef.current = true;
                if (mountedRef.current) {
                    setRefId(`SANDBOX-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
                    setPaidAt(new Date());
                    setStage("success");
                }
                return;
            }

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

                            if (!verifyRes.ok) throw new Error("Signature mismatch.");

                            await onSuccess();
                            successHandledRef.current = true;
                            if (mountedRef.current) {
                                setRefId(response.razorpay_payment_id || generateRef());
                                setPaidAt(new Date());
                                setStage("success");
                            }
                        } catch (err: any) {
                            if (mountedRef.current) {
                                setErrorMessage(err.message || "Verification failed.");
                                setStage("error");
                            }
                        }
                    },
                    modal: {
                        onDismiss: () => {
                            if (mountedRef.current && !successHandledRef.current) {
                                // If they cancel the Razorpay modal, close our modal too
                                onCancel();
                            }
                        },
                    },
                    prefill: {
                        name: user?.name || "Candidate",
                        email: email,
                    },
                    theme: { color: accent },
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            };

            if ((window as any).Razorpay) {
                openGateway();
            } else {
                const checkInterval = setInterval(() => {
                    if ((window as any).Razorpay) {
                        clearInterval(checkInterval);
                        openGateway();
                    }
                }, 100);
                setTimeout(() => clearInterval(checkInterval), 10000);
            }
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
            if (mountedRef.current) {
                setErrorMessage(err.message || "Failed to start payment.");
                setStage("error");
            }
        }
    };

    const handleCopyRef = () => {
        if (typeof navigator !== "undefined") {
            navigator.clipboard?.writeText(refId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // During processing, render nothing — Razorpay opens directly over the page
    if (stage === "processing") return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0a0f0d]/80 backdrop-blur-xl"
            />

            <motion.section
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#111a15]/90 shadow-[0_32px_128px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            >
                <div className="absolute top-0 left-0 right-0 h-1.5 opacity-50" style={{ background: accent }} />

                <div className="relative p-8">
                    <AnimatePresence mode="wait">
                        {stage === "error" && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-8 text-center"
                            >
                                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-500">
                                    <AlertCircle size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                                <p className="text-red-400/80 text-sm mb-8 px-4">
                                    {errorMessage || "The transaction could not be initialized at this moment."}
                                </p>
                                <div className="flex w-full gap-3">
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold text-gray-400 transition-colors hover:bg-white/10"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={handlePay}
                                        className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                                        style={{ background: accent }}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {stage === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col"
                            >
                                <div className="mb-8 flex items-center justify-center">
                                    <div 
                                        className="flex h-20 w-20 items-center justify-center rounded-full shadow-[0_0_40px_rgba(30,211,106,0.2)]"
                                        style={{ background: `${accent}15`, color: accent }}
                                    >
                                        <CheckCircle2 size={44} />
                                    </div>
                                </div>
                                
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-white mb-2">Purchase Successful</h3>
                                    <p className="text-gray-400 text-sm px-4">
                                        Assessment unlocked. You can now start the test from your dashboard.
                                    </p>
                                </div>

                                <div className="mb-8 rounded-2xl bg-white/[0.03] p-5 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                            Receipt Reference
                                        </span>
                                        <button 
                                            onClick={handleCopyRef}
                                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
                                        >
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                            {copied ? "Copied" : "Copy ID"}
                                        </button>
                                    </div>
                                    <div className="font-mono text-lg font-bold text-white/90 break-all">
                                        {refId}
                                    </div>
                                </div>

                                <button
                                    onClick={onCancel}
                                    className="w-full rounded-2xl py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl transition-transform active:scale-[0.98]"
                                    style={{ background: accent }}
                                >
                                    Proceed to Library
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.section>
        </div>
    );
};

export default PaymentModal;
