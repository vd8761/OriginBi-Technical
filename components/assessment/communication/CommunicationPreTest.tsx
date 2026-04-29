import React from 'react';

interface CommunicationPreTestProps {
    onStart: () => void;
    onClose: () => void;
}

const CustomTimeIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CustomMicIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const CommunicationPreTest: React.FC<CommunicationPreTestProps> = ({ onStart, onClose }) => {
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
                            Clear communication is the bridge between confusion and clarity.
                        </p>
                    </div>

                    <h2 className="text-[clamp(18px,2vw,28px)] font-semibold text-black dark:text-white mb-2 leading-tight tracking-tight">
                        Communication Assessment
                    </h2>

                    <p className="text-black dark:text-white text-[clamp(11px,0.9vw,14px)] leading-relaxed mb-6 font-medium">
                        Evaluate your proficiency across Listening, Speaking, Reading, and Writing to simulate real-world workplace scenarios.
                    </p>

                    {/* Meta Info Box */}
                    <div className="bg-brand-light-primary dark:bg-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 border border-brand-light-tertiary dark:border-white/5 mb-6">
                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                                <CustomMicIcon />
                            </div>
                            <span className="text-[clamp(11px,0.9vw,14px)] font-medium text-black dark:text-white">
                                Requires a <strong className="text-black dark:text-white font-bold">Microphone</strong>
                            </span>
                        </div>

                        <div className="w-full h-px sm:w-px sm:h-10 bg-brand-light-tertiary dark:bg-white/10 block"></div>

                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                                <CustomTimeIcon />
                            </div>
                            <span className="text-[clamp(11px,0.9vw,14px)] font-medium text-black dark:text-white">
                                Average time is <strong className="text-black dark:text-white font-bold">45 Minutes</strong>
                            </span>
                        </div>
                    </div>

                    <h4 className="text-black dark:text-white font-bold mb-3 text-[clamp(12px,1vw,15px)]">Please Read Carefully</h4>
                    <ul className="space-y-3 mb-2">
                        {[
                            "This assessment requires audio playback and microphone access.",
                            "Ensure you are in a quiet environment before starting the speaking tasks.",
                            "You will be presented with a mix of audio clips, reading passages, and writing prompts.",
                            "Please do not refresh the page during active recording sessions."
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
                            className="px-6 py-2.5 rounded-full border border-brand-light-tertiary dark:border-white/20 text-black dark:text-white text-[clamp(11px,0.9vw,14px)] font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={onStart}
                            className="px-10 py-2.5 rounded-full bg-brand-green text-white text-[clamp(11px,0.9vw,14px)] font-bold hover:bg-brand-green/90 transition-colors active:scale-95"
                        >
                            Begin Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunicationPreTest;
