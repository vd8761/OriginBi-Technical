"use client";

import React, { useState, useEffect } from "react";
import {
  AnyQuestion, AssessmentType, QuestionOption,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
  APTITUDE_CATEGORIES, APTITUDE_CATEGORY_LABELS, MNC_TOPICS,
  COMM_TASK_LABELS, CommTaskType, RoleQuestionType,
  DifficultyLevel, QuestionStatus, QuestionKind, QUESTION_KIND_LABELS,
  matchCategory, matchSubcategory
} from "./types";
import { generateId } from "./storage";
import { uploadQuestionAsset } from "./api";
import { X, Plus, Trash2, CheckCircle2, Image, Music, UploadCloud, CheckSquare, Square } from "lucide-react";
import { McqEditor } from "./question-types/McqEditor";
import { MsqEditor } from "./question-types/MsqEditor";
import { TfEditor } from "./question-types/TfEditor";
import { NumericalEditor } from "./question-types/NumericalEditor";
import CustomSelect from "@/components/ui/CustomSelect";

interface QuestionEditorProps {
  question: AnyQuestion | null;
  assessmentType: AssessmentType;
  allowedQuestionKinds?: QuestionKind[];
  categories?: { id: string; name: string; subcategories?: any[] }[];
  onSave: (q: AnyQuestion) => void;
  onCancel: () => void;
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

export default function QuestionEditor({
  question,
  assessmentType,
  allowedQuestionKinds = ["mcq", "msq", "tf"],
  categories = [],
  onSave,
  onCancel,
}: QuestionEditorProps) {
  // Common state
  const [text, setText] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: "opt_0", text: "" }, { id: "opt_1", text: "" },
    { id: "opt_2", text: "" }, { id: "opt_3", text: "" },
  ]);
  const [correctId, setCorrectId] = useState("opt_0");
  const [correctIds, setCorrectIds] = useState<string[]>(["opt_0"]);
  const [kind, setKind] = useState<QuestionKind>(allowedQuestionKinds[0] || "mcq");

  // Cloudflare R2 Upload States
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Local File States (for deferred uploads on form save)
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasNewFile, setHasNewFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // DB-backed fields
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [marks, setMarks] = useState(1);
  const [negMarks, setNegMarks] = useState(0.25);
  const [status, setStatus] = useState<QuestionStatus>("active");
  const [assessmentId, setAssessmentId] = useState<number | undefined>(undefined);

  // Aptitude
  const [aptCategory, setAptCategory] = useState("QA");
  const [aptSubCategory, setAptSubCategory] = useState("");
  const [explanation, setExplanation] = useState("");
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
  const [commCategory, setCommCategory] = useState("");
  const [commSubCategory, setCommSubCategory] = useState("");
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
  const availableQuestionKinds = allowedQuestionKinds.includes(kind)
    ? allowedQuestionKinds
    : [...allowedQuestionKinds, kind];

  // Populate from existing question
  useEffect(() => {
    if (!question) {
      const firstCat = categories?.[0];
      if (firstCat) {
        if (assessmentType === "aptitude") setAptCategory(firstCat.id);
        else if (assessmentType === "mnc") setMncTopic(firstCat.id);
        else if (assessmentType === "communication") {
          setCommCategory(firstCat.id);
          const firstSub = firstCat.subcategories?.[0];
          if (firstSub) {
            setCommSubCategory(firstSub.id);
          }
        }
      }
      return;
    }
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
        let resolvedCategory = aq.category;
        if (categories && categories.length > 0) {
          const matched = categories.find(c => matchCategory(aq.category, c.id));
          if (matched) {
            resolvedCategory = matched.id;
          }
        }
        setAptCategory(resolvedCategory);

        let resolvedSubCategory = aq.subcategory || "";
        if (categories && categories.length > 0) {
          const matchedCat = categories.find(c => matchCategory(resolvedCategory, c.id));
          if (matchedCat && matchedCat.subcategories) {
            const matchedSub = matchedCat.subcategories.find((sc: any) => matchSubcategory(resolvedSubCategory, sc.id) || matchSubcategory(resolvedSubCategory, sc.name));
            if (matchedSub) {
              resolvedSubCategory = matchedSub.id;
            }
          }
        }
        setAptSubCategory(resolvedSubCategory);

        setText(aq.text); setOptions(aq.options); setCorrectId(aq.correctOptionId);
        setExplanation(aq.explanation || "");
        setImageUrl(aq.imageUrl || null);
        break;
      }
      case "mnc": {
        const mq = question as MNCQuestion;
        setText(mq.text); setOptions(mq.options); setCorrectId(mq.correctOptionId);
        setMncTopic(mq.topic);
        setExplanation(mq.explanation || "");
        setImageUrl(mq.imageUrl || null);
        break;
      }
      case "role": {
        const rq = question as RoleQuestion;
        setText(rq.text); setOptions(rq.options); setCorrectId(rq.correctOptionId);
        setRoleType(rq.questionType);
        setRoleCategory(rq.category || ""); setRoleSubCategory(rq.subCategory || "");
        setScenarioTitle(rq.title || ""); setScenarioContext(rq.scenarioContext || "");
        setTicketId(rq.ticketId || ""); setPriority(rq.priority || "Medium");
        setReportedBy(rq.reportedBy || "");
        setExplanation(rq.explanation || "");
        setImageUrl(rq.imageUrl || null);
        break;
      }
      case "communication": {
        const cq = question as CommQuestion;
        setCommCategory(cq.category || "");
        setCommSubCategory(cq.subcategory || "");
        setText(cq.text || cq.instructions || "");
        setOptions(cq.options || [
          { id: "opt_0", text: "" }, { id: "opt_1", text: "" },
          { id: "opt_2", text: "" }, { id: "opt_3", text: "" }
        ]);
        if (cq.correctOptionId) {
          setCorrectId(cq.correctOptionId);
          setCorrectIds([cq.correctOptionId]);
        }
        setExplanation(cq.explanation || "");
        setImageUrl(cq.imageUrl || null);
        break;
      }
    }

    if (q.kind) setKind(q.kind);
    if (q.correctOptionIds) setCorrectIds(q.correctOptionIds);
    else if (q.correctOptionId) setCorrectIds([q.correctOptionId]);
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

  const handleKindChange = (newKind: QuestionKind) => {
    setKind(newKind);
    if (newKind === "tf") {
      const tfOptions = [
        { id: "opt_true", text: "True" },
        { id: "opt_false", text: "False" }
      ];
      setOptions(tfOptions);
      setCorrectId("opt_true");
      setCorrectIds(["opt_true"]);
    } else if (newKind === "numerical") {
      setOptions([]);
      setCorrectId("");
      setCorrectIds([]);
    } else if (kind === "tf" || kind === "numerical") {
      // Revert from TF/Numerical to MCQ/MSQ
      setOptions([
        { id: "opt_0", text: "" }, { id: "opt_1", text: "" },
        { id: "opt_2", text: "" }, { id: "opt_3", text: "" },
      ]);
      setCorrectId("opt_0");
      setCorrectIds(["opt_0"]);
    }
  };

  const toggleCorrectId = (id: string) => {
    if (kind === "msq") {
      if (correctIds.includes(id)) {
        if (correctIds.length > 1) setCorrectIds(correctIds.filter(i => i !== id));
      } else {
        setCorrectIds([...correctIds, id]);
      }
    } else {
      setCorrectId(id);
      setCorrectIds([id]);
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: "image" | "audio") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const preview = URL.createObjectURL(file);
    setLocalFile(file);
    setPreviewUrl(preview);
    setHasNewFile(true);

    if (fileType === "image") {
      setImageUrl(preview);
    } else {
      setAudioUrl(preview);
    }
  };

  const handleClearFile = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setLocalFile(null);
    setPreviewUrl(null);
    setImageUrl(null);
    setAudioUrl(null);
    setHasNewFile(false);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!text.trim()) errs.push("Question text required.");
    if (kind === "numerical") {
      if (!explanation.trim()) errs.push("Correct answer (Numerical) required in the explanation or specific field.");
      if (!(question as any)?.correctAnswer && !explanation.trim()) errs.push("Numerical answer required.");
    } else {
      const filledOptions = options.filter(o => o.text.trim());
      if (filledOptions.length < 2) errs.push("At least 2 non-empty options required.");
      if (filledOptions.length > 6) errs.push("Maximum 6 options allowed.");
      
      if (kind === "msq" && correctIds.length === 0) errs.push("At least one correct option required.");
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    let finalImageUrl = imageUrl;
    let finalAudioUrl = audioUrl;

    try {
      setIsSaving(true);

      // Upload file to R2 only on form submission
      if (hasNewFile && localFile) {
        const res = await uploadQuestionAsset(assessmentType, localFile);
        if (localFile.type.startsWith("image/")) {
          finalImageUrl = res.url;
        } else if (localFile.type.startsWith("audio/")) {
          finalAudioUrl = res.url;
        }
      }

      const id = question ? (question as { id: string }).id : generateId();

      const common = {
        id,
        difficulty,
        marks,
        negativeMarks: 0.25,
        status,
        assessmentId,
        explanation: explanation.trim(),
        kind,
        correctOptionIds: kind === "msq" ? correctIds : [correctId],
        correctAnswer: kind === "numerical" ? explanation.trim() : undefined, // Using explanation for numerical answer as a shortcut if needed, or add a state
      };

      switch (assessmentType) {
        case "aptitude":
          onSave({ ...common, category: aptCategory, subcategory: aptSubCategory, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, imageUrl: finalImageUrl } as AptitudeQuestion);
          break;
        case "mnc":
          onSave({ ...common, topic: mncTopic, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, imageUrl: finalImageUrl } as MNCQuestion);
          break;
        case "role":
          onSave({
            ...common, questionType: roleType, text: text.trim(), options: options.filter(o => o.text.trim()), correctOptionId: correctId, imageUrl: finalImageUrl,
            ...(roleType === "conceptual" ? { category: roleCategory, subCategory: roleSubCategory } : {}),
            ...(roleType === "scenario" ? { title: scenarioTitle, scenarioContext, ticketId, priority, reportedBy } : {}),
          } as RoleQuestion);
          break;
        case "communication":
          onSave({
            ...common,
            taskType: commTaskType,
            instructions: commInstructions.trim(),
            category: commCategory.trim(),
            subcategory: commSubCategory.trim(),
            text: text.trim(),
            options: options.filter(o => o.text.trim()),
            correctOptionId: correctId,
            ...(finalAudioUrl ? { audioUrl: finalAudioUrl } : {}),
            ...(commPassage ? { passage: commPassage } : {}),
            ...(commPrompt ? { prompt: commPrompt } : {}),
            ...(commTaskType === "speaking" ? { prepTimeSeconds: commPrepTime, recordTimeSeconds: commRecordTime } : {}),
            ...(commTaskType === "writing" ? { minWords: commMinWords, maxWords: commMaxWords } : {}),
            ...(commSubQuestions.length > 0 ? { questions: commSubQuestions } : {}),
          } as CommQuestion);
          break;
      }
    } catch (err: any) {
      alert(`Failed to save question: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const groupCls = "rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-4 transition-all";
  const inputCls = "mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[13px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:border-slate-300 dark:focus:border-white/20 focus:outline-none transition-all";
  const labelCls = "text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0b100d]/80 backdrop-blur-md z-0" />
      <div 
        className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl"
        style={{ backgroundColor: "var(--admin-bg-soft)" }}
      >
        
        {/* Header */}
        <div 
          className="shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-white/5 p-6"
          style={{ backgroundColor: "var(--admin-surface-2)" }}
        >
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

                  <div className="sm:col-span-2">
                    <CustomSelect
                      label="Question Format"
                      value={kind}
                      onChange={(v) => handleKindChange(v as QuestionKind)}
                      options={availableQuestionKinds.map((questionKind) => ({
                        label: QUESTION_KIND_LABELS[questionKind],
                        value: questionKind,
                      }))}
                    />
                  </div>

                 {assessmentType === "aptitude" && (
                   <div className="sm:col-span-2 space-y-4">
                     <CustomSelect
                       label="Aptitude Category"
                       value={aptCategory}
                       onChange={(v) => {
                         setAptCategory(v);
                         setAptSubCategory(""); // Reset subcategory on category change
                       }}
                       options={
                         categories && categories.length > 0
                           ? categories.map(c => ({ label: c.name, value: c.id }))
                           : APTITUDE_CATEGORIES.map(c => ({ label: APTITUDE_CATEGORY_LABELS[c], value: c }))
                       }
                     />
                     
                     <CustomSelect
                       label="Aptitude Subcategory"
                       value={aptSubCategory}
                       onChange={setAptSubCategory}
                       options={(() => {
                         if (!categories || categories.length === 0) return [];
                         const selectedCat = (categories as any).find((c: any) => 
                            c.id === aptCategory || 
                            matchCategory(aptCategory, c.id) || 
                            String(c.id) === String(aptCategory)
                          );
                         if (selectedCat && selectedCat.subcategories) {
                           return selectedCat.subcategories.map((sc: any) => ({ label: sc.name, value: sc.id }));
                         }
                         return [];
                       })()}
                     />
                   </div>
                  )}
                 {assessmentType === "mnc" && (
                  <div className="sm:col-span-2">
                    <CustomSelect
                      label="Core Topic"
                      value={mncTopic}
                      onChange={setMncTopic}
                      options={
                        categories && categories.length > 0
                          ? categories.map(t => ({ label: t.name, value: t.id }))
                          : MNC_TOPICS.map(t => ({ label: t, value: t }))
                      }
                    />
                  </div>
                 )}
                 {assessmentType === "role" && (
                  <>
                    <div className="sm:col-span-2">
                      <CustomSelect
                        label="Question Type"
                        value={roleType}
                        onChange={(v) => setRoleType(v as RoleQuestionType)}
                        options={[
                          { label: 'Knowledge Check', value: 'conceptual' },
                          { label: 'Real-world Case', value: 'scenario' }
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
                        <div><label className={labelCls}>Case Study Title</label><input value={scenarioTitle} onChange={e => setScenarioTitle(e.target.value)} className={inputCls} placeholder="System Outage" /></div>
                        <div><label className={labelCls}>Description</label><textarea value={scenarioContext} onChange={e => setScenarioContext(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Describe the situation..." /></div>
                        <div className="grid grid-cols-3 gap-2">
                           <div><label className={labelCls}>Ticket ID</label><input value={ticketId} onChange={e => setTicketId(e.target.value)} className={inputCls} placeholder="INC-001" /></div>
                           <div className="mt-[-2px]"><CustomSelect
                             label="Priority"
                             value={priority}
                             onChange={(v) => setPriority(v as any)}
                             options={["Low", "Medium", "High", "Critical"].map(p => ({ label: p, value: p }))}
                           /></div>
                           <div><label className={labelCls}>Reported By</label><input value={reportedBy} onChange={e => setReportedBy(e.target.value)} className={inputCls} placeholder="Support Team" /></div>
                        </div>
                      </div>
                    )}
                  </>
                 )}
                 {assessmentType === "communication" && (
                  <div className="sm:col-span-2 space-y-4">
                    {categories && categories.length > 0 ? (
                      <>
                        <CustomSelect
                          label="Category"
                          value={commCategory}
                          onChange={(v) => {
                            setCommCategory(v);
                            setCommSubCategory(""); // Reset subcategory on category change
                          }}
                          options={categories.map(c => ({ label: c.name, value: c.id }))}
                        />
                        <CustomSelect
                          label="Sub-Category"
                          value={commSubCategory}
                          onChange={setCommSubCategory}
                          options={(() => {
                            const selectedCat = categories.find((c: any) =>
                              c.id === commCategory ||
                              matchCategory(commCategory, c.id) ||
                              String(c.id) === String(commCategory)
                            );
                            if (selectedCat && selectedCat.subcategories) {
                              return selectedCat.subcategories.map((sc: any) => ({ label: sc.name, value: sc.id }));
                            }
                            return [];
                          })()}
                        />
                      </>
                    ) : (
                      <>
                        <div><label className={labelCls}>Category</label><input value={commCategory} onChange={e => setCommCategory(e.target.value)} className={inputCls} placeholder="Verbal Communication" /></div>
                        <div><label className={labelCls}>Sub-Category</label><input value={commSubCategory} onChange={e => setCommSubCategory(e.target.value)} className={inputCls} placeholder="Self Introduction" /></div>
                      </>
                    )}
                  </div>
                 )}
               </div>
            </div>

            <div className={groupCls}>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-3">Content Data</p>
              
              {assessmentType !== "communication" || true ? (
                <div className="space-y-5">
                  <div><label className={labelCls}>Question Text</label><textarea value={text} onChange={e => setText(e.target.value)} className={`${inputCls} resize-none font-bold`} rows={2} placeholder="Question text..." /></div>
                  
                  <div><label className={labelCls}>Explanation (Admin Only)</label><textarea value={explanation} onChange={e => setExplanation(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Explain the answer for reference..." /></div>
                  
                  {/* Image Upload Area */}
                  <div className="space-y-1.5">
                    <label className={labelCls}>Question Image (Optional)</label>
                    {imageUrl ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-video max-h-40 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Question Asset" className="max-h-full max-w-full object-contain" />
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all shadow-md animate-in fade-in zoom-in duration-200"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-white/[0.01] hover:border-slate-400 dark:hover:border-white/20 cursor-pointer transition-all">
                        <UploadCloud className="h-6 w-6 text-brand-green mb-1.5" />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-white/60">Choose image file</span>
                        <span className="text-[9px] font-medium text-slate-400 mt-0.5">Supports PNG, JPG or WebP</span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, "image")} className="hidden" />
                      </label>
                    )}
                  </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls}>{kind === "numerical" ? "Numerical Answer" : "Options"}</label>
                        {kind !== "tf" && kind !== "numerical" && options.length < 6 && (
                          <button 
                            onClick={handleAddOption} 
                            className="px-2 py-1 rounded-md bg-brand-green/10 text-[9px] font-black uppercase text-brand-green transition-all hover:bg-brand-green hover:text-white"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      
                      {(() => {
                        switch (kind) {
                          case "numerical":
                            return (
                              <NumericalEditor
                                value={explanation}
                                onChange={setExplanation}
                                inputCls={inputCls}
                              />
                            );
                          case "msq":
                            return (
                              <MsqEditor
                                options={options}
                                correctIds={correctIds}
                                onOptionChange={handleOptionChange}
                                onToggleCorrect={toggleCorrectId}
                                onRemoveOption={handleRemoveOption}
                                inputCls={inputCls}
                                labels={LABELS}
                              />
                            );
                          case "tf":
                            return (
                              <TfEditor
                                options={options}
                                correctId={correctId}
                                onToggleCorrect={toggleCorrectId}
                                inputCls={inputCls}
                              />
                            );
                          case "mcq":
                          default:
                            return (
                              <McqEditor
                                options={options}
                                correctId={correctId}
                                onOptionChange={handleOptionChange}
                                onToggleCorrect={toggleCorrectId}
                                onRemoveOption={handleRemoveOption}
                                inputCls={inputCls}
                                labels={LABELS}
                              />
                            );
                        }
                      })()}
                    </div>
                </div>
              ) : null}
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 animate-in shake duration-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Please fix these issues</p>
                {errors.map((e, i) => <p key={i} className="text-[10px] font-bold text-red-600 dark:text-red-400 leading-relaxed">• {e}</p>)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 px-6 py-4"
          style={{ backgroundColor: "var(--admin-surface-2)" }}
        >
           <button onClick={onCancel} className="px-8 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all">
             Cancel
           </button>
           <div className="flex items-center gap-3">
             <button
               onClick={handleSave}
               disabled={isSaving}
               className={`px-8 py-2.5 rounded-xl bg-brand-green text-sm font-semibold text-white transition-all flex items-center gap-2 ${isSaving ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
             >
               {isSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
               {isSaving ? "Uploading & Saving..." : question ? "Update Question" : "Create Question"}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
