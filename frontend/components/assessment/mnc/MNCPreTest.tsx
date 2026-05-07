import React from "react";

interface MNCPreTestProps {
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    accentColor?: string;
    gradient?: string;
    mode?: 'trial' | 'main';
}

const metrics = [
    { label: "Questions", value: "40" },
    { label: "Duration", value: "50 min" },
    { label: "Format", value: "Multiple Choice" },
    { label: "Attempts", value: "1 out of 1" },
];

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
    mode = 'main'
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                className="absolute inset-0 bg-[#0f1712]/70 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close"
            />

            <section
                role="dialog"
                aria-modal="true"
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-[#6366f1]/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111a15]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-8 dark:border-white/10">
                    <div className="flex items-start gap-6">
                        <div 
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                            style={{ background: gradient || accentColor }}
                        >
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    MNC Readiness
                                </h2>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${mode === 'trial' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {mode} Mode
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-white/60">
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
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Core domains</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {modules.map((m) => (
                                        <div key={m.title} className="rounded-2xl border border-[#6366f1]/10 bg-[#6366f1]/5 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-sm font-black uppercase tracking-wider text-[#6366f1] mb-1">{m.title}</p>
                                            <p className="text-xs font-bold text-slate-600 dark:text-white/50">{m.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Test Protocol</h3>
                                <div className="space-y-3">
                                    {checklist.map((point) => (
                                        <div key={point} className="flex items-start gap-3">
                                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                            <p className="text-sm font-medium text-slate-600 dark:text-white/70">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <aside className="h-fit rounded-3xl border border-[#6366f1]/10 bg-[#6366f1]/[0.03] p-6 dark:border-white/10 dark:bg-white/5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#6366f1] mb-4">Overview</h3>
                            <div className="space-y-4">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 border-b border-[#6366f1]/10 pb-3 last:border-0 last:pb-0 dark:border-white/10">
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/40">{metric.label}</span>
                                        <strong className="text-sm font-black text-slate-900 dark:text-white">{metric.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-end sm:px-8 dark:border-white/10 dark:bg-transparent">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all"
                    >
                        Go back
                    </button>
                    <button
                        type="button"
                        onClick={() => onStart(mode)}
                        className="rounded-full bg-[#6366f1] px-10 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#6366f1]/20 transition-all hover:scale-105 hover:bg-[#4f46e5] active:scale-95"
                    >
                        Begin test
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default MNCPreTest;
