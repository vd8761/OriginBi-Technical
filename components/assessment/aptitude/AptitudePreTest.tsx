import React from "react";

interface AptitudePreTestProps {
    onStart: () => void;
    onClose: () => void;
}

const metrics = [
    { label: "Questions", value: "60" },
    { label: "Duration", value: "60 min" },
    { label: "Sections", value: "4" },
    { label: "Attempts", value: "1 out of 2" },
];

const checklist = [
    "Keep one uninterrupted 60 minute window ready.",
    "Use a laptop or desktop for the most stable test layout.",
    "Avoid refreshing the browser after the assessment begins.",
    "Submit only when you are confident with your selected answers.",
];

const skills = ["Quantitative", "Logical", "Data interpretation", "Abstract reasoning"];

const AptitudePreTest: React.FC<AptitudePreTestProps> = ({ onStart, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
            <button
                type="button"
                className="absolute inset-0 bg-[#0f1712]/70 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close aptitude assessment intro"
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="aptitude-pretest-title"
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-brand-green/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#111a15]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-brand-green/5 p-5 sm:p-6 dark:border-white/10">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-brand-green">Ready assessment</p>
                            <h2 id="aptitude-pretest-title" className="mt-1 text-2xl font-bold leading-tight text-[#17201b] dark:text-white">
                                Aptitude Assessment
                            </h2>
                            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[#17201b]/60 dark:text-white/60">
                                Benchmark problem-solving speed, numerical accuracy, logical reasoning, and data interpretation in one structured session.
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

                <div className="overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <div>
                            <h3 className="text-base font-bold text-[#17201b] dark:text-white">What this test covers</h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {skills.map((skill) => (
                                    <div key={skill} className="rounded-lg border border-brand-green/10 bg-brand-green/5 p-3 text-sm font-medium text-[#17201b] dark:border-white/10 dark:bg-white/5 dark:text-white">
                                        {skill}
                                    </div>
                                ))}
                            </div>

                            <h3 className="mt-6 text-base font-bold text-[#17201b] dark:text-white">Start checklist</h3>
                            <div className="mt-4 space-y-3">
                                {checklist.map((point) => (
                                    <div key={point} className="flex items-start gap-3">
                                        <span className="mt-2 h-2 w-2 shrink-0 rounded-sm bg-brand-green" />
                                        <p className="text-sm font-medium leading-6 text-[#17201b]/80 dark:text-white/80">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="rounded-lg border border-brand-green/10 bg-brand-green/5 p-4 dark:border-white/10 dark:bg-white/5">
                            <h3 className="text-sm font-bold text-[#17201b] dark:text-white">Session snapshot</h3>
                            <div className="mt-4 divide-y divide-brand-green/10 dark:divide-white/10">
                                {metrics.map((metric) => (
                                    <div key={metric.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                        <span className="text-sm font-medium text-[#17201b]/50 dark:text-white/50">{metric.label}</span>
                                        <strong className="text-sm font-bold text-[#17201b] dark:text-white">{metric.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-brand-green/5 bg-brand-green/5 p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-green/20 bg-white px-5 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-white/15 dark:bg-transparent dark:text-white"
                    >
                        Go back
                    </button>
                    <button
                        type="button"
                        onClick={onStart}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-green px-6 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                    >
                        Begin test
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default AptitudePreTest;
