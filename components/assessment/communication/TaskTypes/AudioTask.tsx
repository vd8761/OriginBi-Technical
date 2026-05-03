import React from 'react';
import { AudioTask } from '../CommunicationEngine';

interface AudioTaskProps {
    task: AudioTask;
    value?: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

const AudioTaskComponent: React.FC<AudioTaskProps> = ({ task, value = {}, onChange }) => {
    const handleOptionSelect = (questionId: string, optionId: string) => {
        onChange({
            ...value,
            [questionId]: optionId
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-brand-light-secondary dark:bg-white/[0.03] p-5 rounded-2xl border border-brand-light-tertiary dark:border-white/10 flex flex-col gap-4">
                <p className="text-[13px] font-medium text-black dark:text-white">
                    {task.instructions}
                </p>
                
                {/* Audio Player */}
                <div className="w-full bg-white dark:bg-brand-dark-primary p-3 rounded-xl border border-brand-light-tertiary dark:border-white/5 shadow-sm">
                    <audio 
                        controls 
                        className="w-full h-10 outline-none" 
                        controlsList="nodownload"
                        src={task.audioUrl}
                    >
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>

            {/* Questions */}
            <div className="flex flex-col gap-8">
                {task.questions.map((q, qIndex) => (
                    <div key={q.id} className="bg-white dark:bg-white/[0.03] p-5 md:p-8 rounded-[20px] border border-brand-light-tertiary dark:border-white/5 transition-colors">
                        <h3 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-black dark:text-white leading-relaxed mb-6">
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
                                        <span className={`text-[13px] font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
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

export default AudioTaskComponent;
