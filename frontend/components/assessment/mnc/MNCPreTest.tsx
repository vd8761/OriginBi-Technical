import React, { useEffect } from "react";

interface MNCPreTestProps {
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    accentColor?: string;
    gradient?: string;
    mode?: 'trial' | 'main';
    questions?: number | string;
    duration?: string;
    trialAttemptsLimit?: number;
    mainAttemptsLimit?: number;
    attemptsCount?: number;
}

const checklist = [
    "Focus on system design and algorithmic logic.",
    "Multiple choice questions with single correct answers.",
    "Timed sections for different technical domains.",
    "Do not navigate away from the test tab.",
];

const modules = [
    { title: "DSA", desc: "Algorithms & structures" },
    { title: "System Design", desc: "Architecture & scale" },
    { title: "CS Core", desc: "OS, DBMS, Networking" },
];

const MNCPreTest: React.FC<MNCPreTestProps> = ({ 
    onStart, 
    onClose,
    accentColor = '#6366f1',
    gradient = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    mode = 'main',
    questions = 40,
    duration = '50 min',
    trialAttemptsLimit = 5,
    mainAttemptsLimit = 2,
    attemptsCount: initialAttemptsCount
}) => {
    const [attemptsCount, setAttemptsCount] = React.useState<number>(initialAttemptsCount ?? 0);

    React.useEffect(() => {
        if (initialAttemptsCount !== undefined) {
            setAttemptsCount(initialAttemptsCount);
            return;
        }
        let active = true;
        const fetchStats = async () => {
            try {
                let activeEmail = "";
                const storedProfile = localStorage.getItem("originbi:user-profile");
                if (storedProfile) {
                    const parsed = JSON.parse(storedProfile);
                    if (parsed && parsed.email) {
                        activeEmail = parsed.email;
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
                const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : (process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000");
                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                const response = await fetch(`${API_BASE}/api/assessment/attempts-stats${emailParam}`);
                const json = await response.json();
                const data = json.data || json;
                if (active && data) {
                    const stats = data['mnc'] || { trial: 0, main: 0 };
                    setAttemptsCount(mode === 'trial' ? stats.trial : stats.main);
                }
            } catch (err) {
                console.error("Failed to load attempt stats in pretest:", err);
            }
        };
        fetchStats();
        return () => { active = false; };
    }, [mode, initialAttemptsCount]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const limit = mode === 'trial' ? trialAttemptsLimit : mainAttemptsLimit;
    const currentAttempt = attemptsCount + 1;

    const metrics = [
        { label: "Questions", value: String(questions) },
        { label: "Duration", value: duration },
        { label: "Format", value: "Multiple Choice" },
        { label: "Attempts", value: `${currentAttempt}/${limit}` },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                aria-hidden="true"
            />

            <section
                role="dialog"
                aria-modal="true"
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111a15]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-8 dark:border-white/10">
                    <div className="flex items-start gap-6">
                        <div 
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ background: gradient || accentColor }}
                        >
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    MNC Readiness
                                </h2>
                                {mode === 'trial' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 whitespace-nowrap">
                                        Trial Assessment
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-900 dark:text-white">
                                Engineering-focused evaluation of DSA, systems architecture, and core computer science.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-[#6366f1] hover:text-[#6366f1] dark:border-white/10"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                </header>

                <div className="overflow-y-auto p-6 sm:p-8">
                    <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
                        <div className="space-y-8 order-2 lg:order-1">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Core domains</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {modules.map((m) => (
                                        <div key={m.title} className="rounded-xl border border-[#6366f1]/10 bg-[#6366f1]/5 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-sm font-black uppercase tracking-wider text-[#6366f1] mb-1">{m.title}</p>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{m.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Test Protocol</h3>
                                <div className="space-y-3">
                                    {checklist.map((point) => (
                                        <div key={point} className="flex items-start gap-3">
                                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6366f1]" />
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <aside className="h-fit rounded-2xl border border-[#6366f1]/10 bg-[#6366f1]/[0.03] p-6 dark:border-white/10 dark:bg-white/5 order-1 lg:order-2">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366f1] mb-4">Session Stats</h3>
                            <div className="space-y-4">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 border-b border-[#6366f1]/10 pb-3 last:border-0 last:pb-0 dark:border-white/10">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{metric.label}</span>
                                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{metric.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-end sm:px-8 dark:border-white/10 dark:bg-transparent">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-900 hover:opacity-80 dark:text-white dark:hover:opacity-80 transition-all"
                    >
                        Go back
                    </button>
                    <button
                        type="button"
                        onClick={() => onStart(mode)}
                        className="rounded-lg bg-[#6366f1] px-10 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#4f46e5]"
                    >
                        Begin test
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default MNCPreTest;
