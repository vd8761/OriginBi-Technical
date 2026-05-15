import React from "react";

interface NumericalQuestionProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const NumericalQuestion: React.FC<NumericalQuestionProps> = ({
  questionId,
  value,
  onChange,
  placeholder = "Type numerical value..."
}) => {
  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-1 mb-4">
        <label className="block text-[11px] font-black uppercase tracking-widest text-[#17201b] dark:text-white">
          Enter your answer
        </label>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
        placeholder={placeholder}
        className="w-full max-w-md rounded-xl border-2 border-brand-green/20 bg-white p-4 text-lg font-bold text-[#17201b] dark:bg-[#0f1712] dark:text-white dark:border-white/20 focus:border-brand-green focus:outline-none transition-all shadow-sm placeholder:text-[#17201b]/20 dark:placeholder:text-white/10"
      />
    </div>
  );
};
