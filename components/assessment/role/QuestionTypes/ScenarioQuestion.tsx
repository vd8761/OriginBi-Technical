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
            <section className="flex flex-col gap-6 rounded-lg border border-brand-green/10 bg-white p-6 dark:border-white/10 dark:bg-[#0f1712]">
                <div className="space-y-3">
                    <p className="text-sm font-medium leading-7 text-[#17201b] dark:text-white opacity-80">
                        {question.scenarioContext}
                    </p>
                </div>
                <div className="rounded-lg border border-brand-green/20 bg-brand-green/5 p-5">
                    <p className="text-base font-bold leading-relaxed text-[#17201b] dark:text-white">
                        {question.text}
                    </p>
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

