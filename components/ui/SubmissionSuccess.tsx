import React from 'react';

interface SubmissionSuccessProps {
    title?: string;
    message?: string;
    onAction: () => void;
    actionText?: string;
}

const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
    title = "Assessment Submitted!",
    message = "Your responses have been successfully recorded and sent for evaluation. You can now view your progress in the dashboard.",
    onAction,
    actionText = "Back to Portal"
}) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-light-primary dark:bg-brand-dark-primary">
            {/* Decorative background elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="relative w-full max-w-lg text-center animate-in zoom-in-95 fade-in duration-500">
                <div className="mb-8 relative inline-block">
                    {/* Success Animation Circle */}
                    <div className="w-24 h-24 rounded-full bg-brand-green/10 flex items-center justify-center border-2 border-brand-green animate-bounce-slow">
                        <svg className="w-12 h-12 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    {/* Sparkles */}
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-brand-green rounded-full animate-ping" />
                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-brand-green/40 rounded-full animate-ping delay-300" />
                </div>
                
                <h2 className="text-4xl font-black text-black dark:text-white mb-4 tracking-tight">
                    {title}
                </h2>
                
                <p className="text-lg font-medium text-black dark:text-white/80 leading-relaxed mb-12 max-w-md mx-auto">
                    {message}
                </p>
                
                <button
                    onClick={onAction}
                    className="group relative px-12 py-4 bg-brand-green text-black font-black rounded-full text-sm uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-brand-green/20 overflow-hidden"
                >
                    <span className="relative z-10">{actionText}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

export default SubmissionSuccess;
