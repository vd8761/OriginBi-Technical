"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AnyQuestion, AssessmentType, QuestionMode,
  ASSESSMENT_TYPE_LABELS, ASSESSMENT_TYPE_DESCRIPTIONS,
  APTITUDE_CATEGORIES,
  MNC_TOPICS, COMM_TASK_LABELS, CommTaskType,
  ROLE_QUESTION_TYPE_LABELS, RoleQuestionType,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion,
} from "./types";
import { loadQuestions, saveQuestions } from "./storage";
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
  CodingIcon,
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
    case "role": { const r = q as RoleQuestion; return `${r.text} ${r.category || ""} ${r.title || ""} ${r.scenarioContext || ""}`.toLowerCase(); }
  }
}

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

  useEffect(() => {
    if (!selectedModule) return;
    setQuestions(loadQuestions(selectedModule, mode));
    setFilterCategory("all");
    setSearchQuery("");
  }, [selectedModule, mode]);

  useEffect(() => {
    if (!selectedModule) return;
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

  const handleSaveQuestion = (q: AnyQuestion) => {
    const qId = (q as { id: string }).id;
    const exists = questions.find(ex => (ex as { id: string }).id === qId);
    if (exists) { setQuestions(questions.map(ex => ((ex as { id: string }).id === qId ? q : ex))); showToast("Question updated"); }
    else { setQuestions([...questions, q]); showToast("Question added"); }
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => { setQuestions(questions.filter(q => (q as { id: string }).id !== id)); setDeleteConfirm(null); showToast("Question deleted"); };
  const handleImport = (imported: AnyQuestion[]) => { setQuestions([...questions, ...imported]); setView("list"); showToast(`${imported.length} imported`); };
  const handleClearAll = () => { setQuestions([]); setClearConfirm(false); showToast("Bank cleared"); };
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${selectedModule}_${mode}.json`; a.click(); URL.revokeObjectURL(url); showToast("JSON exported");
  };

  // ─── LANDING ───
  if (!selectedModule) {
    return (
      <div className="relative min-h-screen w-full bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500 overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] assessment-grid" />
        </div>

        <header className="fixed top-0 left-0 right-0 w-full z-50 h-[64px] sm:h-[72px] bg-white/[0.9] dark:bg-[#19211C]/[0.9] backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
            <div className="flex items-center gap-6">
              <Logo className="h-5" />
              <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
              
              {/* Breadcrumbs for Landing */}
              <nav className="hidden md:flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                <span className="text-brand-green">Admin Hub</span>
                <span className="text-slate-300 dark:text-white/10">/</span>
                <span className="text-slate-400 dark:text-slate-500">Question Banks</span>
              </nav>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Assessment Modules</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a module to manage its question library</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((at, idx) => {
                const accent = ACCENT_COLORS[at];
                const trialCount = loadQuestions(at, "trial").length;
                const mainCount = loadQuestions(at, "main").length;
                return (
                  <motion.button
                    key={at}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => { setSelectedModule(at); setView("list"); }}
                    className="dashboard-glass-card !rounded-3xl p-6 flex flex-col transition-all duration-500 group h-full hover:scale-[1.02] hover:border-brand-green/30 text-left hover:shadow-xl dark:bg-white/[0.05]"
                  >
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center justify-center shrink-0 w-14 h-14 rounded-[20px] text-white shadow-lg shadow-brand-green/10 [&_svg]:w-7 [&_svg]:h-7" style={{ background: accent.gradient }}>
                        {MODULE_ICONS[at]}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-snug">{ASSESSMENT_TYPE_LABELS[at]}</h3>
                      </div>
                    </div>

                    <p className="text-[13px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-6 font-medium">{ASSESSMENT_TYPE_DESCRIPTIONS[at]}</p>

                    <div className="flex items-center gap-5 mb-6 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1.5">Trial</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{trialCount} Qs</span>
                      </div>
                      <div className="flex flex-col border-l border-slate-200 dark:border-white/10 pl-5">
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1.5">Main</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{mainCount} Qs</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-6 mt-auto">
                      {MODULE_TAGS[at].map((tag, tIdx) => (
                        <span key={tIdx} className="px-2.5 py-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{tag}</span>
                      ))}
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-6" />

                    <div className="flex items-center justify-end">
                      <div className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-full bg-brand-green text-white shadow-lg shadow-brand-green/20 group-hover:scale-105 transition-all">
                        Configure Bank
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <footer className="py-10 text-center opacity-40">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Origin BI | Powered by Beyond Intelligence</p>
          </footer>
        </main>
      </div>
    );
  }

  // ─── MANAGEMENT ───
  const accent = ACCENT_COLORS[selectedModule];

  return (
    <div className="relative min-h-screen w-full bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] assessment-grid" />
      </div>

      <header className="fixed top-0 left-0 right-0 w-full z-50 h-[64px] sm:h-[72px] bg-white/[0.9] dark:bg-[#19211C]/[0.9] backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          <div className="flex items-center gap-6">
            <button onClick={() => { setSelectedModule(null); setView("list"); }} className="group flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
              <ArrowLeft className="w-4 h-4 text-brand-green group-hover:-translate-x-0.5 transition-transform" />
            </button>
            
            {/* Breadcrumbs for Management */}
            <nav className="hidden md:flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
              <button onClick={() => setSelectedModule(null)} className="text-slate-400 hover:text-brand-green transition-colors">Admin Hub</button>
              <span className="text-slate-300 dark:text-white/10">/</span>
              <button onClick={() => setSelectedModule(null)} className="text-slate-400 hover:text-brand-green transition-colors">Question Banks</button>
              <span className="text-slate-300 dark:text-white/10">/</span>
              <span className="text-brand-green">{ASSESSMENT_TYPE_LABELS[selectedModule]}</span>
            </nav>

            <div className="md:hidden flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg [&_svg]:w-5 [&_svg]:h-5" style={{ background: accent.gradient }}>
                {MODULE_ICONS[selectedModule]}
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight">{ASSESSMENT_TYPE_LABELS[selectedModule]}</p>
                <p className="text-[10px] font-black text-brand-green tracking-widest uppercase">Management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
              <button onClick={() => setMode("trial")} className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${mode === "trial" ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}>Trial</button>
              <button onClick={() => setMode("main")} className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${mode === "main" ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}>Main</button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
        {/* ACTION BAR: ALIGNED WITH MAIN ADMIN UX */}
        <div className="flex flex-col xl:flex-row justify-between gap-4 items-start xl:items-center mb-6">
          {/* Search bar matching main app */}
          <div className="relative w-full xl:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search repository..."
              className="w-full bg-white/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </div>
          </div>
          
          {/* Action Buttons matching main app (Add New, Bulk Import) */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Filter Tabs - subtly adjusted for alignment */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setFilterCategory("all")} 
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${filterCategory === "all" ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}
              >
                All ({questions.length})
              </button>
              {filterCats.map(cat => (
                <button 
                  key={cat.key} 
                  onClick={() => setFilterCategory(cat.key)} 
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterCategory === cat.key ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}
                >
                  {cat.label} ({categoryCounts[cat.key] || 0})
                </button>
              ))}
            </div>
 
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden xl:block mx-1" />
 
            <button 
              onClick={() => setView("json-import")} 
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
            >
              <span>Bulk Import</span>
              <Upload size={16} className="text-brand-green" />
            </button>
 
            <button 
              onClick={() => setEditingQuestion("new")} 
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green rounded-lg text-sm font-semibold text-white hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20"
            >
              <span>Add New</span>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* LIST CONTAINER - Using dashboard-glass-card for consistency */}
        <div className="dashboard-glass-card !rounded-3xl p-8 min-h-[600px] dark:bg-white/[0.04]">
          {view === "json-import" ? (
            <JsonImportPanel assessmentType={selectedModule} mode={mode} onImport={handleImport} onCancel={() => setView("list")} />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-widest">Repository Bank</h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Showing {filtered.length} of {questions.length} entries</p>
                </div>
                <div className="flex items-center gap-6">
                  <button onClick={handleExportJson} className="text-[10px] font-black text-slate-500 hover:text-brand-green transition-all uppercase tracking-[0.15em] flex items-center gap-1.5"><Download size={14} /> Export</button>
                  <button onClick={() => setClearConfirm(true)} className="text-[10px] font-black text-red-400/60 hover:text-red-500 transition-all uppercase tracking-[0.15em] flex items-center gap-1.5"><Trash2 size={14} /> Clear Bank</button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-center mb-6 opacity-40">
                    <AlertCircle size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Zero Results Found</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">No question vectors found for the current filter scope. Try adjusting your search query.</p>
                  <button onClick={() => { setFilterCategory("all"); setSearchQuery(""); }} className="mt-8 px-6 py-2.5 rounded-full border border-brand-green/20 text-[11px] font-black uppercase tracking-widest text-brand-green hover:bg-brand-green hover:text-white transition-all">Reset Explorer</button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((q, qIdx) => (
                    <QuestionCard key={(q as { id: string }).id} question={q} index={qIdx} assessmentType={selectedModule} onEdit={() => setEditingQuestion(q)} onDelete={() => setDeleteConfirm((q as { id: string }).id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {editingQuestion !== null && (
          <QuestionEditor question={editingQuestion === "new" ? null : editingQuestion} assessmentType={selectedModule} onSave={handleSaveQuestion} onCancel={() => setEditingQuestion(null)} />
        )}
      </AnimatePresence>

      {/* Delete/Clear Modals styled with OriginBI theme */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0b100d]/60 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm rounded-[32px] bg-white dark:bg-[#111a15] p-8 shadow-2xl border border-white/20 dark:border-white/5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-red-500/10 text-red-500 mb-6"><Trash2 size={28} /></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Delete Entry?</h3>
                <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">This action will permanently purge the question vector from the repository.</p>
                <div className="mt-8 flex w-full gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-[12px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Abort</button>
                  <button onClick={() => handleDeleteQuestion(deleteConfirm)} className="flex-1 py-3 rounded-2xl bg-red-500 text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 hover:scale-105 transition-all">Confirm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clearConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0b100d]/60 backdrop-blur-md" onClick={() => setClearConfirm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm rounded-[32px] bg-white dark:bg-[#111a15] p-8 shadow-2xl border border-white/20 dark:border-white/5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-red-500/10 text-red-500 mb-6"><AlertCircle size={28} /></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Clear Entire Bank?</h3>
                <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Purging all {questions.length} entries from the {mode} {selectedModule} bank. This is irreversible.</p>
                <div className="mt-8 flex w-full gap-3">
                  <button onClick={() => setClearConfirm(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-[12px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Abort</button>
                  <button onClick={handleClearAll} className="flex-1 py-3 rounded-2xl bg-red-500 text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 hover:scale-105 transition-all">Purge Bank</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST: THEME FIX */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 rounded-full px-6 py-3 shadow-2xl border backdrop-blur-xl ${toast.type === "success" ? "border-brand-green/20 bg-white/95 dark:bg-[#111a15]/95 text-brand-green" : "border-red-500/20 bg-white/95 dark:bg-[#111a15]/95 text-red-500"}`}>
            <div className={`h-2 w-2 rounded-full animate-pulse ${toast.type === "success" ? "bg-brand-green shadow-[0_0_8px_#1ed36a]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
            <span className="text-[11px] font-black uppercase tracking-widest">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
