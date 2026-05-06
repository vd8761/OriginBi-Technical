"use client";

import React, { useState, useEffect } from "react";
import {
  AnyQuestion, AssessmentType, QuestionOption,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
  APTITUDE_CATEGORIES, APTITUDE_CATEGORY_LABELS, MNC_TOPICS,
  COMM_TASK_LABELS, CommTaskType, RoleQuestionType,
} from "./types";
import { generateId } from "./storage";
import { X, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface QuestionEditorProps {
  question: AnyQuestion | null;
  assessmentType: AssessmentType;
  onSave: (q: AnyQuestion) => void;
  onCancel: () => void;
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

export default function QuestionEditor({ question, assessmentType, onSave, onCancel }: QuestionEditorProps) {
  // Common state
  const [text, setText] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: "opt_0", text: "" }, { id: "opt_1", text: "" },
    { id: "opt_2", text: "" }, { id: "opt_3", text: "" },
  ]);
  const [correctId, setCorrectId] = useState("opt_0");
  const [explanation, setExplanation] = useState("");

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
    switch (assessmentType) {
      case "aptitude": {
        const aq = question as AptitudeQuestion;
        setText(aq.text); setOptions(aq.options); setCorrectId(aq.correctOptionId);
        setExplanation(aq.explanation || ""); setAptCategory(aq.category);
        break;
      }
      case "mnc": {
        const mq = question as MNCQuestion;
        setText(mq.text); setOptions(mq.options); setCorrectId(mq.correctOptionId);
        setExplanation(mq.explanation || ""); setMncTopic(mq.topic);
        break;
      }
      case "role": {
        const rq = question as RoleQuestion;
        setText(rq.text); setOptions(rq.options); setCorrectId(rq.correctOptionId);
        setExplanation(rq.explanation || ""); setRoleType(rq.questionType);
        setRoleCategory(rq.category || ""); setRoleSubCategory(rq.subCategory || "");
        setScenarioTitle(rq.title || ""); setScenarioContext(rq.scenarioContext || "");
        setTicketId(rq.ticketId || ""); setPriority(rq.priority || "Medium");
        setReportedBy(rq.reportedBy || "");
        break;
      }
      case "communication": {
        const cq = question as CommQuestion;
        setCommTaskType(cq.taskType); setCommInstructions(cq.instructions);
        setCommPassage(cq.passage || ""); setCommPrompt(cq.prompt || "");
        setCommPrepTime(cq.prepTimeSeconds || 30); setCommRecordTime(cq.recordTimeSeconds || 90);
        setCommMinWords(cq.minWords || 50); setCommMaxWords(cq.maxWords || 200);
        if (cq.questions) setCommSubQuestions(cq.questions.map(sq => ({
          id: sq.id, text: sq.text, options: sq.options, correctOptionId: sq.correctOptionId || sq.options[0]?.id || "",
        })));
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, { id: `opt_${Date.now()}`, text: "" }]);
  };
  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    const removed = options[idx];
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
    if (correctId === removed.id) setCorrectId(updated[0].id);
  };
  const handleOptionChange = (idx: number, value: string) => {
    const u = [...options]; u[idx] = { ...u[idx], text: value }; setOptions(u);
  };

  // Comm sub-question helpers
  const addSubQuestion = () => {
    const sqId = `sq_${Date.now()}`;
    const sqOpts = [{ id: `${sqId}_o0`, text: "" }, { id: `${sqId}_o1`, text: "" }, { id: `${sqId}_o2`, text: "" }, { id: `${sqId}_o3`, text: "" }];
    setCommSubQuestions([...commSubQuestions, { id: sqId, text: "", options: sqOpts, correctOptionId: sqOpts[0].id }]);
  };
  const removeSubQuestion = (idx: number) => setCommSubQuestions(commSubQuestions.filter((_, i) => i !== idx));
  const updateSubQText = (idx: number, val: string) => {
    const u = [...commSubQuestions]; u[idx] = { ...u[idx], text: val }; setCommSubQuestions(u);
  };
  const updateSubQOption = (sqIdx: number, oIdx: number, val: string) => {
    const u = [...commSubQuestions];
    const opts = [...u[sqIdx].options]; opts[oIdx] = { ...opts[oIdx], text: val };
    u[sqIdx] = { ...u[sqIdx], options: opts }; setCommSubQuestions(u);
  };
  const setSubQCorrect = (sqIdx: number, optId: string) => {
    const u = [...commSubQuestions]; u[sqIdx] = { ...u[sqIdx], correctOptionId: optId }; setCommSubQuestions(u);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (assessmentType === "communication") {
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
    const id = question ? (question as { id: string }).id : generateId();

    switch (assessmentType) {
      case "aptitude":
        onSave({ id, category: aptCategory, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, explanation: explanation.trim() || undefined } as AptitudeQuestion);
        break;
      case "mnc":
        onSave({ id, topic: mncTopic, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, explanation: explanation.trim() || undefined } as MNCQuestion);
        break;
      case "role":
        onSave({
          id, questionType: roleType, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, explanation: explanation.trim() || undefined,
          ...(roleType === "conceptual" ? { category: roleCategory, subCategory: roleSubCategory } : {}),
          ...(roleType === "scenario" ? { title: scenarioTitle, scenarioContext, ticketId, priority, reportedBy } : {}),
        } as RoleQuestion);
        break;
      case "communication":
        onSave({
          id, taskType: commTaskType, instructions: commInstructions.trim(),
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
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-brand-green opacity-70">Assessment: {assessmentType}</p>
          </div>
          <button onClick={onCancel} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f8f5] dark:bg-[#0b100d] text-[#17201b]/40 transition hover:bg-red-500 hover:text-white dark:text-white/20"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-5 sm:p-6" style={{ maxHeight: "calc(90vh - 160px)" }}>
          <div className="flex flex-col gap-6">
            
            <div className={groupCls}>
               <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Configuration</p>
               <div className="grid gap-3.5 sm:grid-cols-2">
                 {assessmentType === "aptitude" && (
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Aptitude Category</label>
                    <select value={aptCategory} onChange={(e) => setAptCategory(e.target.value)} className={inputCls}>
                      {APTITUDE_CATEGORIES.map(c => <option key={c} value={c}>{APTITUDE_CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                 )}
                 {assessmentType === "mnc" && (
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Topic Vector</label>
                    <select value={mncTopic} onChange={(e) => setMncTopic(e.target.value)} className={inputCls}>
                      {MNC_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                 )}
                 {assessmentType === "role" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Question Logic</label>
                      <select value={roleType} onChange={(e) => setRoleType(e.target.value as RoleQuestionType)} className={inputCls}>
                        <option value="conceptual">Conceptual Assessment</option>
                        <option value="scenario">Simulation / Scenario</option>
                      </select>
                    </div>
                    {roleType === "conceptual" ? (
                      <>
                        <div><label className={labelCls}>Category</label><input value={roleCategory} onChange={e => setRoleCategory(e.target.value)} className={inputCls} placeholder="API Design" /></div>
                        <div><label className={labelCls}>Sub-Category</label><input value={roleSubCategory} onChange={e => setRoleSubCategory(e.target.value)} className={inputCls} placeholder="RESTful" /></div>
                      </>
                    ) : (
                      <div className="sm:col-span-2 space-y-3">
                        <div><label className={labelCls}>Simulation Title</label><input value={scenarioTitle} onChange={e => setScenarioTitle(e.target.value)} className={inputCls} placeholder="System Outage" /></div>
                        <div><label className={labelCls}>Context</label><textarea value={scenarioContext} onChange={e => setScenarioContext(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Simulation context..." /></div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className={labelCls}>Ticket ID</label><input value={ticketId} onChange={e => setTicketId(e.target.value)} className={inputCls} placeholder="INC-001" /></div>
                          <div><label className={labelCls}>Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} className={inputCls}>
                              {["Low", "Medium", "High", "Critical"].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div><label className={labelCls}>Unit</label><input value={reportedBy} onChange={e => setReportedBy(e.target.value)} className={inputCls} placeholder="Support" /></div>
                        </div>
                      </div>
                    )}
                  </>
                 )}
                 {assessmentType === "communication" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Task Modality</label>
                      <select value={commTaskType} onChange={(e) => setCommTaskType(e.target.value as CommTaskType)} className={inputCls}>
                        {Object.entries(COMM_TASK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2"><label className={labelCls}>Instructions</label><textarea value={commInstructions} onChange={e => setCommInstructions(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Direct instructions..." /></div>
                    {commTaskType === "reading" && <div className="sm:col-span-2"><label className={labelCls}>Passage</label><textarea value={commPassage} onChange={e => setCommPassage(e.target.value)} className={`${inputCls} resize-none`} rows={3} placeholder="Reading corpus..." /></div>}
                    {["speaking", "writing"].includes(commTaskType) && <div className="sm:col-span-2"><label className={labelCls}>Prompt</label><textarea value={commPrompt} onChange={e => setCommPrompt(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="User prompt..." /></div>}
                    {commTaskType === "speaking" && (
                      <>
                        <div><label className={labelCls}>Prep (s)</label><input type="number" value={commPrepTime} onChange={e => setCommPrepTime(Number(e.target.value))} className={inputCls} /></div>
                        <div><label className={labelCls}>Record (s)</label><input type="number" value={commRecordTime} onChange={e => setCommRecordTime(Number(e.target.value))} className={inputCls} /></div>
                      </>
                    )}
                    {commTaskType === "writing" && (
                      <>
                        <div><label className={labelCls}>Min Words</label><input type="number" value={commMinWords} onChange={e => setCommMinWords(Number(e.target.value))} className={inputCls} /></div>
                        <div><label className={labelCls}>Max Words</label><input type="number" value={commMaxWords} onChange={e => setCommMaxWords(Number(e.target.value))} className={inputCls} /></div>
                      </>
                    )}
                  </>
                 )}
               </div>
            </div>

            <div className={groupCls}>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Content Data</p>
              
              {assessmentType !== "communication" ? (
                <div className="space-y-5">
                  <div><label className={labelCls}>Question Text</label><textarea value={text} onChange={e => setText(e.target.value)} className={`${inputCls} resize-none font-bold`} rows={2} placeholder="Question text..." /></div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls}>Options</label>
                      {options.length < 6 && <button onClick={handleAddOption} className="px-2 py-1 rounded-md bg-brand-green/10 text-[9px] font-black uppercase text-brand-green transition-all hover:bg-brand-green hover:text-white">+ Add</button>}
                    </div>
                    <div className="grid gap-2">
                      {options.map((opt, idx) => {
                        const isCorrect = correctId === opt.id;
                        return (
                          <div key={opt.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all border ${isCorrect ? "bg-brand-green/5 border-brand-green/30" : "bg-white dark:bg-[#111a15] border-[#17201b]/5 dark:border-white/5"}`}>
                            <button type="button" onClick={() => setCorrectId(opt.id)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black transition-all ${isCorrect ? "bg-brand-green text-white shadow-sm" : "bg-brand-green/5 text-brand-green"}`}>
                              {isCorrect ? <CheckCircle2 size={14} /> : LABELS[idx]}
                            </button>
                            <input value={opt.text} onChange={e => handleOptionChange(idx, e.target.value)} className="flex-1 bg-transparent text-[13px] font-bold focus:outline-none dark:text-white" placeholder={`Option ${LABELS[idx]}...`} />
                            {options.length > 2 && <button onClick={() => handleRemoveOption(idx)} className="p-1.5 text-red-400/30 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div><label className={labelCls}>Rationale</label><textarea value={explanation} onChange={e => setExplanation(e.target.value)} className={`${inputCls} resize-none`} rows={1} placeholder="Correct explanation..." /></div>
                </div>
              ) : (
                ["mcq", "reading", "audio"].includes(commTaskType) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className={labelCls}>Tasks</p>
                      <button onClick={addSubQuestion} className="px-2 py-1 rounded-md bg-brand-green/10 text-[9px] font-black uppercase text-brand-green hover:bg-brand-green hover:text-white transition-all">+ Add Task</button>
                    </div>
                    <div className="space-y-3">
                      {commSubQuestions.map((sq, sqIdx) => (
                        <div key={sq.id} className="rounded-xl bg-white dark:bg-[#111a15] border border-brand-green/10 p-3 shadow-sm">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-green text-[10px] font-black text-white">{sqIdx + 1}</span>
                            <textarea value={sq.text} onChange={e => updateSubQText(sqIdx, e.target.value)} className="flex-1 bg-transparent text-[12px] font-bold focus:outline-none dark:text-white resize-none" rows={1} placeholder="Inquiry..." />
                            <button onClick={() => removeSubQuestion(sqIdx)} className="text-red-400/30 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {sq.options.map((opt, oIdx) => (
                              <div key={opt.id} className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${sq.correctOptionId === opt.id ? "bg-brand-green/5 border-brand-green/40" : "bg-brand-green/5 dark:bg-white/5 border-transparent"}`}>
                                <button onClick={() => setSubQCorrect(sqIdx, opt.id)} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-black ${sq.correctOptionId === opt.id ? "bg-brand-green text-white" : "bg-brand-green/10 text-brand-green"}`}>
                                  {LABELS[oIdx]}
                                </button>
                                <input value={opt.text} onChange={e => updateSubQOption(sqIdx, oIdx, e.target.value)} className="flex-1 bg-transparent text-[11px] font-bold focus:outline-none dark:text-white" placeholder="..." />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 animate-in shake duration-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Validation Errors</p>
                {errors.map((e, i) => <p key={i} className="text-[10px] font-bold text-red-600 dark:text-red-400 leading-relaxed">• {e}</p>)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-brand-green/5 bg-[#f9fbf8] p-5 sm:p-6 dark:border-white/5 dark:bg-[#0b100d]">
           <button onClick={onCancel} className="px-6 py-2.5 rounded-lg border border-[#17201b]/10 text-sm font-bold text-[#17201b] dark:text-white transition-all">
             Cancel
           </button>
           <button onClick={handleSave} className="px-8 py-2.5 rounded-lg bg-brand-green text-sm font-black text-white shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 transition-all">
             {question ? "Save Changes" : "Create Question"}
           </button>
        </div>
      </div>
    </div>
  );
}
