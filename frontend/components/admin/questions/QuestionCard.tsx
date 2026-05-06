"use client";

import React, { useState } from "react";
import {
  AnyQuestion, AssessmentType, CATEGORY_COLORS,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
  COMM_TASK_LABELS, ROLE_QUESTION_TYPE_LABELS, APTITUDE_CATEGORY_LABELS,
} from "./types";
import { ChevronDown, ChevronUp, Pencil, Trash2, FileText, Mic, Headphones, PenTool } from "lucide-react";

interface QuestionCardProps {
  question: AnyQuestion;
  index: number;
  assessmentType: AssessmentType;
  onEdit: () => void;
  onDelete: () => void;
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

function getTag(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": return (q as AptitudeQuestion).category;
    case "mnc": return (q as MNCQuestion).topic;
    case "communication": return COMM_TASK_LABELS[(q as CommQuestion).taskType] || (q as CommQuestion).taskType;
    case "role": return ROLE_QUESTION_TYPE_LABELS[(q as RoleQuestion).questionType] || (q as RoleQuestion).questionType;
  }
}

function getCatKey(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": return (q as AptitudeQuestion).category;
    case "mnc": return (q as MNCQuestion).topic;
    case "communication": return (q as CommQuestion).taskType;
    case "role": return (q as RoleQuestion).questionType;
  }
}

function getText(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": return (q as AptitudeQuestion).text;
    case "mnc": return (q as MNCQuestion).text;
    case "communication": {
      const cq = q as CommQuestion;
      return cq.questions?.[0]?.text || cq.prompt || cq.instructions;
    }
    case "role": return (q as RoleQuestion).text;
  }
}

function getSubtext(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": {
      const aq = q as AptitudeQuestion;
      return `${aq.options.length} options · ${APTITUDE_CATEGORY_LABELS[aq.category] || aq.category}`;
    }
    case "mnc": {
      const mq = q as MNCQuestion;
      return `${mq.options.length} options · ${mq.topic}`;
    }
    case "communication": {
      const cq = q as CommQuestion;
      if (cq.taskType === "writing") return `Writing · ${cq.minWords || 0}–${cq.maxWords || "∞"} words`;
      if (cq.taskType === "speaking") return `Speaking · ${cq.prepTimeSeconds}s prep · ${cq.recordTimeSeconds}s record`;
      if (cq.taskType === "audio") return `Audio · ${cq.questions?.length || 0} sub-questions`;
      return `${cq.questions?.length || 0} sub-questions`;
    }
    case "role": {
      const rq = q as RoleQuestion;
      if (rq.questionType === "scenario") return `Scenario · ${rq.priority || "—"} · ${rq.ticketId || ""}`;
      return `${rq.options.length} options · ${rq.category || ""} ${rq.subCategory ? `/ ${rq.subCategory}` : ""}`;
    }
  }
}

function getCommIcon(taskType: string) {
  switch (taskType) {
    case "audio": return <Headphones size={11} />;
    case "speaking": return <Mic size={11} />;
    case "writing": return <PenTool size={11} />;
    case "reading": return <FileText size={11} />;
    default: return null;
  }
}

