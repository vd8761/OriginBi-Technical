"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "./Header";
import AptitudePreTest from "../assessment/aptitude/AptitudePreTest";
import CommunicationPreTest from "../assessment/communication/CommunicationPreTest";
import RolePreTest from "../assessment/role/RolePreTest";
import MNCPreTest from "../assessment/mnc/MNCPreTest";
import PaymentModal from "../payments/PaymentModal";
import LanguageSelectModal from "../payments/LanguageSelectModal";
import CodingPreTest from "../assessment/coding/CodingPreTest";
import { ArrowLeftIcon, LockIcon } from "../icons";
import {
    CODING_LANGUAGES,
    type ExamDetailData,
    type ExtendedExam,
    type CodingLanguage,
} from "@/lib/exams";
import {
    codingPaymentKey,
    usePaidAssessments,
    useCompletedAssessments,
    type PaymentKey,
} from "@/lib/payments";
import { ApiError, listAssignments, logoutUser, type Assignment } from "@/lib/api";
import { readableTextOn } from "@/lib/colors";
import { Loader2 } from "lucide-react";
import { useSession, isAdminRegisteredProfile } from "@/lib/contexts/SessionContext";
import { useDataHydration } from "@/lib/contexts/DataHydrationContext";

const TECH_API_BASE =
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "";

interface ExploreDetailViewProps {
    exam: ExtendedExam;
    detail: ExamDetailData;
}

type CodingLangStatus = "ready" | "completed" | "locked";

const codingStatusRank: Record<CodingLangStatus, number> = {
    ready: 0,
    completed: 1,
    locked: 2,
};

