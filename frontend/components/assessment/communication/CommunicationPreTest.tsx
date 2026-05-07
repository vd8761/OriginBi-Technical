import React from "react";

interface CommunicationPreTestProps {
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    accentColor?: string;
    gradient?: string;
    mode?: 'trial' | 'main';
}

const metrics = [
    { label: "Tasks", value: "40" },
    { label: "Duration", value: "45 min" },
    { label: "Mode", value: "Audio + text" },
    { label: "Attempts", value: "1 out of 2" },
];

const checklist = [
    "Allow microphone access when the browser asks.",
    "Use headphones or a quiet room for speaking tasks.",
    "Keep audio playback enabled before beginning.",
    "Ensure all tasks are completed before submission.",
];

const skills = ["Listening", "Speaking", "Reading", "Writing"];

const CommunicationPreTest: React.FC<CommunicationPreTestProps> = ({ 
    onStart, 
    onClose,
    accentColor = '#1ED36A',
    gradient = 'linear-gradient(135deg, #1ED36A 0%, #1bb85c 100%)',
    mode = 'main'
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                className="absolute inset-0 bg-[#0f1712]/70 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close communication assessment intro"
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="communication-pretest-title"
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-brand-green/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:px-6 sm:py-5 dark:border-white/10">

                    <div className="flex items-start gap-5">
                        <div 
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg [&_svg]:h-7 [&_svg]:w-7"
                            style={{ background: gradient || accentColor }}
                        >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
                            </svg>
                        </div>
                        <div>

                            <h2 id="communication-pretest-title" className="text-xl font-bold leading-tight text-slate-900 dark:text-white tracking-tight sm:text-2xl">
                                Communication Assessment ({mode === 'trial' ? 'Trial' : 'Main'})
                            </h2>
                            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-500 dark:text-white/60 sm:text-sm">
                                Evaluate workplace communication through listening prompts, speaking responses, reading tasks, and writing exercises.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-green/10 text-[#17201b]/40 transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/10 dark:text-white/40"

                        aria-label="Close"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                    </button>
                </header>

                <div className="overflow-y-auto p-4 sm:p-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <div>
                            <h3 className="text-base font-bold text-[#17201b] dark:text-white">What this test covers</h3>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {skills.map((skill) => (
                                    <div key={skill} className="rounded-lg border border-brand-green/10 bg-brand-green/5 p-3 text-sm font-medium text-[#17201b] dark:border-white/10 dark:bg-white/5 dark:text-white">

                                        {skill}
                                    </div>
                                ))}
                            </div>

                            <h3 className="mt-5 text-base font-bold text-[#17201b] dark:text-white">Start checklist</h3>
                            <div className="mt-3 space-y-2.5">
                                {checklist.map((point) => (
                                    <div key={point} className="flex items-start gap-3">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-brand-green" />
                                        <p className="text-[13px] font-medium leading-5 text-[#17201b]/80 dark:text-white/80 sm:text-sm">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="rounded-lg border border-brand-green/10 bg-brand-green/5 p-4 dark:border-white/10 dark:bg-white/5">
                            <h3 className="text-sm font-bold text-[#17201b] dark:text-white">Session snapshot</h3>
                            <div className="mt-3 divide-y divide-brand-green/10 dark:divide-white/10">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                        <span className="text-sm font-medium text-[#17201b]/50 dark:text-white/50">{metric.label}</span>
                                        <strong className="text-sm font-bold text-[#17201b] dark:text-white">{metric.value}</strong>

                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 dark:border-white/10 dark:bg-[#111a15]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none dark:border-white/15 dark:bg-transparent dark:text-white"
                    >
                        Go back
                    </button>
                    <button
                        type="button"
                        onClick={() => onStart(mode)}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-green px-8 text-[13px] font-bold text-white transition hover:bg-[#1bb85c] active:scale-95"
                    >
                        Begin test
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default CommunicationPreTest;