export default function QuestionCard({ question, index, assessmentType, onEdit, onDelete }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const catKey = getCatKey(question, assessmentType);
  const catColor = CATEGORY_COLORS[catKey] || { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" };

  return (
    <div className={`group relative rounded-2xl transition-all duration-300 border ${
      isExpanded 
        ? "bg-white dark:bg-white/[0.04] border-brand-green/30 shadow-xl" 
        : "bg-white/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-brand-green/20 hover:shadow-md"
    }`}>
      <div className="flex items-center gap-3 p-3.5 sm:p-4">
        <div className="flex flex-col items-center gap-1">
           <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green/10 text-[11px] font-black text-brand-green border border-brand-green/10">
            {index + 1}
           </span>
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)} className="flex-1 min-w-0 text-left group/title">
          <div className="flex items-center gap-1.5 mb-0.5">
             <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
              {assessmentType === "communication" && getCommIcon((question as CommQuestion).taskType)}
              {getTag(question, assessmentType)}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-[#17201b]/10 dark:bg-white/10" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#17201b]/30 dark:text-white/20">
              {getSubtext(question, assessmentType)}
            </p>
          </div>
          <p className="text-[13px] font-bold text-[#17201b] dark:text-white line-clamp-1 group-hover/title:text-brand-green transition-colors">
            {getText(question, assessmentType)}
          </p>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[#f6f8f5] dark:bg-[#0b100d] border border-brand-green/5 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all">
            <button onClick={onEdit} className="rounded-md p-1.5 text-brand-green/60 transition hover:bg-brand-green hover:text-white" title="Edit"><Pencil size={12} /></button>
            <button onClick={onDelete} className="rounded-md p-1.5 text-red-400/50 transition hover:bg-red-500 hover:text-white" title="Delete"><Trash2 size={12} /></button>
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
            isExpanded ? "bg-brand-green border-brand-green text-white" : "border-brand-green/10 text-brand-green bg-brand-green/5 hover:bg-brand-green/10"
          }`}>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-3">
            {/* Question text */}
            <div className="rounded-lg bg-slate-50 dark:bg-white/[0.03] p-4 border border-slate-100 dark:border-white/5 shadow-sm">
               <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-2 opacity-80">Content</p>
               <p className="text-[13px] font-bold leading-relaxed text-slate-800 dark:text-white/90">
                {getText(question, assessmentType)}
               </p>
            </div>

            {/* Scenario context */}
            {assessmentType === "role" && (question as RoleQuestion).scenarioContext && (
              <div className="rounded-lg bg-amber-500/5 p-4 border border-amber-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2 opacity-80">Scenario Context</p>
                <p className="text-[12px] font-medium leading-relaxed text-amber-900/80 dark:text-amber-200/70">{(question as RoleQuestion).scenarioContext}</p>
              </div>
            )}

            {/* MCQ Options */}
            {assessmentType !== "communication" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {((question as AptitudeQuestion | MNCQuestion | RoleQuestion).options || []).map((opt, oIdx) => {
                  const correctId = (question as AptitudeQuestion).correctOptionId;
                  const isCorrect = correctId === opt.id;
                  return (
                    <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all border ${
                      isCorrect 
                        ? "bg-brand-green/5 border-brand-green/40 shadow-sm" 
                        : "bg-white/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5"
                    }`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                        isCorrect ? "bg-brand-green text-white shadow-sm" : "bg-brand-green/10 text-brand-green"
                      }`}>
                        {LABELS[oIdx]}
                      </span>
                      <span className={`flex-1 text-[11px] font-bold ${isCorrect ? "text-[#17201b] dark:text-white" : "text-[#17201b]/60 dark:text-white/40"}`}>
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comm sub-questions */}
            {assessmentType === "communication" && (question as CommQuestion).questions && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-green">Sub-tasks</p>
                {(question as CommQuestion).questions!.map((sq, sqIdx) => (
                  <div key={sq.id} className="rounded-xl bg-[#f6f8f5] dark:bg-[#0b100d] border border-[#17201b]/5 dark:border-white/5 p-4">
                    <div className="flex items-start gap-2.5 mb-3">
                       <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-green text-[9px] font-black text-white">{sqIdx + 1}</span>
                       <p className="text-[12px] font-bold text-[#17201b] dark:text-white/80">{sq.text}</p>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {sq.options.map((opt, oIdx) => {
                        const isCorrect = sq.correctOptionId === opt.id;
                        return (
                          <div key={opt.id} className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                            isCorrect ? "bg-brand-green/10 border-brand-green" : "bg-white dark:bg-[#111a15] border-brand-green/5 dark:border-white/5"
                          }`}>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[8px] font-black ${isCorrect ? "bg-brand-green text-white" : "bg-brand-green/10 text-brand-green"}`}>{LABELS[oIdx]}</span>
                            <span className={`text-[10px] font-bold ${isCorrect ? "text-[#17201b] dark:text-white" : "text-[#17201b]/40 dark:text-white/30"}`}>{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Explanation */}
            {(question as AptitudeQuestion).explanation && (
              <div className="rounded-xl bg-brand-green/5 p-4 border border-dashed border-brand-green/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-1.5">Technical Rationale</p>
                <p className="text-[11px] font-bold leading-relaxed text-[#17201b]/60 dark:text-white/40">{(question as AptitudeQuestion).explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
