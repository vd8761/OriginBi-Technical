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
import CustomSelect from "@/components/ui/CustomSelect";

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
  
  // DB-backed fields
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [marks, setMarks] = useState(1);
  const [negMarks, setNegMarks] = useState(0.25);
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
    const diff = q.difficulty || "medium";
    setDifficulty(diff);
    // Auto-standardize marks on load based on difficulty
    if (diff === 'easy') setMarks(1);
    else if (diff === 'medium') setMarks(2);
    else if (diff === 'hard') setMarks(5);
    else setMarks(q.marks ?? 1);
    setNegMarks(0.25); // Always 0.25
    setStatus(q.status || "active");
    setAssessmentId(q.assessmentId);

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
      const filledOptions = options.filter(o => o.text.trim());
      if (filledOptions.length < 2) errs.push("At least 2 non-empty options required.");
      if (filledOptions.length > 6) errs.push("Maximum 6 options allowed.");
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const id = question ? (question as { id: string }).id : generateId();

    const common = {
      id,
      difficulty,
      marks,
      negativeMarks: 0.25,
      status,
      assessmentId,
    };

    switch (assessmentType) {
      case "aptitude":
        onSave({ ...common, category: aptCategory, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, explanation: explanation.trim() || undefined } as AptitudeQuestion);
        break;
      case "mnc":
        onSave({ ...common, topic: mncTopic, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, explanation: explanation.trim() || undefined } as MNCQuestion);
        break;
      case "role":
        onSave({
          ...common, questionType: roleType, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, explanation: explanation.trim() || undefined,
          ...(roleType === "conceptual" ? { category: roleCategory, subCategory: roleSubCategory } : {}),
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

  const groupCls = "rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-4 transition-all";
  const inputCls = "mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[13px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:border-brand-green/40 focus:ring-4 focus:ring-brand-green/5 focus:outline-none transition-all";
  const labelCls = "text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0b100d]/80 backdrop-blur-md" />
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-brand-dark-primary shadow-2xl">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{question ? "Update Question" : "Add Question"}</h2>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-brand-green">Assessment: {assessmentType}</p>
          </div>
          <button onClick={onCancel} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-red-500 hover:text-white transition-all"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-6 p-6">
            
            <div className={groupCls}>
               <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Core Configuration</p>
               <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <CustomSelect
                      label="Difficulty"
                      value={difficulty}
                      onChange={(v) => {
                        const d = v as DifficultyLevel;
                        setDifficulty(d);
                        // Auto-assign marks based on difficulty
                        if (d === 'easy') setMarks(1);
                        else if (d === 'medium') setMarks(2);
                        else if (d === 'hard') setMarks(5);
                      }}
                      options={[
                        { label: 'Easy', value: 'easy' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'Hard', value: 'hard' }
                      ]}
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Status"
                      value={status}
                      onChange={(v) => setStatus(v as QuestionStatus)}
                      options={[
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Marks</label>
                    <input type="number" value={marks} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className={labelCls}>Negative Marks</label>
                    <input type="number" value={0.25} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
                  </div>

                 {assessmentType === "aptitude" && (
                  <div className="sm:col-span-2">
                    <CustomSelect
                      label="Aptitude Category"
                      value={aptCategory}
                      onChange={setAptCategory}
                      options={APTITUDE_CATEGORIES.map(c => ({ label: APTITUDE_CATEGORY_LABELS[c], value: c }))}
                    />
                  </div>
                 )}
                 {assessmentType === "mnc" && (
                  <div className="sm:col-span-2">
                    <CustomSelect
                      label="Topic Vector"
                      value={mncTopic}
                      onChange={setMncTopic}
                      options={MNC_TOPICS.map(t => ({ label: t, value: t }))}
                    />
                  </div>
                 )}
                 {assessmentType === "role" && (
                  <>
                    <div className="sm:col-span-2">
                      <CustomSelect
                        label="Question Logic"
                        value={roleType}
                        onChange={(v) => setRoleType(v as RoleQuestionType)}
                        options={[
                          { label: 'Conceptual Assessment', value: 'conceptual' },
                          { label: 'Simulation / Scenario', value: 'scenario' }
                        ]}
                      />
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
                           <div className="mt-[-2px]"><CustomSelect
                             label="Priority"
                             value={priority}
                             onChange={(v) => setPriority(v as any)}
                             options={["Low", "Medium", "High", "Critical"].map(p => ({ label: p, value: p }))}
                           /></div>
                           <div><label className={labelCls}>Unit</label><input value={reportedBy} onChange={e => setReportedBy(e.target.value)} className={inputCls} placeholder="Support" /></div>
                        </div>
                      </div>
                    )}
                  </>
                 )}
                 {assessmentType === "communication" && (
                  <>
                    <div className="sm:col-span-2">
                      <CustomSelect
                        label="Task Modality"
                        value={commTaskType}
                        onChange={(v) => setCommTaskType(v as CommTaskType)}
                        options={Object.entries(COMM_TASK_LABELS).map(([k, v]) => ({ label: v, value: k }))}
                      />
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
                    <div className="grid gap-3">
                      {options.map((opt, idx) => {
                        const isCorrect = correctId === opt.id;
                        return (
                          <div key={opt.id} className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setCorrectId(opt.id)}
                              title="Set as correct answer"
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${isCorrect ? "border-brand-green bg-brand-green text-white shadow-md" : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-300 dark:text-white/10 hover:border-slate-300 dark:hover:border-white/20"}`}
                            >
                              {isCorrect ? <CheckCircle2 size={18} /> : <span className="text-[12px] font-black">{LABELS[idx]}</span>}
                            </button>
                            <input
                              value={opt.text}
                              onChange={e => handleOptionChange(idx, e.target.value)}
                              className={inputCls}
                              placeholder={`Option ${LABELS[idx]}...`}
                            />
                            {options.length > 2 && (
                              <button onClick={() => handleRemoveOption(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            )}
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
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] px-6 py-4 backdrop-blur-md">
           <button onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
             Cancel
           </button>
           <div className="flex items-center gap-3">
             <button onClick={handleSave} className="px-8 py-2.5 rounded-xl bg-brand-green text-sm font-black text-white shadow-md transition-all">
               {question ? "Update Question" : "Create Question"}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
