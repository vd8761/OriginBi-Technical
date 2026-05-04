import React from "react";
import type { ScenarioQuestion } from "../RoleEngine";

interface ScenarioQuestionProps {
    question: ScenarioQuestion;
    selectedOptionId?: string;
    onSelectOption: (optionId: string) => void;
}

const labels = ["A", "B", "C", "D"];


const getPriorityColor = (priority?: string) => {
    switch (priority) {
        case "Critical":
            return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300";
        case "High":
            return "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300";
        case "Medium":
            return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300";
        case "Low":
            return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300";
        default:
            return "border-brand-green/20 bg-brand-green/5 text-[#17201b] dark:border-white/10 dark:bg-white/5 dark:text-white";
    }
};

const ScenarioQuestionComponent: React.FC<ScenarioQuestionProps> = ({
    question,
    selectedOptionId,
    onSelectOption,
}) => {
    return (
        <div className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-lg border border-brand-green/10 bg-white dark:border-white/10 dark:bg-[#0f1712]">
                <div className="flex flex-col gap-3 border-b border-brand-green/5 bg-brand-green/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Scenario case
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#17201b] dark:text-white">
                            Incident decision dashboard
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {question.ticketId && (
                            <span className="rounded-md bg-brand-green/10 px-2.5 py-1 text-xs font-bold text-brand-green">
                                {question.ticketId}
                            </span>
                        )}
                        {question.priority && (
                            <span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${getPriorityColor(question.priority)}`}>
                                {question.priority}
                            </span>
                        )}
                        {question.reportedBy && (
                            <span className="rounded-md bg-brand-green/5 px-2.5 py-1 text-xs font-bold text-[#17201b] dark:bg-white/10 dark:text-white">
                                {question.reportedBy}
                            </span>
                        )}
                    </div>

                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                            Context
                        </p>
                        <p className="mt-3 text-sm font-medium leading-7 text-[#17201b] dark:text-white">
                            {question.scenarioContext}
                        </p>
                    </div>
                    <div className="rounded-lg border border-brand-green/20 bg-brand-green/10 p-4">
                        <div className="flex items-center gap-2 text-brand-green">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Decision needed</span>
                        </div>
                        <p className="mt-3 text-base font-semibold leading-7 text-[#17201b] dark:text-white">
                            {question.text}
                        </p>
                    </div>
                </div>
            </section>


            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {question.options.map((option, index) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelectOption(option.id)}
                            aria-pressed={isSelected}
                            className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                                isSelected
                                    ? "border-brand-green bg-brand-green/10"
                                    : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712]"
                            }`}
                        >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                isSelected
                                    ? "bg-brand-green text-[#0f1712]"
                                    : "bg-brand-green/10 text-brand-green"
                            }`}>
                                {labels[index]}
                            </span>
                            <span className={`text-sm font-semibold leading-6 ${isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b] dark:text-white"}`}>

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

