import React from "react";

interface CommunicationPreTestProps {
    onStart: () => void;
    onClose: () => void;
}

const metrics = [
    { label: "Tasks", value: "40" },
    { label: "Duration", value: "45 min" },
    { label: "Mode", value: "Audio + text" },
];

const checklist = [
    "Allow microphone access when the browser asks.",
    "Use headphones or a quiet room for speaking tasks.",
    "Keep audio playback enabled before beginning.",
    "Do not refresh the page during recording or writing tasks.",
];

const skills = ["Listening", "Speaking", "Reading", "Writing"];

const CommunicationPreTest: React.FC<CommunicationPreTestProps> = ({ onStart, onClose }) => {
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
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 dark:border-white/10">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-brand-green">Ready assessment</p>
                            <h2 id="communication-pretest-title" className="mt-1 text-2xl font-extrabold leading-tight text-[#17201b] dark:text-white">
                                Communication Assessment
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Evaluate workplace communication through listening prompts, speaking responses, reading tasks, and writing exercises.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/10 dark:text-slate-300"
                        aria-label="Close"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                    </button>
                </header>

                <div className="overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <div>
                            <h3 className="text-base font-extrabold text-[#17201b] dark:text-white">What this test covers</h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {skills.map((skill) => (
                                    <div key={skill} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-[#17201b] dark:border-white/10 dark:bg-white/5 dark:text-white">
                                        {skill}
                                    </div>
                                ))}
                            </div>

                            <h3 className="mt-6 text-base font-extrabold text-[#17201b] dark:text-white">Start checklist</h3>
                            <div className="mt-4 space-y-3">
                                {checklist.map((point) => (
                                    <div key={point} className="flex items-start gap-3">
                                        <span className="mt-2 h-2 w-2 shrink-0 rounded-sm bg-brand-green" />
                                        <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <h3 className="text-sm font-extrabold text-[#17201b] dark:text-white">Session snapshot</h3>
                            <div className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{metric.label}</span>
                                        <strong className="text-sm text-[#17201b] dark:text-white">{metric.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/15 dark:text-white"
                    >
                        Go back
                    </button>
                    <button
                        type="button"
                        onClick={onStart}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-green px-6 text-sm font-extrabold text-[#0f1712] transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                    >
                        Begin test
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default CommunicationPreTest;
