"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AnyQuestion, AssessmentType, QuestionMode,
  ASSESSMENT_TYPE_LABELS, ASSESSMENT_TYPE_DESCRIPTIONS,
  APTITUDE_CATEGORIES,
  MNC_TOPICS, COMM_TASK_LABELS, CommTaskType,
  ROLE_QUESTION_TYPE_LABELS, RoleQuestionType,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
} from "./types";
import { loadQuestions, saveQuestions } from "./storage";
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion as apiDeleteQuestion,
  bulkImportQuestions,
  ApiQuestion,
  CreateQuestionPayload,
} from "./api";
import QuestionCard from "./QuestionCard";
import QuestionEditor from "./QuestionEditor";
import JsonImportPanel from "./JsonImportPanel";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  Plus, Upload, Download, Trash2, Search,
  BookOpen, Beaker, AlertCircle, ArrowLeft,
} from "lucide-react";
import {
  AptitudeIcon,
  CommunicationIcon,
  MNCIcon,
  RoleIcon,
} from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT_COLORS: Record<AssessmentType, { color: string; gradient: string }> = {
  aptitude: { color: "#1ed36a", gradient: "linear-gradient(135deg, #1ed36a 0%, #17b85c 100%)" },
  mnc: { color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" },
  communication: { color: "#06b6d4", gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" },
  role: { color: "#84cc16", gradient: "linear-gradient(135deg, #84cc16 0%, #65a30d 100%)" },
};

const MODULE_ICONS: Record<AssessmentType, React.ReactNode> = {
  aptitude: <AptitudeIcon className="w-7 h-7" />,
  mnc: <MNCIcon className="w-7 h-7" />,
  communication: <CommunicationIcon className="w-7 h-7" />,
  role: <RoleIcon className="w-7 h-7" />,
};

const MODULE_TAGS: Record<AssessmentType, string[]> = {
  aptitude: ["Quantitative", "Logical", "Data", "Abstract"],
  mnc: ["DSA", "System Design", "Culture", "HR Prep"],
  communication: ["Listening", "Speaking", "Reading", "Writing"],
  role: ["Concepts", "Scenarios", "Judgement", "Role fit"],
};

function getCatKey(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": return (q as AptitudeQuestion).category;
    case "mnc": return (q as MNCQuestion).topic;
    case "communication": return (q as CommQuestion).taskType;
    case "role": return (q as RoleQuestion).questionType;
  }
}

function getFilterCategories(t: AssessmentType): { key: string; label: string }[] {
  switch (t) {
    case "aptitude": return APTITUDE_CATEGORIES.map(c => ({ key: c, label: `${c}` }));
    case "mnc": return MNC_TOPICS.map(c => ({ key: c, label: c }));
    case "communication": return (Object.entries(COMM_TASK_LABELS) as [CommTaskType, string][]).map(([k, v]) => ({ key: k, label: v }));
    case "role": return (Object.entries(ROLE_QUESTION_TYPE_LABELS) as [RoleQuestionType, string][]).map(([k, v]) => ({ key: k, label: v }));
  }
}

function getSearchText(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": { const a = q as AptitudeQuestion; return `${a.text} ${a.category}`.toLowerCase(); }
    case "mnc": { const m = q as MNCQuestion; return `${m.text} ${m.topic}`.toLowerCase(); }
    case "communication": { const c = q as CommQuestion; return `${c.instructions} ${c.prompt || ""} ${c.questions?.map(sq => sq.text).join(" ") || ""}`.toLowerCase(); }
    case "role": { const r = q as RoleQuestion; return `${r.text} ${r.category || r.questionType || ""} ${r.title || ""} ${r.scenarioContext || ""}`.toLowerCase(); }
  }
}

// ─── API ↔ Frontend shape converters ───────────────────────────────────────────

function apiToFrontend(module: AssessmentType, q: ApiQuestion): AnyQuestion {
  const common = {
    id: String(q.id),
    text: q.questionText,
    options: q.options.map(o => ({ id: String(o.id), text: o.text })),
    correctOptionId: q.correctOptionId ? String(q.correctOptionId) : "",
    explanation: q.explanation || undefined,
    assessmentId: q.assessmentId,
    difficulty: q.difficulty,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    status: q.status,
    imageUrl: q.imageUrl,
  };

  switch (module) {
    case "aptitude":
      return { ...common, category: q.category } as AptitudeQuestion;
    case "mnc":
      return { ...common, topic: q.category } as MNCQuestion;
    case "communication":
      return { ...common, taskType: q.category as CommTaskType, instructions: q.questionText } as unknown as CommQuestion;
    case "role":
      return { ...common, questionType: q.category as RoleQuestionType } as RoleQuestion;
    default:
      return common as any;
  }
}