const ExploreDetailView: React.FC<ExploreDetailViewProps> = ({ exam, detail }) => {
    const router = useRouter();
    const { user } = useSession();
    const { isInitialized: isEntitlementsReady } = useDataHydration();
    const isAdminFree = isAdminRegisteredProfile(user);
    const { isPaid, markPaid, refreshPurchases } = usePaidAssessments();
    const { isCompleted } = useCompletedAssessments();
    const [serverAssignments, setServerAssignments] = useState<Assignment[]>([]);
    const [assignmentError, setAssignmentError] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);

    const refreshAssignments = useCallback(async () => {
        if (exam.id !== "coding") return;
        try {
            const data = await listAssignments();
            setServerAssignments(data.assignments);
            setAssignmentError("");
        } catch (err) {
            setAssignmentError(
                err instanceof ApiError
                    ? err.message
                    : "Unable to load backend assignments.",
            );
        }
    }, [exam.id]);

    useEffect(() => {
        const id = window.setTimeout(() => {
            void refreshAssignments();
        }, 0);
        return () => window.clearTimeout(id);
    }, [refreshAssignments]);

    const codingEntries = useMemo(() => {
        if (exam.id !== "coding") return [];
        return CODING_LANGUAGES
            .map((lang) => {
                const key = codingPaymentKey(lang.id);
                const assignment = serverAssignments.find((a) => a.assignmentRef === key);
                const paid =
                    isPaid(key) ||
                    (!!assignment &&
                        (assignment.status === "active" ||
                            assignment.status === "completed" ||
                            assignment.completed));
                const completed = !!assignment?.completed;
                const status: CodingLangStatus = completed
                    ? "completed"
                    : paid
                        ? "ready"
                        : "locked";
                return { lang, paid, completed, status, assignment };
            })
            .sort((a, b) => codingStatusRank[a.status] - codingStatusRank[b.status]);
    }, [exam.id, serverAssignments, isAdminFree, isPaid]);

    const codingSummary = useMemo(() => {
        const completed = codingEntries.filter((e) => e.status === "completed").length;
        const ready = codingEntries.filter((e) => e.status === "ready").length;
        const locked = codingEntries.filter((e) => e.status === "locked").length;
        return { completed, ready, locked };
    }, [codingEntries]);

    const [showAptitudeModal, setShowAptitudeModal] = useState(false);
    const [showCommunicationModal, setShowCommunicationModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showMncModal, setShowMncModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [assessmentMode, setAssessmentMode] = useState<"trial" | "main">("main");
    const [pendingCodingLang, setPendingCodingLang] = useState<CodingLanguage | null>(null);
    const [paymentTarget, setPaymentTarget] = useState<
        | { kind: "exam"; key: PaymentKey; title: string; subtitle: string; assessmentId?: number | string; assessmentCode?: string }
        | { kind: "coding"; key: PaymentKey; language: CodingLanguage; title: string; subtitle: string; assessmentId?: number | string; assessmentCode?: string }
        | null
    >(null);

    const [attemptsStats, setAttemptsStats] = useState<Record<string, { trial: number; main: number }>>({});

    useEffect(() => {
        let active = true;
        const fetchStats = async () => {
            try {
                let activeEmail = user?.email || "";
                if (!activeEmail) {
                    const storedProfile = localStorage.getItem("originbi:user-profile");
                    if (storedProfile) {
                        const parsed = JSON.parse(storedProfile);
                        if (parsed && parsed.email) {
                            activeEmail = parsed.email;
                        }
                    }
                }
                if (!activeEmail) {
                    const storedUser = localStorage.getItem("user");
                    if (storedUser) {
                        const parsed = JSON.parse(storedUser);
                        if (parsed && parsed.email) {
                            activeEmail = parsed.email;
                        }
                    }
                }

                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                if (TECH_API_BASE === undefined) return;
                const response = await fetch(`${TECH_API_BASE}/api/assessment/stats${emailParam}`);
                if (!response.ok) return;
                const json = await response.json();
                const data = json.data || json;
                if (json && data && active) {
                    setAttemptsStats(data);
                }
            } catch (err) {
                if (active) {
                    setAttemptsStats({});
                }
            }
        };

        fetchStats();
        return () => {
            active = false;
        };
    }, [user?.email]);

    const isReady = exam.available;
    const accent = exam.accentColor;
    const gradient = exam.gradient;

    const isCoding = exam.id === "coding";
    const examPaid = !isCoding && (isAdminFree || isPaid(exam.id as PaymentKey));
    
    const dbModule = exam.id === "communication" ? "grammar" : exam.id;
    const stats = attemptsStats[dbModule] || { trial: 0, main: 0 };
    const mainLimit = exam.mainAttemptsLimit ?? 2;
    const examCompleted = !isCoding && isCompleted(exam.id as PaymentKey) && stats.main >= mainLimit;
    const hasCodingEntitlement = codingEntries.some((entry) => entry.paid || entry.completed);

    const startNonCodingAssessment = () => {
        if (exam.id === "aptitude") setShowAptitudeModal(true);
        else if (exam.id === "communication") setShowCommunicationModal(true);
        else if (exam.id === "role") setShowRoleModal(true);
        else if (exam.id === "mnc") setShowMncModal(true);
    };

    const handlePrimaryClick = async () => {
        if (!isReady || isConnecting || (!isAdminFree && !isEntitlementsReady)) return;

        if (isCoding) {
            setShowLanguageModal(true);
            return;
        }

        // If already completed, redirect to dashboard to view results
        if (examCompleted) {
            router.push("/dashboard");
            return;
        }

        // examPaid is already true for admin-registered users (see definition),
        // so they will fall through to startNonCodingAssessment without ever
        // hitting the payment modal.
        if (examPaid) {
            setAssessmentMode("main");
            startNonCodingAssessment();
            return;
        }

        if (exam.price === 0 || !exam.price) {
            setIsConnecting(true);
            try {
                const email = user?.email || "candidate@originbi.com";
                const assessmentId = (exam as any).assessmentId || 1;
                const assessmentCode = exam.id;

                const orderRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/create-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        assessmentId,
                        assessmentCode,
                        amount: 0,
                    }),
                });
                if (!orderRes.ok) throw new Error("Failed to initialize free unlock.");

                const verifyRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/verify-payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        assessmentId,
                        assessmentCode,
                        razorpay_order_id: "free_bypass",
                        razorpay_payment_id: `pay_free_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                        razorpay_signature: "signature_free",
                        amount: 0,
                    }),
                });
                if (!verifyRes.ok) throw new Error("Failed to activate free assessment.");

                markPaid(exam.id as PaymentKey);
                refreshPurchases?.();
                setIsConnecting(false);

                setAssessmentMode("main");
                startNonCodingAssessment();
                return;
            } catch (err: any) {
                console.error("Free unlock failed:", err);
                setIsConnecting(false);
                alert(err?.message || "Failed to unlock free assessment.");
                return;
            }
        }

        setIsConnecting(true);
        setPaymentTarget({
            kind: "exam",
            key: exam.id as PaymentKey,
            title: `Pay for ${exam.title}`,
            subtitle: `One-time access. Unlocks the full ${exam.shortTitle} assessment for you.`,
            assessmentId: (exam as any).assessmentId,
            assessmentCode: exam.id,
        });
    };

    const handleLanguagePick = async (language: CodingLanguage) => {
        const key = codingPaymentKey(language.id);
        const assignment = serverAssignments.find((a) => a.assignmentRef === key);
        if (assignment?.completed) {
            setShowLanguageModal(false);
            return;
        }
        const isUnlocked =
            isPaid(key) ||
            assignment?.status === "active" ||
            assignment?.status === "completed" ||
            assignment?.completed;
        if (isUnlocked) {
            setShowLanguageModal(false);
            setPendingCodingLang(language);
            setAssignmentError("");
            return;
        }

        if (exam.price === 0 || !exam.price) {
            setIsConnecting(true);
            try {
                const email = user?.email || "candidate@originbi.com";
                const assessmentId = (exam as any).assessmentId || 1;

                const orderRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/create-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        assessmentId,
                        assessmentCode: key,
                        amount: 0,
                    }),
                });
                if (!orderRes.ok) throw new Error("Failed to initialize free unlock.");

                const verifyRes = await fetch(`${TECH_API_BASE}/api/assessment/purchase/verify-payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        assessmentId,
                        assessmentCode: key,
                        razorpay_order_id: "free_bypass",
                        razorpay_payment_id: `pay_free_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                        razorpay_signature: "signature_free",
                        amount: 0,
                    }),
                });
                if (!verifyRes.ok) throw new Error("Failed to activate free assessment.");

                await refreshAssignments();
                setShowLanguageModal(false);
                setIsConnecting(false);

                setAssessmentMode("main");
                setPendingCodingLang(language);
                return;
            } catch (err: any) {
                console.error("Free coding unlock failed:", err);
                setIsConnecting(false);
                alert(err?.message || "Failed to unlock free coding language.");
                return;
            }
        }
        setIsConnecting(true);
        setPaymentTarget({
            kind: "coding",
            key,
            language,
            title: `Pay for Coding (${language.name})`,
            subtitle: `Unlocks the coding assessment in ${language.name}. Each language is paid separately.`,
            assessmentId: (exam as any).assessmentId,
            assessmentCode: key,
        });
    };

    const handlePaymentSuccess = async () => {
        if (!paymentTarget) return;
        setIsConnecting(false);
        if (paymentTarget.kind === "coding") {
            try {
                await refreshAssignments();
                setShowLanguageModal(false);
                // After successful payment, take user to the assessment library
                router.push("/assessment?view=assessment");
                setAssignmentError("");
            } catch (err) {
                const message =
                    err instanceof ApiError
                        ? err.message
                        : "Payment recorded locally, but backend scheduling failed.";
                setAssignmentError(message);
                throw new Error(message);
            }
        } else {
            markPaid(paymentTarget.key);
            refreshPurchases?.();
            // After successful payment, take user to the assessment library
            router.push("/assessment?view=assessment");
        }
        setPaymentTarget(null);
    };

    const handleTrial = () => {
        if (!isReady) return;
        if (examCompleted) {
            router.push("/dashboard");
            return;
        }
        if (isCoding) {
            setAssessmentMode("trial");
            setShowLanguageModal(true);
            return;
        }
        setAssessmentMode("trial");
        startNonCodingAssessment();
    };

    const isCodingPaid = useCallback(
        (key: PaymentKey) =>
            isAdminFree ||
            isPaid(key) ||
            serverAssignments.some((a) => a.assignmentRef === key && (a.status === "active" || a.status === "completed" || a.completed)),
        [serverAssignments, isAdminFree, isPaid],
    );

    const isCodingCompleted = useCallback(
        (key: PaymentKey) => serverAssignments.some((a) => a.assignmentRef === key && a.completed),
        [serverAssignments],
    );

    const primaryLabel = (() => {
        if (isConnecting) return "Connecting...";
        if (!isReady) return "Coming Soon";
        if (!isAdminFree && !isEntitlementsReady) return "Checking Access...";
        if (isCoding) {
            if (hasCodingEntitlement) return "Pick Language & Start";
            return exam.price === 0 || !exam.price ? "Pick Language & Start" : "Pick Language & Pay";
        }
        if (examCompleted) return "View Results";
        if (examPaid) return "Start Assessment";
        return exam.price === 0 || !exam.price ? "Unlock for Free" : `Pay ₹${exam.price}`;
    })();

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f5fbf7] dark:bg-[#0f1712] font-sans transition-colors duration-500">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.10] dark:opacity-[0.06] assessment-grid" />
            </div>

            <Header
                currentView="explore"
                onNavigate={(view) => {
                    router.push(`/${view}`);
                }}
                onLogout={() => {
                    void logoutUser().finally(() => router.push("/"));
                }}
            />

            <main className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-32 pt-24 sm:px-6 lg:px-10">
                {/* Back to explore */}
                <button
                    type="button"
                    onClick={() => router.push("/explore")}
                    className="inline-flex items-center gap-2 self-start rounded-full bg-white/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 px-4 py-2 text-[12px] font-semibold text-black dark:text-white transition-all hover:border-[#1ED36A]/40 hover:text-black dark:hover:text-white"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to Explore
                </button>

                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#212824] p-8 sm:p-10 lg:p-12 shadow-sm">
                    <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ background: gradient }}
                    />

                    <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
                        <div
                            className="flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-lg [&_svg]:h-9 [&_svg]:w-9"
                            style={{ background: gradient }}
                        >
                            {exam.icon}
                        </div>

                        <div className="flex-1 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {isReady ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                        Ready
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                                        <LockIcon className="w-3 h-3" />
                                        Coming Soon
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                    {exam.difficulty}
                                </span>
                                {!isCoding && examCompleted && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                                        Completed
                                    </span>
                                )}
                                {!isCoding && examPaid && !examCompleted && (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border"
                                        style={{
                                            background: `${accent}15`,
                                            color: accent,
                                            borderColor: `${accent}33`,
                                        }}
                                    >
                                        Unlocked
                                    </span>
                                )}
                            </div>
                            <h1 className="text-[clamp(28px,3.4vw,42px)] font-bold text-black dark:text-white tracking-tight leading-[1.05]">
                                {exam.title}
                            </h1>
                            <p className="text-[15px] leading-relaxed text-black dark:text-white max-w-2xl">
                                {detail.focus}
                            </p>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
                        <Stat label="Questions" value={String(exam.questions)} />
                        <Stat label="Duration" value={exam.duration} />
                        <Stat label="Difficulty" value={exam.difficulty} />
                        <Stat
                            label={isCoding ? "Per language" : "Price"}
                            value={exam.price === 0 || !exam.price ? "Free" : `₹${exam.price}`}
                            accent={accent}
                        />
                    </div>

                    {isCoding && (
                        <div
                            className="mt-6 rounded-2xl border border-dashed p-4 text-[12.5px] leading-relaxed"
                            style={{
                                borderColor: `${accent}55`,
                                background: `${accent}0d`,
                                color: accent,
                            }}
                        >
                            <span className="font-bold uppercase tracking-wider">Note:</span>{" "}
                            <span className="text-black dark:text-white">
                                Coding is paid per language. Each language unlocks separately &mdash; you can come back and pay for another language any time.
                            </span>
                        </div>
                    )}
                    {isCoding && assignmentError && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                            {assignmentError}
                        </div>
                    )}
                </section>

                {/* Per-language status (coding only) */}
                {isCoding && (
                    <Section eyebrow="Your Languages" title="Languages and progress">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                {codingSummary.ready} ready
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                                {codingSummary.completed} completed
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: `${accent}18`, color: accent }}
                            >
                                {codingSummary.locked} unpaid
                            </span>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {codingEntries.map(({ lang, status }) => (
                                <CodingLanguageRow
                                    key={lang.id}
                                    lang={lang}
                                    status={status}
                                    price={exam.price}
                                    onAction={() => {
                                        if (status === "completed") return;
                                        if (status === "ready") {
                                            setPendingCodingLang(lang);
                                        } else {
                                            handleLanguagePick(lang);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {/* What this exam is about */}
                <Section eyebrow="About" title="What this assessment is about">
                    <p className="text-[14px] leading-relaxed text-black dark:text-white max-w-3xl">
                        {exam.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-5">
                        {exam.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-black dark:text-white"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </Section>

                {/* Skills assessed */}
                <Section eyebrow="Skills" title="What this assessment measures">
                    <div className="grid sm:grid-cols-2 gap-4">
                        {detail.skills.map((skill) => (
                            <div
                                key={skill.title}
                                className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#212824] p-5 transition-all hover:border-[#1ED36A]/30 shadow-xs"
                            >
                                <h4 className="text-[14px] font-bold text-black dark:text-white mb-1.5">
                                    {skill.title}
                                </h4>
                                <p className="text-[13px] leading-relaxed text-black dark:text-white">
                                    {skill.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Exam structure */}
                <Section eyebrow="Structure" title="How the assessment is organised">
                    <div className="flex flex-col gap-2.5">
                        {detail.sections.map((section, index) => (
                            <div
                                key={section.name}
                                className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#212824] p-4 shadow-xs"
                            >
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
                                    style={{ background: `${accent}15`, color: accent }}
                                >
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[14px] font-bold text-black dark:text-white">
                                        {section.name}
                                    </h4>
                                    <p className="text-[12.5px] text-black dark:text-white leading-relaxed">
                                        {section.detail}
                                    </p>
                                </div>
                                <span
                                    className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wider"
                                    style={{ background: `${accent}15`, color: accent }}
                                >
                                    {section.weight}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Outcomes */}
                <Section eyebrow="Outcomes" title="What you'll receive">
                    <div className="grid sm:grid-cols-2 gap-3">
                        {detail.outcomes.map((outcome) => (
                            <div key={outcome} className="flex items-start gap-3">
                                <div
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5"
                                    style={{ background: `${accent}25` }}
                                >
                                    <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke={accent}
                                        strokeWidth={3}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-[13.5px] text-black dark:text-white leading-relaxed">
                                    {outcome}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Requirements */}
                <Section eyebrow="Before You Start" title="What you'll need">
                    <ul className="flex flex-col gap-2.5">
                        {detail.requirements.map((req) => (
                            <li key={req} className="flex items-start gap-3 text-[13.5px] text-black dark:text-white leading-relaxed">
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                    style={{ background: accent }}
                                />
                                {req}
                            </li>
                        ))}
                    </ul>
                </Section>
            </main>

            {/* Sticky bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 dark:border-white/10 bg-white/85 dark:bg-[#0f1712]/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white [&_svg]:h-5 [&_svg]:w-5"
                            style={{ background: gradient }}
                        >
                            {exam.icon}
                        </div>
                        <div>
                            <p className="text-[12px] font-medium text-black dark:text-white">
                                {exam.shortTitle} &middot; {exam.duration} &middot; {exam.questions} Questions
                            </p>
                            <p className="text-[18px] font-bold text-black dark:text-white">
                                {exam.price === 0 || !exam.price ? "Free" : `₹${exam.price}`}
                                <span className="ml-2 text-[11px] font-medium uppercase tracking-wider text-black dark:text-white">
                                    {isCoding ? (hasCodingEntitlement || exam.price === 0 || !exam.price ? "available now" : "per language") : examPaid ? "available now" : (exam.price === 0 || !exam.price ? "free assessment" : "fixed price")}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {/* Trial only available after purchase */}
                        {isReady && (isCoding ? codingSummary.ready > 0 || codingSummary.completed > 0 : examPaid) && (
                            <button
                                type="button"
                                onClick={handleTrial}
                                className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-[12px] font-bold uppercase tracking-wider transition-all border-[#1ED36A]/40 text-[#1ED36A] hover:bg-[#1ED36A]/10 cursor-pointer"
                            >
                                Trial Assessment
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handlePrimaryClick}
                            disabled={!isReady || isConnecting || (!isAdminFree && !isEntitlementsReady)}
                            className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-[12px] font-bold uppercase tracking-wider transition-all ${isReady && !isConnecting
                                    && (isAdminFree || isEntitlementsReady)
                                    ? "bg-[#1ED36A] hover:bg-[#1bb85c] text-white active:scale-95 cursor-pointer shadow-md shadow-[#1ED36A]/30"
                                    : "bg-slate-100 dark:bg-white/[0.04] text-black dark:text-white cursor-not-allowed"
                                }`}
                        >
                            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {primaryLabel}
                        </button>
                    </div>
                </div>
            </div>

            {/* Pre-test gates */}
            {showAptitudeModal && (
                <AptitudePreTest
                    mode={assessmentMode}
                    onStart={(mode) => router.push(`/assessment/aptitude?mode=${mode}${exam.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ""}`)}
                    onClose={() => setShowAptitudeModal(false)}
                    questions={exam.questions}
                    duration={exam.duration}
                    requireCameraMic={Boolean((exam as any).requireCameraMic)}
                />
            )}
            {showCommunicationModal && (
                <CommunicationPreTest
                    mode={assessmentMode}
                    onStart={(mode) => router.push(`/assessment/communication?mode=${mode}${exam.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ""}`)}
                    onClose={() => setShowCommunicationModal(false)}
                    questions={exam.questions}
                    duration={exam.duration}
                />
            )}
            {showRoleModal && (
                <RolePreTest
                    mode={assessmentMode}
                    onStart={(mode) => router.push(`/assessment/role?mode=${mode}${exam.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ""}`)}
                    onClose={() => setShowRoleModal(false)}
                    questions={exam.questions}
                    duration={exam.duration}
                />
            )}
            {showMncModal && (
                <MNCPreTest
                    mode={assessmentMode}
                    onStart={(mode) => router.push(`/assessment/mnc?mode=${mode}${exam.assessmentCode ? `&assessmentCode=${encodeURIComponent(exam.assessmentCode)}` : ""}`)}
                    onClose={() => setShowMncModal(false)}
                    questions={exam.questions}
                    duration={exam.duration}
                />
            )}

            {showLanguageModal && (
                <LanguageSelectModal
                    accent={accent}
                    price={exam.price}
                    isPaid={isCodingPaid}
                    isCompleted={isCodingCompleted}
                    onClose={() => {
                        setShowLanguageModal(false);
                        setAssessmentMode("main");
                    }}
                    onPick={handleLanguagePick}
                />
            )}

            {pendingCodingLang && (
                <CodingPreTest
                    language={pendingCodingLang}
                    mode={assessmentMode}
                    onStart={(mode: 'trial' | 'main') => {
                        const langId = pendingCodingLang.id;
                        setPendingCodingLang(null);
                        setAssessmentMode("main");
                        router.push(`/assessment/coding?lang=${langId}&mode=${mode}`);
                    }}
                    onClose={() => {
                        setPendingCodingLang(null);
                        setAssessmentMode("main");
                    }}
                />
            )}

            {paymentTarget && (
                <PaymentModal
                    title={paymentTarget.title}
                    subtitle={paymentTarget.subtitle}
                    amount={exam.price}
                    accent={accent}
                    assessmentId={paymentTarget.assessmentId}
                    assessmentCode={paymentTarget.assessmentCode}
                    onCancel={() => {
                        setPaymentTarget(null);
                        setIsConnecting(false);
                    }}
                    onSuccess={() => {
                        setIsConnecting(false);
                        return handlePaymentSuccess();
                    }}
                />
            )}
        </div>
    );
};

