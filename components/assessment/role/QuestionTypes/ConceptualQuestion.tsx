import React from 'react';
import { ConceptualQuestion } from '../RoleEngine';

interface ConceptualQuestionProps {
    question: ConceptualQuestion;
    selectedOptionId?: string;
    onSelectOption: (optionId: string) => void;
}

const ConceptualQuestionComponent: React.FC<ConceptualQuestionProps> = ({ question, selectedOptionId, onSelectOption }) => {
    return (
        <div className="flex flex-col gap-4">
            {/* Question Text */}
            <div className="bg-white dark:bg-white/[0.03] border border-brand-light-tertiary dark:border-white/5 p-6 md:p-8 rounded-[20px] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="px-2.5 py-1 rounded-md bg-brand-green/10 text-brand-green font-bold text-[10px] uppercase tracking-wider">
                        Conceptual Knowledge
                    </div>
                </div>
                <h2 className="text-[clamp(15px,1.5vw,20px)] font-semibold text-black dark:text-white leading-relaxed">
                    {question.text}
                </h2>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3 flex-1">
                {question.options.map((option, idx) => {
                    const isSelected = selectedOptionId === option.id;
                    const labels = ['A', 'B', 'C', 'D'];
                    return (
                        <button
                            key={option.id}
                            onClick={() => onSelectOption(option.id)}
                            className={`
                                flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 group
                                ${isSelected 
                                    ? 'bg-brand-green/5 border-brand-green' 
                                    : 'bg-white dark:bg-white/[0.03] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30 hover:bg-brand-green/5'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-black dark:text-white group-hover:bg-brand-green/20 group-hover:text-brand-green'}
                            `}>
                                {labels[idx]}
                            </div>
                            <span className={`text-[14px] leading-relaxed font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
                                {option.text}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ConceptualQuestionComponent;
