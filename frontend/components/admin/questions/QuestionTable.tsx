import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { AnyQuestion, AssessmentType } from './types';

interface QuestionTableProps {
  questions: AnyQuestion[];
  loading: boolean;
  assessmentType: AssessmentType;
  onEdit: (q: AnyQuestion) => void;
  onDelete: (id: string) => void;
}

const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  loading,
  assessmentType,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Synchronizing Database...</p>
      </div>
    );
  }

  return (
    <div className="w-[calc(100%+2px)] -ml-px h-full flex flex-col rounded-xl border border-brand-light-tertiary dark:border-white/10 bg-white dark:bg-[#19211C]/90 backdrop-blur-sm shadow-xl relative transition-all duration-300 overflow-hidden">
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <table className="w-full border-collapse relative">
          <thead className="sticky top-0 z-20 bg-[#19211C]/4 dark:bg-[#FFFFFF1F] shadow-sm">
            <tr className="text-left">
              <th className="p-4 text-xs font-normal text-[#19211C] dark:text-brand-text-secondary tracking-wider cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Question Details</th>
              <th className="p-4 text-xs font-normal text-[#19211C] dark:text-brand-text-secondary tracking-wider cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-32">Category</th>
              <th className="p-4 text-xs font-normal text-[#19211C] dark:text-brand-text-secondary tracking-wider cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-24 text-center">Choices</th>
              <th className="p-4 text-xs font-normal text-[#19211C] dark:text-brand-text-secondary tracking-wider cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-28">Difficulty</th>
              <th className="p-4 text-xs font-normal text-[#19211C] dark:text-brand-text-secondary tracking-wider cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-24 text-center">Marks</th>
              <th className="p-4 text-xs font-normal text-[#19211C] dark:text-brand-text-secondary tracking-wider cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-light-tertiary dark:divide-brand-dark-tertiary">
            {questions.map((q) => {
              const qId = (q as any).id;
              const text = (q as any).text || (q as any).instructions || "No content provided";
              const category = (q as any).category || (q as any).topic || (q as any).taskType || (q as any).questionType || "General";
              const marks = (q as any).marks ?? 1;
              const difficulty = (q as any).difficulty || "Medium";
              const optionsCount = (q as any).options?.length || 0;

              return (
                <tr key={qId} className="bg-white dark:bg-transparent border-b border-brand-light-tertiary dark:border-white/5 hover:bg-brand-light-secondary dark:hover:bg-white/5 transition-colors group">
                  <td className="p-4 align-middle">
                    <div className="max-w-xl">
                      <p className="text-sm font-medium text-brand-text-light-primary dark:text-white line-clamp-2 leading-relaxed">
                        {text}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-brand-text-light-primary dark:text-white align-middle">
                    <span className="capitalize">
                      {category}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm text-brand-text-light-primary dark:text-white align-middle font-bold">
                    {optionsCount > 0 ? (
                      <span className="text-[10px] text-brand-text-light-primary dark:text-white uppercase tracking-tight font-black">
                        {optionsCount} options
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-4 text-sm text-brand-text-light-primary dark:text-white align-middle">
                    <div className="flex items-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        difficulty.toLowerCase() === 'easy' ? 'bg-[#1ED36A]/10 text-[#1ED36A]' :
                        difficulty.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {difficulty}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-sm text-brand-text-light-primary dark:text-white align-middle">
                    <span>
                      {marks}
                    </span>
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onEdit(q)}
                        className="p-2 rounded-md bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-brand-text-light-primary dark:text-white transition-all cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(qId)}
                        className="p-2 rounded-md bg-transparent hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionTable;
