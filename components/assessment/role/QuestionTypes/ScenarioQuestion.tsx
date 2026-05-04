import React from "react";
import type { ScenarioQuestion } from "../RoleEngine";

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
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Incident Ticket UI */}
            <div className="bg-[#f8f9fa] dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-[20px] shadow-sm dark:shadow-xl overflow-hidden text-gray-700 dark:text-gray-300 font-mono text-sm relative transition-colors">
                {/* Ticket Header */}
                <div className="bg-[#f1f3f5] dark:bg-[#2d2d2d] border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                        <span className="font-bold text-gray-500 dark:text-gray-400 tracking-wider text-xs uppercase">Incident Dashboard</span>
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">System Alert</div>
                </div>

                {/* Ticket Meta */}
                <div className="px-5 py-4 border-b border-gray-200/50 dark:border-gray-800/50 flex flex-wrap gap-4 items-center bg-white dark:bg-[#252525]">
                    {question.ticketId && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold">Ticket ID</span>
                            <span className="text-brand-green font-bold">{question.ticketId}</span>
                        </div>
                    )}
                    {question.priority && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold">Priority</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(question.priority)}`}>
                                {question.priority.toUpperCase()}
                            </span>
                        </div>
                    )}
                    {question.reportedBy && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold">Source</span>
                            <span className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px]">{question.reportedBy}</span>
                        </div>
                    )}
                </div>

                {/* Scenario Context */}
                <div className="p-5">
                    <div className="text-gray-400 dark:text-gray-500 uppercase text-[10px] tracking-widest mb-2 font-bold">Context / Issue Description</div>
                    <p className="text-[14px] leading-relaxed text-gray-800 dark:text-gray-200">
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
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white font-sans">
                        {question.text}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {question.options.map((option, index) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelectOption(option.id)}
                            className={`
                                flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 group
                                ${isSelected 
                                    ? 'bg-brand-green/5 border-brand-green shadow-sm' 
                                    : 'bg-white dark:bg-[#1A1D21] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30 hover:bg-brand-green/5'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-brand-text-light-secondary dark:text-gray-400 group-hover:bg-brand-green/20 group-hover:text-brand-green'}
                            `}>
                                {labels[idx]}
                            </div>
                            <span className={`text-[14px] leading-relaxed font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-brand-text-light-primary dark:text-gray-300'}`}>
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
