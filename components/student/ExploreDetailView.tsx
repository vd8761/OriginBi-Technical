"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import AptitudePreTest from "../assessment/aptitude/AptitudePreTest";
import CommunicationPreTest from "../assessment/communication/CommunicationPreTest";
import RolePreTest from "../assessment/role/RolePreTest";
import { ArrowLeftIcon, LockIcon } from "../icons";
import {
    type AssessmentId,
    type ExamDetailData,
    type ExtendedExam,
} from "@/lib/exams";

interface ExploreDetailViewProps {
    exam: ExtendedExam;
    detail: ExamDetailData;
}

const ExploreDetailView: React.FC<ExploreDetailViewProps> = ({ exam, detail }) => {
    const router = useRouter();
    const [showAptitudeModal, setShowAptitudeModal] = useState(false);
    const [showCommunicationModal, setShowCommunicationModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);

    const isReady = exam.available;
    const accent = exam.accentColor;
    const gradient = exam.gradient;

    const handleStart = () => {
        if (!isReady) return;
        if (exam.id === "aptitude") setShowAptitudeModal(true);
        else if (exam.id === "communication") setShowCommunicationModal(true);
        else if (exam.id === "role") setShowRoleModal(true);
    };

    const handleTrial = () => {
        // Placeholder: trial assessment is not wired up yet.
        if (!isReady) return;
        alert("Trial assessment coming soon.");
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f5fbf7] dark:bg-[#0f1712] font-sans transition-colors duration-500">
            <div className="fixed inset-0 pointer-events-none">
                <div
                    className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[100px] opacity-70"
                    style={{ background: `radial-gradient(circle, ${accent}33, transparent 70%)` }}
                />
                <div className="absolute inset-0 opacity-[0.10] dark:opacity-[0.06] assessment-grid" />
            </div>

            <Header
                currentView="explore"
                onNavigate={(view) => {
                    if (view === "explore") {
                        router.push("/");
                    } else {
                        router.push(`/?view=${view}`);
                    }
                }}
                onLogout={() => console.log("Logging out...")}
            />

            <main className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-32 pt-24 sm:px-6 lg:px-10">
                {/* Back to explore */}
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="inline-flex items-center gap-2 self-start rounded-full bg-white/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 px-4 py-2 text-[12px] font-semibold text-slate-600 dark:text-gray-300 transition-all hover:border-[#1ED36A]/40 hover:text-slate-900 dark:hover:text-white"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to Explore
                </button>

                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10 lg:p-12">
                    <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ background: gradient }}
                    />
                    <div className="absolute -top-16 right-0 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none"
                        style={{ background: accent }}
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
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        <LockIcon className="w-3 h-3" />
                                        Coming Soon
                                    </span>
                                )}
                                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                    {exam.difficulty}
                                </span>
                            </div>
                            <h1 className="text-[clamp(28px,3.4vw,42px)] font-bold text-slate-900 dark:text-white tracking-tight leading-[1.05]">
                                {exam.title}
                            </h1>
                            <p className="text-[15px] leading-relaxed text-slate-600 dark:text-gray-300 max-w-2xl">
                                {detail.focus}
                            </p>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
                        <Stat label="Questions" value={String(exam.questions)} />
                        <Stat label="Duration" value={exam.duration} />
                        <Stat label="Difficulty" value={exam.difficulty} />
                        <Stat label="Price" value={`₹${exam.price}`} accent={accent} />
                    </div>
                </section>

                {/* What this exam is about */}
                <Section eyebrow="About" title="What this assessment is about">
                    <p className="text-[14px] leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl">
                        {exam.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-5">
                        {exam.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-gray-300"
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
                                className="rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] p-5 transition-all hover:border-[#1ED36A]/30"
                            >
                                <h4 className="text-[14px] font-bold text-slate-900 dark:text-white mb-1.5">
                                    {skill.title}
                                </h4>
                                <p className="text-[13px] leading-relaxed text-slate-500 dark:text-gray-400">
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
                                className="flex items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] p-4"
                            >
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
                                    style={{ background: `${accent}15`, color: accent }}
                                >
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">
                                        {section.name}
                                    </h4>
                                    <p className="text-[12.5px] text-slate-500 dark:text-gray-400 leading-relaxed">
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
                                <span className="text-[13.5px] text-slate-600 dark:text-gray-300 leading-relaxed">
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
                            <li key={req} className="flex items-start gap-3 text-[13.5px] text-slate-600 dark:text-gray-300 leading-relaxed">
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
                            <p className="text-[12px] font-medium text-slate-500 dark:text-gray-400">
                                {exam.shortTitle} &middot; {exam.duration} &middot; {exam.questions} Questions
                            </p>
                            <p className="text-[18px] font-bold text-slate-900 dark:text-white">
                                ₹{exam.price}
                                <span className="ml-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-gray-500">
                                    fixed price
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={handleTrial}
                            disabled={!isReady}
                            className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-[12px] font-bold uppercase tracking-wider transition-all ${isReady
                                    ? "border-[#1ED36A]/40 text-[#1ED36A] hover:bg-[#1ED36A]/10 cursor-pointer"
                                    : "border-slate-200 dark:border-white/10 text-slate-400 dark:text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            Trial Assessment
                        </button>
                        <button
                            type="button"
                            onClick={handleStart}
                            disabled={!isReady}
                            className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-[12px] font-bold uppercase tracking-wider transition-all ${isReady
                                    ? "bg-[#1ED36A] hover:bg-[#1bb85c] text-white active:scale-95 cursor-pointer shadow-md shadow-[#1ED36A]/30"
                                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            {isReady ? "Start Assessment" : "Coming Soon"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Pre-test gates */}
            {showAptitudeModal && (
                <AptitudePreTest
                    onStart={() => router.push("/assessment/aptitude")}
                    onClose={() => setShowAptitudeModal(false)}
                />
            )}
            {showCommunicationModal && (
                <CommunicationPreTest
                    onStart={() => router.push("/assessment/communication")}
                    onClose={() => setShowCommunicationModal(false)}
                />
            )}
            {showRoleModal && (
                <RolePreTest
                    onStart={() => router.push("/assessment/role")}
                    onClose={() => setShowRoleModal(false)}
                />
            )}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-gray-500 mb-1.5">
            {label}
        </p>
        <p
            className="text-[18px] font-bold text-slate-900 dark:text-white"
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
            <h2 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
            </h2>
        </div>
        {children}
    </section>
);

export default ExploreDetailView;
