import React from 'react';

interface RolePreTestProps {
    onStart: () => void;
    onClose: () => void;
}

const CustomTimeIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CustomBriefcaseIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const RolePreTest: React.FC<RolePreTestProps> = ({ onStart, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-brand-dark-primary/60 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white dark:bg-brand-dark-primary rounded-3xl shadow-2xl border border-brand-light-tertiary dark:border-white/10 flex flex-col max-h-[90vh] animate-notice-pop overflow-hidden transition-colors duration-300">
                <div className="overflow-y-auto custom-scrollbar flex-1 p-6 sm:p-8">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] sm:text-xs text-black dark:text-white font-medium max-w-[250px] leading-relaxed uppercase tracking-wider">
                            Domain Specific Evaluation
                        </p>
                    </div>

                    <h2 className="text-[clamp(18px,2vw,28px)] font-semibold text-black dark:text-white mb-2 leading-tight tracking-tight">
                        Role-Based Assessment
                    </h2>

                    <p className="text-black dark:text-white text-[clamp(11px,0.9vw,14px)] leading-relaxed mb-6 font-medium">
                        Evaluate your conceptual knowledge and practical decision-making ability through real-world scenarios tailored to your target role.
                    </p>

                    {/* Meta Info Box */}
                    <div className="bg-brand-light-primary dark:bg-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 border border-brand-light-tertiary dark:border-white/5 mb-6">
                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                                <CustomBriefcaseIcon />
                            </div>
                            <span className="text-[clamp(11px,0.9vw,14px)] font-medium text-black dark:text-white">
                                Total of <strong className="text-black dark:text-white font-bold">20 Questions</strong>
                            </span>
                        </div>

                        <div className="w-full h-px sm:w-px sm:h-10 bg-brand-light-tertiary dark:bg-white/10 block"></div>

                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                                <CustomTimeIcon />
                            </div>
                            <span className="text-[clamp(11px,0.9vw,14px)] font-medium text-black dark:text-white">
                                Allotted time is <strong className="text-black dark:text-white font-bold">30 Minutes</strong>
                            </span>
                        </div>
                    </div>

                    <h4 className="text-black dark:text-white font-bold mb-3 text-[clamp(12px,1vw,15px)]">Assessment Structure</h4>
                    <ul className="space-y-3 mb-2">
                        {[
                            "Conceptual MCQs: Single-answer questions testing fundamental knowledge, frameworks, and best practices.",
                            "Scenario-Based Questions: Simulated real-world incidents requiring practical problem-solving.",
                            "There is no negative marking in this round.",
                            "Ensure a stable internet connection before beginning."
                        ].map((point, i) => (
                            <li key={i} className="text-[clamp(10px,0.8vw,13px)] text-black dark:text-white flex items-start gap-3 font-medium">
                                <span className="block w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 shrink-0"></span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer Actions */}
                <div className="p-5 sm:p-6 border-t border-brand-light-tertiary dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <div className="flex justify-end gap-3 sm:gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-full border border-gray-200 dark:border-white/20 text-black dark:text-white/80 font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={onStart}
                            className="px-10 py-2.5 rounded-full bg-brand-green text-white text-sm font-medium hover:bg-brand-green/90 transition-colors active:scale-95 shadow-md shadow-brand-green/10"
                        >
                            Begin Assessment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RolePreTest;