interface CodingLanguageRowProps {
    lang: CodingLanguage;
    status: CodingLangStatus;
    price: number;
    onAction: () => void;
}

const CodingLanguageRow: React.FC<CodingLanguageRowProps> = ({ lang, status, price, onAction }) => {
    const statusBadge =
        status === "completed" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                Completed
            </span>
        ) : status === "ready" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Ready to start
            </span>
        ) : (
            <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `${lang.accent}18`, color: lang.accent }}
            >
                ₹{price}
            </span>
        );

    const ctaLabel =
        status === "completed" ? "Completed" : status === "ready" ? "Start" : "Pay & Unlock";

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#212824] p-4 shadow-xs">
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
            <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-black dark:text-white">{lang.name}</p>
                    {statusBadge}
                </div>
                <p className="text-[11.5px] text-black dark:text-white truncate">
                    {lang.description}
                </p>
            </div>
            <button
                type="button"
                onClick={onAction}
                disabled={status === "completed"}
                className="shrink-0 rounded-full px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider transition-all active:scale-95 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                    background: status === "locked" ? `${lang.accent}18` : lang.accent,
                    color: status === "locked" ? lang.accent : readableTextOn(lang.accent),
                }}
            >
                {ctaLabel}
            </button>
        </div>
    );
};

const Stat: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
    <div className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#212824] p-4 shadow-xs">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-black dark:text-white mb-1.5">
            {label}
        </p>
        <p
            className="text-[18px] font-bold text-black dark:text-white"
            style={accent ? { color: accent } : undefined}
        >
            {value}
        </p>
    </div>
);

const Section: React.FC<{ eyebrow: string; title: string; children: React.ReactNode }> = ({ eyebrow, title, children }) => (
    <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                {eyebrow}
            </span>
            <h2 className="text-[22px] font-bold text-black dark:text-white tracking-tight">
                {title}
            </h2>
        </div>
        {children}
    </section>
);

export default ExploreDetailView;
