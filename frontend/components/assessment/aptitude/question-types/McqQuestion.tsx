import React from "react";
import { Check } from "lucide-react";

interface Option {
  id: string;
  text: string;
}

interface McqQuestionProps {
  options: Option[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  labelForIndex: (index: number) => string;
}

export const McqQuestion: React.FC<McqQuestionProps> = ({
  options,
  selectedOptionId,
  onSelect,
  labelForIndex
}) => {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {options.map((option, index) => {
        const isSelected = selectedOptionId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={isSelected}
            className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
              isSelected
                ? "border-brand-green bg-brand-green/10"
                : "border-brand-green/20 bg-white hover:border-brand-green/50 dark:border-white/10 dark:bg-[#0f1712] dark:hover:border-brand-green/50"
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              isSelected
                ? "bg-brand-green text-[#0f1712]"
                : "bg-brand-green/10 text-brand-green"
            }`}>
              {labelForIndex(index)}
            </span>
            <span className={`text-sm font-semibold leading-6 ${
              isSelected ? "text-[#17201b] dark:text-white" : "text-[#17201b] dark:text-white"
            }`}>
              {option.text}
            </span>
          </button>
        );
      })}
    </div>
  );
};
