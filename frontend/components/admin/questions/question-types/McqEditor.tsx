import React from "react";
import { CheckCircle2, Trash2 } from "lucide-react";

interface Option {
  id: string;
  text: string;
}

interface McqEditorProps {
  options: Option[];
  correctId: string | null;
  onOptionChange: (index: number, text: string) => void;
  onToggleCorrect: (id: string) => void;
  onRemoveOption: (index: number) => void;
  inputCls: string;
  labels: string[];
}

export const McqEditor: React.FC<McqEditorProps> = ({
  options,
  correctId,
  onOptionChange,
  onToggleCorrect,
  onRemoveOption,
  inputCls,
  labels
}) => {
  return (
    <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {options.map((opt, idx) => {
        const isCorrect = correctId === opt.id;
        return (
          <div key={opt.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleCorrect(opt.id)}
              title="Set as correct answer"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                isCorrect 
                  ? "border-brand-green bg-brand-green text-white shadow-md" 
                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-300 dark:text-white/10 hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 size={18} />
              ) : (
                <span className="text-[12px] font-black">{labels[idx]}</span>
              )}
            </button>
            <input
              value={opt.text}
              onChange={e => onOptionChange(idx, e.target.value)}
              className={inputCls}
              placeholder={`Option ${labels[idx]}...`}
            />
            {options.length > 2 && (
              <button 
                onClick={() => onRemoveOption(idx)} 
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
