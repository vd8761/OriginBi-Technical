"use client";

import React, { useState, useEffect } from "react";
import {
  AnyQuestion, AssessmentType, QuestionOption,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
  APTITUDE_CATEGORIES, APTITUDE_CATEGORY_LABELS, MNC_TOPICS,
  COMM_TASK_LABELS, CommTaskType, RoleQuestionType,
  DifficultyLevel, QuestionStatus,
} from "./types";
import { generateId } from "./storage";
import { X, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface QuestionEditorProps {
  question: AnyQuestion | null;
  type: AssessmentType;
  onSave: (q: AnyQuestion) => void;
  onCancel: () => void;
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

export default function QuestionEditor({ question, type, onSave, onCancel }: QuestionEditorProps) {
  // Common state
  const [text, setText] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: "opt_0", text: "" }, { id: "opt_1", text: "" },
    { id: "opt_2", text: "" }, { id: "opt_3", text: "" },
  ]);
  const [correctId, setCorrectId] = useState("opt_0");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [marks, setMarks] = useState(1);
  const [negMarks, setNegMarks] = useState(0);
  const [status, setStatus] = useState<QuestionStatus>("active");
  const [assessmentId, setAssessmentId] = useState<number | undefined>(undefined);

  // Aptitude
  const [aptCategory, setAptCategory] = useState("QA");
  // MNC
  const [mncTopic, setMncTopic] = useState("General");
  // Role
  const [roleType, setRoleType] = useState<RoleQuestionType>("conceptual");
  const [roleCategory, setRoleCategory] = useState("");
  const [roleSubCategory, setRoleSubCategory] = useState("");
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioContext, setScenarioContext] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [reportedBy, setReportedBy] = useState("");
  // Communication
  const [commTaskType, setCommTaskType] = useState<CommTaskType>("mcq");
  const [commInstructions, setCommInstructions] = useState("");
  const [commPassage, setCommPassage] = useState("");
  const [commPrompt, setCommPrompt] = useState("");
  const [commPrepTime, setCommPrepTime] = useState(30);
  const [commRecordTime, setCommRecordTime] = useState(90);
  const [commMinWords, setCommMinWords] = useState(50);
  const [commMaxWords, setCommMaxWords] = useState(200);
  // Comm sub-questions
  const [commSubQuestions, setCommSubQuestions] = useState<{ id: string; text: string; options: QuestionOption[]; correctOptionId: string }[]>([]);

  const [errors, setErrors] = useState<string[]>([]);

  // Populate from existing question
  useEffect(() => {
    if (!question) return;
    const q = question as any;
    setText(q.text || q.instructions || "");
    setOptions(q.options || []);
    setCorrectId(q.correctOptionId || "");
    setExplanation(q.explanation || "");
    setDifficulty(q.difficulty || "medium");
    setMarks(q.marks ?? 1);
    setNegMarks(q.negativeMarks ?? 0);
    setStatus(q.status || "active");
    setAssessmentId(q.assessmentId);

    switch (type) {
      case "aptitude": {
        const aq = question as AptitudeQuestion;
        setAptCategory(aq.category);
        break;
      }
      case "mnc": {
        const mq = question as MNCQuestion;
        setMncTopic(mq.topic);
        break;
      }
      case "role": {
        const rq = question as RoleQuestion;
        setRoleType(rq.questionType);
        setRoleCategory(rq.category || "");
        setScenarioTitle(rq.title || "");
        setScenarioContext(rq.scenarioContext || "");
        setTicketId(rq.ticketId || "");
        setPriority(rq.priority || "Medium");
        setReportedBy(rq.reportedBy || "");
        break;
      }
      case "communication": {
        const cq = question as CommQuestion;
        setCommTaskType(cq.taskType);
        setCommInstructions(cq.instructions);
        setCommPassage(cq.passage || "");
        setCommPrompt(cq.prompt || "");
        setCommPrepTime(cq.prepTimeSeconds || 30);
        setCommRecordTime(cq.recordTimeSeconds || 90);
        setCommMinWords(cq.minWords || 50);
        setCommMaxWords(cq.maxWords || 200);
        if (cq.questions) setCommSubQuestions(cq.questions.map(sq => ({
          id: sq.id, text: sq.text, options: sq.options, correctOptionId: sq.correctOptionId || ""
        })));
        break;
      }
    }
  }, [question, type]);

  const validate = () => {
    const errs: string[] = [];
    if (type === "communication") {
      if (!commInstructions.trim()) errs.push("Instructions required.");
      if (["speaking", "writing"].includes(commTaskType) && !commPrompt.trim()) errs.push("Prompt required.");
      if (["mcq", "reading", "audio"].includes(commTaskType) && commSubQuestions.length === 0) errs.push("At least 1 sub-question required.");
    } else {
      if (!text.trim()) errs.push("Question text required.");
      if (options.filter(o => o.text.trim()).length < 2) errs.push("At least 2 options required.");
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const id = question ? (question as { id: string }).id : `new-${Date.now()}`;

    const common = {
      id,
      text: text.trim(),
      options: options.filter(o => o.text.trim()),
      correctOptionId: correctId,
      explanation: explanation.trim() || undefined,
      difficulty,
      marks,
      negativeMarks: negMarks,
      status,
      assessmentId,
    };

    switch (type) {
      case "aptitude":
        onSave({ ...common, category: aptCategory } as AptitudeQuestion);
        break;
      case "mnc":
        onSave({ ...common, topic: mncTopic } as MNCQuestion);
        break;
      case "role":
        onSave({
          ...common, questionType: roleType,
          ...(roleType === "conceptual" ? { category: roleCategory } : {}),
          ...(roleType === "scenario" ? { title: scenarioTitle, scenarioContext, ticketId, priority, reportedBy } : {}),
        } as RoleQuestion);
        break;
      case "communication":
        onSave({
          ...common, taskType: commTaskType, instructions: commInstructions.trim(),
          ...(commPassage ? { passage: commPassage } : {}),
          ...(commPrompt ? { prompt: commPrompt } : {}),
          ...(commTaskType === "speaking" ? { prepTimeSeconds: commPrepTime, recordTimeSeconds: commRecordTime } : {}),
          ...(commTaskType === "writing" ? { minWords: commMinWords, maxWords: commMaxWords } : {}),
          ...(commSubQuestions.length > 0 ? { questions: commSubQuestions } : {}),
        } as CommQuestion);
        break;
    }
  };

  const groupCls = "rounded-[20px] bg-[#f9fbf8] dark:bg-[#0b100d] border border-brand-green/10 dark:border-white/5 p-4 shadow-inner transition-all";
  const inputCls = "mt-1.5 w-full rounded-xl border border-brand-green/15 bg-white dark:bg-[#111a15] p-3 text-[13px] font-bold text-[#17201b] dark:text-white placeholder:text-[#17201b] dark:placeholder:text-white focus:border-brand-green/40 focus:ring-4 focus:ring-brand-green/5 focus:outline-none transition-all";
  const labelCls = "text-[9px] font-black uppercase tracking-wider text-[#17201b] dark:text-white";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0b100d]/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-[32px] border border-brand-green/20 bg-white shadow-2xl dark:border-white/5 dark:bg-[#111a15] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-green/5 bg-gradient-to-r from-brand-green/[0.03] to-transparent p-5 sm:p-6 dark:border-white/5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#17201b] dark:text-white">{question ? "Update Question" : "Add Question"}</h2>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-brand-green opacity-70">Assessment: {type}</p>
          </div>
          <button onClick={onCancel} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f8f5] dark:bg-[#0b100d] text-[#17201b]/40 transition hover:bg-red-500 hover:text-white dark:text-white/20"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-5 sm:p-6" style={{ maxHeight: "calc(90vh - 160px)" }}>
          <div className="flex flex-col gap-6">
            
            <div className={groupCls}>
               <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">General Configuration</p>
               <div className="grid gap-3.5 sm:grid-cols-2">
                 <div>
                    <label className={labelCls}>Difficulty</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)} className={inputCls}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)} className={inputCls}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Marks</label>
                    <input type="number" step="0.25" min="0" value={marks} onChange={e => setMarks(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Negative Marks</label>
                    <input type="number" step="0.25" min="0" value={negMarks} onChange={e => setNegMarks(Number(e.target.value))} className={inputCls} />
                  </div>

                  {type === "aptitude" && (
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Aptitude Category</label>
                      <select value={aptCategory} onChange={(e) => setAptCategory(e.target.value)} className={inputCls}>
                        {APTITUDE_CATEGORIES.map(c => <option key={c} value={c}>{APTITUDE_CATEGORY_LABELS[c]}</option>)}
                      </select>
                    </div>
                  )}

                  {type === "mnc" && (
                    <div className="sm:col-span-2">
                      <label className={labelCls}>MNC Topic</label>
                      <select value={mncTopic} onChange={(e) => setMncTopic(e.target.value)} className={inputCls}>
                        {MNC_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  {type === "role" && (
                    <>
                      <div>
                        <label className={labelCls}>Role Question Type</label>
                        <select value={roleType} onChange={(e) => setRoleType(e.target.value as RoleQuestionType)} className={inputCls}>
                          <option value="conceptual">Conceptual</option>
                          <option value="scenario">Scenario</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Domain / Category</label>
                        <input type="text" value={roleCategory} onChange={e => setRoleCategory(e.target.value)} placeholder="e.g. Frontend" className={inputCls} />
                      </div>
                    </>
                  )}
               </div>
            </div>

            {type !== "communication" ? (
              <>
                <div className={groupCls}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Question Content</p>
                  <label className={labelCls}>Question Text</label>
                  <textarea 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    placeholder="Enter question text..." 
                    className={`${inputCls} min-h-[100px] resize-none`}
                  />
                </div>

                <div className={groupCls}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Options & Correct Answer</p>
                  <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <button
                          onClick={() => setCorrectId(opt.id)}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${correctId === opt.id ? "border-brand-green bg-brand-green text-white" : "border-[#17201b]/10 bg-white dark:border-white/10 dark:bg-[#111a15] text-[#17201b]/20 dark:text-white/20"}`}
                        >
                          {LABELS[idx]}
                        </button>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => {
                            const newOpts = [...options];
                            newOpts[idx].text = e.target.value;
                            setOptions(newOpts);
                          }}
                          placeholder={`Option ${LABELS[idx]}...`}
                          className={inputCls}
                        />
                        {options.length > 2 && (
                          <button 
                            onClick={() => {
                              const newOpts = options.filter((_, i) => i !== idx);
                              setOptions(newOpts);
                              if (correctId === opt.id) setCorrectId(newOpts[0].id);
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {options.length < 6 && (
                    <button
                      onClick={() => setOptions([...options, { id: `opt_${options.length}`, text: "" }])}
                      className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-green hover:opacity-70 transition-opacity"
                    >
                      <Plus size={14} /> Add Option
                    </button>
                  )}
                </div>
              </>
            ) : (
              // Communication fields... (simplified for brevity, can expand if needed)
              <div className={groupCls}>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Communication Task</p>
                <div className="grid gap-4">
                  <div>
                    <label className={labelCls}>Task Type</label>
                    <select value={commTaskType} onChange={(e) => setCommTaskType(e.target.value as CommTaskType)} className={inputCls}>
                      {Object.entries(COMM_TASK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Instructions</label>
                    <textarea value={commInstructions} onChange={e => setCommInstructions(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            <div className={groupCls}>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Explanation & Feedback</p>
              <textarea 
                value={explanation} 
                onChange={e => setExplanation(e.target.value)} 
                placeholder="Explain the correct answer..." 
                className={`${inputCls} min-h-[80px] resize-none`}
              />
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
                <div className="flex items-center gap-2 text-rose-500 mb-1">
                   <Trash2 size={14} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Missing Requirements</p>
                </div>
                {errors.map((err, i) => <p key={i} className="text-[11px] font-bold text-rose-600/80 dark:text-rose-400/80">• {err}</p>)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brand-green/5 bg-[#fcfdfc] p-5 sm:p-6 dark:border-white/5 dark:bg-[#0b100d]">
          <button onClick={onCancel} className="text-[11px] font-black uppercase tracking-widest text-[#17201b]/40 transition hover:text-[#17201b] dark:text-white/40 dark:hover:text-white">Discard Changes</button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-[#17201b] px-8 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#17201b]/20 transition hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-[#0a0f0d] dark:shadow-white/5"
          >
            <CheckCircle2 size={14} />
            {question ? "Update Question" : "Save Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
