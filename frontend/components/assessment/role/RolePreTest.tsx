import React from "react";

interface RolePreTestProps {
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    accentColor?: string;
    gradient?: string;
    mode?: 'trial' | 'main';
}

const metrics = [
    { label: "Questions", value: "30" },
    { label: "Duration", value: "45 min" },
    { label: "Role", value: "Software Eng." },
    { label: "Attempts", value: "1 out of 1" },
];

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
    mode = 'main'
}) => {
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
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Role Fit
                                </h2>
                                {mode === 'trial' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                        Trial Assessment
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-white/60">
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
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Competency map</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {modules.map((m) => (
                                        <div key={m.title} className="rounded-xl border border-[#84cc16]/10 bg-[#84cc16]/5 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-sm font-black uppercase tracking-wider text-[#84cc16] mb-1">{m.title}</p>
                                            <p className="text-xs font-bold text-slate-600 dark:text-white/50">{m.desc}</p>
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
                                            <p className="text-sm font-medium text-slate-600 dark:text-white/70">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <aside className="h-fit rounded-2xl border border-[#84cc16]/10 bg-[#84cc16]/[0.03] p-6 dark:border-white/10 dark:bg-white/5">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#84cc16] mb-4">Overview</h3>
                            <div className="space-y-4">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 border-b border-[#84cc16]/10 pb-3 last:border-0 last:pb-0 dark:border-white/10">
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/40">{metric.label}</span>
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
                        className="px-8 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all"
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
