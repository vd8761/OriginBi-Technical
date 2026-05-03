import React from 'react';
import { ScenarioQuestion } from '../RoleEngine';

interface ScenarioQuestionProps {
    question: ScenarioQuestion;
    selectedOptionId?: string;
    onSelectOption: (optionId: string) => void;
}

const ScenarioQuestionComponent: React.FC<ScenarioQuestionProps> = ({ question, selectedOptionId, onSelectOption }) => {
    
    const getPriorityColor = (priority?: string) => {
        switch(priority) {
            case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'Low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-black dark:text-white bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Incident Ticket UI */}
            <div className="bg-[#f8f9fa] dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-[20px] overflow-hidden text-black dark:text-white font-mono text-sm relative transition-colors">
                {/* Ticket Header */}
                <div className="bg-[#f1f3f5] dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/10 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                        <span className="font-bold text-black dark:text-white tracking-wider text-xs uppercase">Incident Dashboard</span>
                    </div>
                    <div className="text-[10px] text-black dark:text-white font-bold uppercase tracking-widest">System Alert</div>
                </div>

                {/* Ticket Meta */}
                <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/5 flex flex-wrap gap-4 items-center bg-white dark:bg-white/[0.02]">
                    {question.ticketId && (
                        <div className="flex items-center gap-2">
                            <span className="text-black dark:text-white uppercase text-[10px] font-bold">Ticket ID</span>
                            <span className="text-brand-green font-bold">{question.ticketId}</span>
                        </div>
                    )}
                    {question.priority && (
                        <div className="flex items-center gap-2">
                            <span className="text-black dark:text-white uppercase text-[10px] font-bold">Priority</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(question.priority)}`}>
                                {question.priority.toUpperCase()}
                            </span>
                        </div>
                    )}
                    {question.reportedBy && (
                        <div className="flex items-center gap-2">
                            <span className="text-black dark:text-white uppercase text-[10px] font-bold">Source</span>
                            <span className="text-black dark:text-white bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px]">{question.reportedBy}</span>
                        </div>
                    )}
                </div>

                {/* Scenario Context */}
                <div className="p-5">
                    <div className="text-black dark:text-white uppercase text-[10px] tracking-widest mb-2 font-bold">Context / Issue Description</div>
                    <p className="text-[14px] leading-relaxed text-black dark:text-white">
                        {question.scenarioContext}
                    </p>
                </div>

                {/* The Question inside the ticket */}
                <div className="p-5 bg-brand-green/5 dark:bg-brand-green/5 border-t border-brand-green/10 dark:border-brand-green/10">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-brand-green uppercase text-[10px] tracking-widest font-bold">Required Action</span>
                    </div>
                    <p className="text-[15px] font-bold text-black dark:text-white font-sans">
                        {question.text}
                    </p>
                </div>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3 flex-1 mt-2">
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

export default ScenarioQuestionComponent;
