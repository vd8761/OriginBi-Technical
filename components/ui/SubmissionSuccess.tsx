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
    actionText = "Check Dashboard"
}) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-light-primary dark:bg-brand-dark-primary">
            {/* Decorative background elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-green/10 blur-[100px] rounded-full" />
            
            <div className="relative w-full max-w-lg text-center animate-in zoom-in-95 fade-in duration-500">
                <div className="mb-5 relative inline-block">
                    {/* Success Animation Circle */}
                    <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center border-2 border-brand-green">
                        <svg className="w-10 h-10 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                
                <h2 className="text-3xl font-black text-black dark:text-white mb-3 tracking-tight">
                    {title}
                </h2>
                
                <p className="text-base font-medium text-black dark:text-white/80 leading-relaxed mb-8 max-w-md mx-auto">
                    {message}
                </p>
                
                <button
                    onClick={onAction}
                    className="relative px-10 py-3 bg-brand-green text-white font-medium rounded-full text-sm transition-all hover:scale-105 active:scale-95"
                >
                    {actionText}
                </button>
            </div>
        </div>
    );
};

export default SubmissionSuccess;
