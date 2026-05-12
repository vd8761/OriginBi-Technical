import React, { useEffect } from "react";

interface RolePreTestProps {
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    accentColor?: string;
    gradient?: string;
    mode?: 'trial' | 'main';
    trialAttemptsLimit?: number;
    mainAttemptsLimit?: number;
    attemptsCount?: number;
}

const checklist = [
    "Focus on real-world scenario judgement.",
    "Choose the most optimal professional response.",
    "Technical concepts and soft skills are both tested.",
    "Do not refresh during the active session.",
];

const modules = [
    { title: "Conceptual", desc: "Role-specific knowledge" },
    { title: "Scenario", desc: "Judgement & logic" },
    { title: "Behavioral", desc: "Professional fit" },
];

const RolePreTest: React.FC<RolePreTestProps> = ({ 
    onStart, 
    onClose,
    accentColor = '#84cc16',
    gradient = 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
    mode = 'main',
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
                const API_BASE = process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000";
                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                const response = await fetch(`${API_BASE}/api/assessment/attempts-stats${emailParam}`);
                const json = await response.json();
                const data = json.data || json;
                if (active && data) {
                    const stats = data['role'] || { trial: 0, main: 0 };
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
        { label: "Questions", value: "30" },
        { label: "Duration", value: "45 min" },
        { label: "Role", value: "Software Eng." },
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Role Fit
                                </h2>
                                {mode === 'trial' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 whitespace-nowrap">
                                        Trial Assessment
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-900 dark:text-white">
                                Validating role-specific conceptual mastery and situational professional judgement.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-[#84cc16] hover:text-[#84cc16] dark:border-white/10"
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
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Competency map</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {modules.map((m) => (
                                        <div key={m.title} className="rounded-xl border border-[#84cc16]/10 bg-[#84cc16]/5 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-sm font-black uppercase tracking-wider text-[#84cc16] mb-1">{m.title}</p>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{m.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Instructions</h3>
                                <div className="space-y-3">
                                    {checklist.map((point) => (
                                        <div key={point} className="flex items-start gap-3">
                                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#84cc16]" />
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <aside className="h-fit rounded-2xl border border-[#84cc16]/10 bg-[#84cc16]/[0.03] p-6 dark:border-white/10 dark:bg-white/5 order-1 lg:order-2">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#84cc16] mb-4">Session Stats</h3>
                            <div className="space-y-4">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 border-b border-[#84cc16]/10 pb-3 last:border-0 last:pb-0 dark:border-white/10">
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
                        className="rounded-lg bg-[#84cc16] px-10 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#65a30d]"
                    >
                        Begin test
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default RolePreTest;
