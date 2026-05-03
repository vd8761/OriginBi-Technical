import React from 'react';
import { ReadingTask } from '../CommunicationEngine';

interface ReadingTaskProps {
    task: ReadingTask;
    value?: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

const ReadingTaskComponent: React.FC<ReadingTaskProps> = ({ task, value = {}, onChange }) => {
    const handleOptionSelect = (questionId: string, optionId: string) => {
        onChange({
            ...value,
            [questionId]: optionId
        });
    };

    // Replace literal \n with actual breaks for rendering
    const formattedPassage = task.passage.split('\\n').map((line, i) => (
        <React.Fragment key={i}>
            {line}
            <br />
        </React.Fragment>
    ));

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left Pane: Passage */}
            <div className="flex-1 lg:w-1/2 flex flex-col gap-4 bg-brand-light-secondary dark:bg-white/[0.03] p-5 rounded-[20px] border border-brand-light-tertiary dark:border-white/10 h-[400px] lg:h-full">
                <p className="text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
                    Reading Passage
                </p>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-brand-dark-primary p-6 rounded-xl border border-brand-light-tertiary dark:border-white/5 shadow-inner">
                    <p className="text-[clamp(13px,1.1vw,16px)] leading-relaxed text-black dark:text-white">
                        {formattedPassage}
                    </p>
                </div>
            </div>

            {/* Right Pane: Questions */}
            <div className="flex-1 lg:w-1/2 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-6 lg:pb-0 h-[500px] lg:h-full">
                <p className="text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
                    Questions
                </p>
                
                {task.questions.map((q, qIndex) => (
                    <div key={q.id} className="bg-white dark:bg-white/[0.03] p-5 rounded-[20px] border border-brand-light-tertiary dark:border-white/5 transition-colors flex-shrink-0">
                        <h3 className="text-[14px] font-semibold text-black dark:text-white leading-relaxed mb-4">
                            <span className="text-black dark:text-white mr-2">{qIndex + 1}.</span>
                            {q.text}
                        </h3>
                        
                        <div className="flex flex-col gap-2.5">
                            {q.options.map((option, oIndex) => {
                                const isSelected = value[q.id] === option.id;
                                const labels = ['A', 'B', 'C', 'D'];
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(q.id, option.id)}
                                        className={`
                                            flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 group
                                            ${isSelected 
                                                ? 'bg-brand-green/5 border-brand-green' 
                                                : 'bg-white dark:bg-white/[0.03] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                            ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-black dark:text-white group-hover:bg-brand-green/10 group-hover:text-brand-green'}
                                        `}>
                                            {labels[oIndex]}
                                        </div>
                                        <span className={`text-[12px] font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReadingTaskComponent;
