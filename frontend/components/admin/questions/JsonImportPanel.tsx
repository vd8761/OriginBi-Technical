"use client";

import React, { useState } from "react";
import {
  AssessmentType, AnyQuestion, SAMPLE_JSONS,
  CATEGORY_COLORS, AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
  COMM_TASK_LABELS, ROLE_QUESTION_TYPE_LABELS,
} from "./types";
import { generateId } from "./storage";
import { AlertCircle, CheckCircle2, Copy, Upload, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface JsonImportPanelProps {
  assessmentType: AssessmentType;
  onImport: (questions: AnyQuestion[]) => void;
  onCancel: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseQuestions(raw: any[], assessmentType: AssessmentType): AnyQuestion[] {
  return raw.map((item, i) => {
    const baseId = generateId() + `_${i}`;

    switch (assessmentType) {
      case "aptitude": {
        if (!item.text) throw new Error(`Q${i + 1}: missing "text".`);
        if (!item.options || item.options.length < 2) throw new Error(`Q${i + 1}: need ≥2 options.`);
        if (item.correctOptionIndex === undefined) throw new Error(`Q${i + 1}: missing "correctOptionIndex".`);
        const opts = item.options.map((o: { text: string }, j: number) => ({ id: `opt_${j}`, text: o.text }));
        return {
          id: baseId, category: item.category || "QA", text: item.text,
          options: opts, correctOptionId: opts[item.correctOptionIndex].id,
          explanation: item.explanation || "",
        } as AptitudeQuestion;
      }
      case "mnc": {
        if (!item.text) throw new Error(`Q${i + 1}: missing "text".`);
        if (!item.options || item.options.length < 2) throw new Error(`Q${i + 1}: need ≥2 options.`);
        if (item.correctOptionIndex === undefined) throw new Error(`Q${i + 1}: missing "correctOptionIndex".`);
        const opts = item.options.map((o: { text: string }, j: number) => ({ id: `opt_${j}`, text: o.text }));
        return {
          id: baseId, topic: item.topic || "General", text: item.text,
          options: opts, correctOptionId: opts[item.correctOptionIndex].id,
          explanation: item.explanation || "",
        } as MNCQuestion;
      }
      case "communication": {
        if (!item.taskType) throw new Error(`Q${i + 1}: missing "taskType".`);
        const cq: CommQuestion = {
          id: baseId, taskType: item.taskType, instructions: item.instructions || "",
        };
        if (item.questions) {
          cq.questions = item.questions.map((sq: { text: string; options?: { text: string }[]; correctOptionIndex?: number }, si: number) => {
            const sqOpts = (sq.options || []).map((o: { text: string }, j: number) => ({ id: `opt_${si}_${j}`, text: o.text }));
            return {
              id: `sq_${baseId}_${si}`, text: sq.text, options: sqOpts,
              correctOptionId: sq.correctOptionIndex !== undefined ? sqOpts[sq.correctOptionIndex]?.id : undefined,
            };
          });
        }
        if (item.passage) cq.passage = item.passage;
        if (item.audioUrl) cq.audioUrl = item.audioUrl;
        if (item.prompt) cq.prompt = item.prompt;
        if (item.prepTimeSeconds) cq.prepTimeSeconds = item.prepTimeSeconds;
        if (item.recordTimeSeconds) cq.recordTimeSeconds = item.recordTimeSeconds;
        if (item.minWords) cq.minWords = item.minWords;
        if (item.maxWords) cq.maxWords = item.maxWords;
        return cq;
      }
      case "role": {
        if (!item.text) throw new Error(`Q${i + 1}: missing "text".`);
        if (!item.options || item.options.length < 2) throw new Error(`Q${i + 1}: need ≥2 options.`);
        if (item.correctOptionIndex === undefined) throw new Error(`Q${i + 1}: missing "correctOptionIndex".`);
        const opts = item.options.map((o: { text: string }, j: number) => ({ id: `opt_${j}`, text: o.text }));
        const rq: RoleQuestion = {
          id: baseId, questionType: item.questionType || "conceptual", text: item.text,
          options: opts, correctOptionId: opts[item.correctOptionIndex].id,
          explanation: item.explanation || "",
        };
        if (item.category) rq.category = item.category;
        if (item.subCategory) rq.subCategory = item.subCategory;
        if (item.title) rq.title = item.title;
        if (item.scenarioContext) rq.scenarioContext = item.scenarioContext;
        if (item.ticketId) rq.ticketId = item.ticketId;
        if (item.priority) rq.priority = item.priority;
        if (item.reportedBy) rq.reportedBy = item.reportedBy;
        return rq;
      }
    }
  });
}

function getQuestionLabel(q: AnyQuestion, assessmentType: AssessmentType): string {
  switch (assessmentType) {
    case "aptitude": return (q as AptitudeQuestion).category;
    case "mnc": return (q as MNCQuestion).topic;
    case "communication": return COMM_TASK_LABELS[(q as CommQuestion).taskType] || (q as CommQuestion).taskType;
    case "role": return ROLE_QUESTION_TYPE_LABELS[(q as RoleQuestion).questionType] || (q as RoleQuestion).questionType;
  }
}

function getQuestionText(q: AnyQuestion, assessmentType: AssessmentType): string {
  switch (assessmentType) {
    case "aptitude": return (q as AptitudeQuestion).text;
    case "mnc": return (q as MNCQuestion).text;
    case "communication": {
      const cq = q as CommQuestion;
      return cq.questions?.[0]?.text || cq.prompt || cq.instructions;
    }
    case "role": return (q as RoleQuestion).text;
  }
}

function getCategoryKey(q: AnyQuestion, assessmentType: AssessmentType): string {
  switch (assessmentType) {
    case "aptitude": return (q as AptitudeQuestion).category;
    case "mnc": return (q as MNCQuestion).topic;
    case "communication": return (q as CommQuestion).taskType;
    case "role": return (q as RoleQuestion).questionType;
  }
}

export default function JsonImportPanel({ assessmentType, onImport, onCancel }: JsonImportPanelProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AnyQuestion[] | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleParse = () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Data must be a list of questions.");
      if (parsed.length === 0) throw new Error("Array is empty.");
      setPreview(parseQuestions(parsed, assessmentType));
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Invalid JSON format.");
    }
  };

  const handleRemoveFromPreview = (idx: number) => {
    if (!preview) return;
    const updated = preview.filter((_, i) => i !== idx);
    if (updated.length === 0) { setPreview(null); return; }
    setPreview(updated);
  };

  const copySample = () => setJsonText(SAMPLE_JSONS[assessmentType]);

  return (
    <div className="flex flex-col gap-6">
      {!preview ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold tracking-tight text-[#150089] dark:text-white">Bulk Upload Questions</h3>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-white/40">
                Prepare and upload your question bank in JSON format for the <span className="text-brand-green font-bold">{assessmentType}</span> assessment
              </p>
            </div>
            <button onClick={copySample} className="flex items-center gap-2 rounded-xl border border-brand-green/20 bg-brand-green/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-green transition-all hover:bg-brand-green hover:text-white group">
              <Copy size={12} className="group-hover:scale-110 transition-transform" /> Sample Template
            </button>
          </div>

          <div className="relative">
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setError(null); }}
              placeholder="Paste your JSON array here..."
              className="relative h-72 w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-sm p-5 font-mono text-[11px] leading-relaxed text-slate-800 placeholder:text-slate-400 dark:text-white/70 focus:border-slate-300 dark:focus:border-white/20 focus:outline-none transition-all"
              spellCheck={false}
            />
          </div>

          {jsonText.trim() === (SAMPLE_JSONS[assessmentType] || "").trim() && (
            <div className="flex items-start gap-3 rounded-xl border border-brand-green/20 bg-brand-green/5 p-4 animate-in fade-in duration-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-brand-green mt-0.5" />
              <p className="text-[10px] font-bold text-brand-green leading-relaxed">
                You are currently viewing the sample template. Please modify the content or paste your own question data to proceed with the review.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 animate-in shake duration-500">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-0.5 leading-none">Format Error</p>
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all">
              Cancel
            </button>
            <button
              onClick={handleParse}
              disabled={!jsonText.trim() || jsonText.trim() === (SAMPLE_JSONS[assessmentType] || "").trim()}
              className="px-8 py-3 rounded-xl bg-brand-green text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-brand-green/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Upload size={14} /> Review Questions
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-brand-green/[0.04] border border-brand-green/20 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-5 w-5 text-brand-green" />
                <h3 className="text-xl font-bold tracking-tight text-[#150089] dark:text-white uppercase">
                  Review & Confirm
                </h3>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-white/40">
                Ready to import <span className="text-brand-green font-bold">{preview.length} questions</span> into the database
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setPreview(null)} className="px-5 py-2 rounded-lg border border-[#17201b]/10 text-[11px] font-black uppercase tracking-wider text-[#17201b] dark:text-white transition-all">
                Go Back
              </button>
              <button onClick={() => onImport(preview)} className="px-6 py-2 rounded-lg bg-brand-green text-[11px] font-black uppercase tracking-wider text-white hover:bg-brand-green/90">
                Finish Import
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            {preview.map((q, idx) => {
              const isExpanded = expandedIdx === idx;
              const catKey = getCategoryKey(q, assessmentType);
              const catColor = CATEGORY_COLORS[catKey] || { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" };

              return (
                <div key={(q as { id: string }).id} className={`group rounded-xl border transition-all duration-300 ${isExpanded ? "bg-white dark:bg-white/[0.04] border-brand-green/30 shadow-md" : "bg-white/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-brand-green/20"
                  }`}>
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black transition-colors ${isExpanded ? "bg-brand-green text-white" : "bg-brand-green/10 text-brand-green"
                      }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${catColor.bg} ${catColor.text} ${catColor.border} border`}>
                          {getQuestionLabel(q, assessmentType)}
                        </span>
                      </div>
                      <p className={`text-[12px] font-bold truncate transition-colors ${isExpanded ? "text-brand-green" : "text-[#17201b] dark:text-white/80"}`}>
                        {getQuestionText(q, assessmentType)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveFromPreview(idx); }} className="rounded-md p-1.5 text-red-400/40 hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 size={12} />
                      </button>
                      <div className={`p-1 rounded-md ${isExpanded ? "text-brand-green" : "text-[#17201b] dark:text-white"}`}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5">
                      <div className="rounded-xl bg-[#0b100d] p-4 border border-white/5 shadow-inner">
                        <pre className="max-h-48 overflow-auto text-[10px] font-mono leading-relaxed text-brand-green/70 custom-scrollbar">
                          {JSON.stringify(q, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
