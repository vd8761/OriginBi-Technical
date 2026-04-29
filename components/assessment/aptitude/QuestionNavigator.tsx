import React from 'react';

export type QuestionState = 'unanswered' | 'answered' | 'marked';

export interface NavigatorQuestion {
    id: string;
    number: number;
    state: QuestionState;
    category: string;
}

interface QuestionNavigatorProps {
    questions: NavigatorQuestion[];
    currentIndex: number;
    onSelect: (index: number) => void;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({ questions, currentIndex, onSelect }) => {
    const getBgColor = (state: QuestionState, isActive: boolean) => {
        if (isActive) return 'bg-black dark:bg-white text-white dark:text-black border-transparent scale-110';
        
        switch (state) {
            case 'answered':
                return 'bg-brand-green text-white border-brand-green';
            case 'marked':
                return 'bg-amber-500 text-white border-amber-500';
            case 'unanswered':
            default:
                return 'bg-white dark:bg-white/[0.05] border-brand-light-tertiary dark:border-white/10 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-brand-dark-primary border border-brand-light-tertiary dark:border-white/5 rounded-[20px] overflow-hidden transition-colors">
            <div className="p-4 border-b border-brand-light-tertiary dark:border-white/5">
                <h3 className="text-sm font-bold text-black dark:text-white">Question Navigator</h3>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-brand-green"></div> Answered
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Review
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600"></div> Pending
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-4 gap-2">
                    {questions.map((q, idx) => {
                        const isActive = idx === currentIndex;
                        
                        return (
                            <button
                                key={q.id}
                                onClick={() => onSelect(idx)}
                                className={`
                                    w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] border transition-all duration-300
                                    ${getBgColor(q.state, isActive)}
                                `}
                            >
                                {q.number}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default QuestionNavigator;