function frontendToPayload(module: AssessmentType, q: AnyQuestion): CreateQuestionPayload {
  const common = q as any;
  const correctIdx = common.options?.findIndex((o: any) => o.id === common.correctOptionId) ?? 0;
  
  let category = "";
  switch (module) {
    case "aptitude": category = (q as AptitudeQuestion).category; break;
    case "mnc": category = (q as MNCQuestion).topic; break;
    case "communication": category = (q as CommQuestion).taskType; break;
    case "role": category = (q as RoleQuestion).questionType; break;
  }

  return {
    category,
    difficulty: common.difficulty || "medium",
    questionText: common.text || common.instructions || "",
    options: common.options?.map((o: any) => ({ text: o.text })),
    correctOptionIndex: correctIdx >= 0 ? correctIdx : 0,
    explanation: common.explanation,
    marks: common.marks ?? 1,
    negativeMarks: common.negativeMarks ?? 0,
    status: common.status || "active",
    imageUrl: common.imageUrl,
    assessmentId: common.assessmentId,
  };
}

// All modules except specialized ones are now DB-backed
const isDbModule = (m: AssessmentType | null): m is AssessmentType => 
  m === "aptitude" || m === "mnc" || m === "communication" || m === "role";

export default function AdminQuestionsManager() {
  const [selectedModule, setSelectedModule] = useState<AssessmentType | null>(null);
  const [mode, setMode] = useState<QuestionMode>("trial");
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [view, setView] = useState<"list" | "json-import">("list");
  const [editingQuestion, setEditingQuestion] = useState<AnyQuestion | null | "new">(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  // ─── Load questions: API for DB modules, localStorage for others ─────────────
  const loadQuestionsForModule = useCallback(async (module: AssessmentType, m: QuestionMode) => {
    setLoading(true);
    try {
      if (isDbModule(module)) {
        const apiQuestions = await fetchQuestions(module);
        setQuestions(apiQuestions.map(q => apiToFrontend(module, q)));
      } else {
        setQuestions(loadQuestions(module, m));
      }
    } catch (err) {
      console.error("Failed to load questions:", err);
      // Fallback to localStorage if API fails
      setQuestions(loadQuestions(module, m));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedModule) return;
    loadQuestionsForModule(selectedModule, mode);
    setFilterCategory("all");
    setSearchQuery("");
  }, [selectedModule, mode, loadQuestionsForModule]);

  // Auto-save to localStorage ONLY for non-DB modules
  useEffect(() => {
    if (!selectedModule || isDbModule(selectedModule)) return;
    saveQuestions(selectedModule, mode, questions);
  }, [questions, selectedModule, mode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filterCats = useMemo(() => selectedModule ? getFilterCategories(selectedModule) : [], [selectedModule]);

  const filtered = useMemo(() => {
    if (!selectedModule) return [];
    let result = questions;
    if (filterCategory !== "all") result = result.filter(q => getCatKey(q, selectedModule) === filterCategory);
    if (searchQuery.trim()) {
      const lq = searchQuery.toLowerCase();
      result = result.filter(q => getSearchText(q, selectedModule).includes(lq));
    }
    return result;
  }, [questions, filterCategory, searchQuery, selectedModule]);

  const categoryCounts = useMemo(() => {
    if (!selectedModule) return {};
    const counts: Record<string, number> = { all: questions.length };
    filterCats.forEach(c => { counts[c.key] = questions.filter(q => getCatKey(q, selectedModule) === c.key).length; });
    return counts;
  }, [questions, filterCats, selectedModule]);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  // ─── CRUD handlers ─────────────────────────────────────────────────────────────
  const handleSaveQuestion = async (q: AnyQuestion) => {
    const qId = (q as { id: string }).id;
    const isExisting = questions.find(ex => (ex as { id: string }).id === qId);

    if (isDbModule(selectedModule)) {
      try {
        setLoading(true);
        const payload = frontendToPayload(selectedModule!, q);
        if (isExisting && !qId.startsWith("new-")) {
          await updateQuestion(selectedModule!, Number(qId), payload);
          showToast("Question updated");
        } else {
          await createQuestion(selectedModule!, payload);
          showToast("Question added");
        }
        await loadQuestionsForModule(selectedModule!, mode);
      } catch (err) {
        showToast((err as Error).message || "Save failed", "error");
      } finally {
        setLoading(false);
      }
    } else {
      if (isExisting) { 
        setQuestions(questions.map(ex => ((ex as { id: string }).id === qId ? q : ex))); 
        showToast("Question updated"); 
      } else { 
        setQuestions([...questions, q]); 
        showToast("Question added"); 
      }
    }
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (isDbModule(selectedModule)) {
      try {
        setLoading(true);
        await apiDeleteQuestion(selectedModule!, Number(id));
        showToast("Question deleted");
        await loadQuestionsForModule(selectedModule!, mode);
      } catch (err) {
        showToast((err as Error).message || "Delete failed", "error");
      } finally {
        setLoading(false);
      }
    } else {
      setQuestions(questions.filter(q => (q as { id: string }).id !== id));
      showToast("Question deleted");
    }
    setDeleteConfirm(null);
  };

  const handleImport = async (imported: AnyQuestion[]) => {
    if (isDbModule(selectedModule)) {
      try {
        setLoading(true);
        const payloads = imported.map(q => frontendToPayload(selectedModule!, q));
        const res = await bulkImportQuestions(selectedModule!, payloads);
        showToast(`Imported ${res.imported} questions`);
        await loadQuestionsForModule(selectedModule!, mode);
      } catch (err) {
        showToast((err as Error).message || "Import failed", "error");
      } finally {
        setLoading(false);
      }
    } else {
      setQuestions([...questions, ...imported]);
      showToast(`${imported.length} questions imported`);
    }
    setView("list");
  };

  const handleClearAll = () => {
    if (isDbModule(selectedModule)) {
      showToast("Clear All not supported for DB modules yet", "error");
    } else {
      setQuestions([]);
      showToast("All questions cleared");
    }
    setClearConfirm(false);
  };

  const handleExport = () => {
    const data = JSON.stringify(questions, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `originbi-${selectedModule}-questions.json`;
    link.click();
    showToast("Export successful");
  };

  if (!selectedModule) {
    return (
      <div className="min-h-screen bg-[#fcfdfc] dark:bg-[#0a0f0d] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <Logo className="h-12 w-auto mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-[#17201b] dark:text-white mb-4 tracking-tight">Question Management</h1>
          <p className="text-[#17201b]/60 dark:text-white/60 text-lg max-w-md mx-auto">Select a module to manage its question bank and assessments.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((key) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModule(key)}
              className="relative group overflow-hidden bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 p-8 rounded-2xl text-left transition-all hover:shadow-2xl hover:shadow-[#17201b]/5 dark:hover:shadow-white/5"
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity pointer-events-none"
                style={{ color: ACCENT_COLORS[key].color }}
              >
                {MODULE_ICONS[key]}
              </div>
              
              <div className="flex items-start gap-5 mb-6">
                <div 
                  className="p-4 rounded-xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${ACCENT_COLORS[key].color}15`, color: ACCENT_COLORS[key].color }}
                >
                  {MODULE_ICONS[key]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#17201b] dark:text-white mb-1 group-hover:text-[#1ed36a] transition-colors">{ASSESSMENT_TYPE_LABELS[key]}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#17201b]/40 dark:text-white/40">Question Bank</p>
                </div>
              </div>
              
              <p className="text-[#17201b]/70 dark:text-white/70 text-sm leading-relaxed mb-6">
                {ASSESSMENT_TYPE_DESCRIPTIONS[key]}
              </p>

              <div className="flex flex-wrap gap-2">
                {MODULE_TAGS[key].map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-md bg-[#17201b]/5 dark:bg-white/5 text-[#17201b]/50 dark:text-white/50 text-[10px] font-bold tracking-widest uppercase">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const accent = ACCENT_COLORS[selectedModule];

  return (
    <div className="min-h-screen bg-[#fcfdfc] dark:bg-[#0a0f0d] text-[#17201b] dark:text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-[#17201b]/5 dark:border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSelectedModule(null)}
              className="p-2 hover:bg-[#17201b]/5 dark:hover:bg-white/5 rounded-lg transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-[#17201b]/60 dark:text-white/60 group-hover:text-[#17201b] dark:group-hover:text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${accent.color}15`, color: accent.color }}>
                {MODULE_ICONS[selectedModule]}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{ASSESSMENT_TYPE_LABELS[selectedModule]}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1ed36a]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#17201b]/40 dark:text-white/40">
                    {questions.length} Questions Loaded
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#17201b]/5 dark:bg-white/5 p-1 rounded-xl mr-2">
              <button
                onClick={() => setMode("trial")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === "trial" ? "bg-white dark:bg-[#1a231f] text-[#1ed36a] shadow-sm" : "text-[#17201b]/40 dark:text-white/40"}`}
              >
                Trial Mode
              </button>
              <button
                onClick={() => setMode("main")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === "main" ? "bg-white dark:bg-[#1a231f] text-[#1ed36a] shadow-sm" : "text-[#17201b]/40 dark:text-white/40"}`}
              >
                Main Bank
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {view === "list" ? (
          <>
            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#17201b]/30 dark:text-white/30 group-focus-within:text-[#1ed36a] transition-colors" />
                <input
                  type="text"
                  placeholder={`Search ${ASSESSMENT_TYPE_LABELS[selectedModule]}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1ed36a]/20 focus:border-[#1ed36a] transition-all text-sm font-medium"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-3.5 bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1ed36a]/20 text-sm font-bold min-w-[160px]"
                >
                  <option value="all">All Categories ({categoryCounts.all})</option>
                  {filterCats.map(c => (
                    <option key={c.key} value={c.key}>{c.label} ({categoryCounts[c.key] || 0})</option>
                  ))}
                </select>

                <div className="w-px h-8 bg-[#17201b]/5 dark:bg-white/5 mx-1" />

                <button
                  onClick={() => setEditingQuestion("new")}
                  className="flex items-center gap-2 px-6 py-3.5 bg-[#17201b] dark:bg-white text-white dark:text-[#0a0f0d] rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#17201b]/10 dark:shadow-white/5"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
                <button
                  onClick={() => setView("json-import")}
                  className="p-3.5 bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 rounded-xl hover:bg-[#17201b]/5 dark:hover:bg-white/5 transition-colors"
                  title="Import JSON"
                >
                  <Upload className="w-4 h-4 text-[#17201b]/60 dark:text-white/60" />
                </button>
                <button
                  onClick={handleExport}
                  className="p-3.5 bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 rounded-xl hover:bg-[#17201b]/5 dark:hover:bg-white/5 transition-colors"
                  title="Export JSON"
                >
                  <Download className="w-4 h-4 text-[#17201b]/60 dark:text-white/60" />
                </button>
                <button
                  onClick={() => setClearConfirm(true)}
                  className="p-3.5 bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 rounded-xl hover:bg-rose-500/10 hover:border-rose-500/20 group transition-colors"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4 text-rose-500/60 group-hover:text-rose-500" />
                </button>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="w-10 h-10 border-4 border-[#1ed36a] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold tracking-widest uppercase text-[#17201b]/40 dark:text-white/40">Synchronizing database...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filtered.map((q, idx) => (
                  <QuestionCard
                    key={(q as any).id}
                    question={q}
                    index={idx}
                    assessmentType={selectedModule!}
                    onEdit={() => setEditingQuestion(q)}
                    onDelete={() => setDeleteConfirm((q as any).id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-[#121a16] border border-[#17201b]/5 dark:border-white/5 rounded-2xl border-dashed">
                <div className="p-4 rounded-full bg-[#17201b]/5 dark:bg-white/5 mb-6">
                  <Search className="w-8 h-8 text-[#17201b]/20 dark:text-white/20" />
                </div>
                <h3 className="text-xl font-bold text-[#17201b] dark:text-white mb-2">No questions found</h3>
                <p className="text-[#17201b]/40 dark:text-white/40 text-sm max-w-xs text-center">
                  Try adjusting your search query or filters to find what you&apos;re looking for.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <JsonImportPanel
              type={selectedModule}
              onImport={handleImport}
              onCancel={() => setView("list")}
            />
          </div>
        )}
      </main>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingQuestion && (
          <QuestionEditor
            question={editingQuestion === "new" ? null : editingQuestion}
            type={selectedModule}
            onSave={handleSaveQuestion}
            onCancel={() => setEditingQuestion(null)}
          />
        )}
      </AnimatePresence>

      {/* Popups & Toasts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === "success" 
                ? "bg-[#17201b] dark:bg-white text-white dark:text-[#0a0f0d] border-[#1ed36a]/20" 
                : "bg-rose-500 text-white border-rose-600"
            }`}
          >
            {toast.type === "success" ? <Beaker className="w-5 h-5 text-[#1ed36a]" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-tight">{toast.msg}</span>
          </motion.div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0a0f0d]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Question?</h3>
              <p className="text-[#17201b]/60 dark:text-white/60 text-sm mb-8">This action is permanent and will remove the question from the database.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3.5 bg-[#17201b]/5 dark:bg-white/5 rounded-xl font-bold text-sm hover:bg-[#17201b]/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteQuestion(deleteConfirm)}
                  className="flex-1 px-6 py-3.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {clearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0a0f0d]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#121a16] border border-[#17201b]/10 dark:border-white/10 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Clear Question Bank?</h3>
              <p className="text-[#17201b]/60 dark:text-white/60 text-sm mb-8">Are you sure you want to delete ALL questions for this module?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setClearConfirm(false)}
                  className="flex-1 px-6 py-3.5 bg-[#17201b]/5 dark:bg-white/5 rounded-xl font-bold text-sm hover:bg-[#17201b]/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-6 py-3.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
