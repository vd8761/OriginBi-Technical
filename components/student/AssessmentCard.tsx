import React from 'react';
import { ArrowRightIcon } from '../icons';

interface AssessmentCardProps {
    title: string;
    description: string;
    progress: number;
    totalQuestions: number;
    completedQuestions: number;
    status: "completed" | "in-progress" | "locked" | "not-started";
    onClick: () => void;
}

const CustomLockIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.5 6H10V4C10 1.794 8.206 0 6 0C3.794 0 2 1.794 2 4V6H1.5C0.673333 6 0 6.67267 0 7.5V14.5C0 15.3273 0.673333 16 1.5 16H10.5C11.3267 16 12 15.3273 12 14.5V7.5C12 6.67267 11.3267 6 10.5 6ZM3.33333 4C3.33333 2.52933 4.52933 1.33333 6 1.33333C7.47067 1.33333 8.66667 2.52933 8.66667 4V6H3.33333V4ZM6.66667 11.148V12.6667C6.66667 13.0347 6.36867 13.3333 6 13.3333C5.63133 13.3333 5.33333 13.0347 5.33333 12.6667V11.148C4.93667 10.9167 4.66667 10.4913 4.66667 10C4.66667 9.26467 5.26467 8.66667 6 8.66667C6.73533 8.66667 7.33333 9.26467 7.33333 10C7.33333 10.4913 7.06333 10.9167 6.66667 11.148Z" fill="currentColor" />
    </svg>
);

const AssessmentCard: React.FC<AssessmentCardProps> = ({
    title,
    description,
    progress,
    totalQuestions,
    completedQuestions,
    status,
    onClick,
}) => {
    const isLocked = status === "locked";
    const isNotStarted = status === "not-started";

    return (
        <div
            className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 h-full overflow-hidden ${isLocked
                    ? "bg-brand-light-secondary/50 dark:bg-brand-dark-secondary/50 border-brand-light-tertiary dark:border-brand-dark-tertiary/30"
                    : "bg-brand-light-secondary dark:bg-brand-dark-secondary border-brand-light-tertiary dark:border-brand-dark-tertiary hover:border-brand-green/40 shadow-sm"
                }`}
        >
            <div className={`flex flex-col h-full transition-all duration-300 ${isLocked ? "opacity-40 grayscale" : ""}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col pr-4 flex-grow">
                        <h3 className="text-lg font-bold text-brand-text-light-primary dark:text-brand-text-primary leading-tight mb-2">
                            {title}
                        </h3>
                        <p className="text-xs font-medium text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="mb-6 mt-auto">
                    <div className="h-1.5 w-full bg-brand-light-tertiary dark:bg-brand-dark-tertiary rounded-full overflow-hidden">
                        {!isLocked && !isNotStarted ? (
                            <div
                                className="h-full bg-brand-green rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        ) : (
                            <div className="h-full w-0 bg-brand-green rounded-full" />
                        )}
                    </div>
                    <div className="flex justify-end mt-1.5">
                        <span className="text-[10px] font-bold text-brand-green tracking-tighter">
                            {isLocked || isNotStarted ? "0%" : `${progress}%`}
                        </span>
                    </div>
                </div>

                <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-brand-green">
                            {completedQuestions}/{totalQuestions}
                        </span>
                        <span className="text-[10px] font-bold text-brand-text-light-secondary dark:text-brand-text-secondary uppercase tracking-tight">
                            Questions Completed
                        </span>
                    </div>
                    {!isLocked && (
                        <button
                            onClick={onClick}
                            disabled={status === "completed"}
                            className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${status === "completed"
                                    ? "bg-brand-light-tertiary dark:bg-brand-dark-tertiary text-gray-400 cursor-default"
                                    : "bg-brand-green text-white hover:bg-brand-green/90 shadow-md shadow-brand-green/20"
                                }`}
                        >
                            {status === "completed" ? "Done" : status === "in-progress" ? "Resume" : "Start"}
                        </button>
                    )}
                </div>
            </div>

            {isLocked && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 mb-3 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <CustomLockIcon className="w-5 h-6 text-gray-400 dark:text-white/20" />
                    </div>
                    <h4 className="text-sm font-bold text-brand-text-light-primary dark:text-white mb-1">
                        Module Locked
                    </h4>
                    <p className="text-[10px] font-medium text-brand-text-light-secondary dark:text-brand-text-secondary">
                        Complete previous steps
                    </p>
                </div>
            )}
        </div>
    );
};

export default AssessmentCard;
