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

const ACCENT_COLORS: Record<AssessmentType, { color: string; gradient: string }> = {
  aptitude: { color: "#10b981", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
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
  const handleImport = (imported: AnyQuestion[]) => { setQuestions([...questions, ...imported]); setView("list"); showToast(`${imported.length} question${imported.length !== 1 ? "s" : ""} imported`); };
  const handleClearAll = () => { setQuestions([]); setClearConfirm(false); showToast("All questions cleared"); };
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${selectedModule}_${mode}_questions.json`; a.click(); URL.revokeObjectURL(url); showToast("JSON exported");
  };

  // ─── LANDING: Assessment Cards ───
  if (!selectedModule) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 w-full z-50 h-[60px] sm:h-[64px] bg-white/[0.96] dark:bg-[#19211C]/[0.96] backdrop-blur-xl border-b border-gray-100/[0.8] dark:border-white/[0.06]">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <Logo className="h-5" />
              <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
              <div className="hidden sm:block">
                <p className="text-[10px] font-semibold text-brand-green tracking-tight uppercase">Admin Console</p>
                <p className="text-[12px] font-bold text-slate-800 dark:text-white tracking-tight">Question Bank</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-4 pt-[76px]">
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">Assessment Modules</h2>
              <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary mt-0.5">Select a module to manage its question bank</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map(at => {
                const accent = ACCENT_COLORS[at];
                const tags = MODULE_TAGS[at];
                const trialCount = loadQuestions(at, "trial").length;
                const mainCount = loadQuestions(at, "main").length;
                return (
                  <button
                    key={at}
                    onClick={() => { setSelectedModule(at); setView("list"); }}
                    className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-[24px] p-5 flex flex-col transition-all duration-500 group h-full hover:scale-[1.01] text-left cursor-pointer shadow-sm hover:shadow-md"
                    style={{ '--acc-color': `${accent.color}66` } as React.CSSProperties}
                  >
                    <div className="flex gap-4 mb-3">
                      <div className="flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl text-white shadow-lg [&_svg]:w-6 [&_svg]:h-6" style={{ background: accent.gradient }}>
                        {MODULE_ICONS[at]}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">{ASSESSMENT_TYPE_LABELS[at]}</h3>
                      </div>
                    </div>

                    <p className="text-[12px] text-slate-800 dark:text-slate-100 line-clamp-2 leading-relaxed mb-4 font-normal opacity-80">{ASSESSMENT_TYPE_DESCRIPTIONS[at]}</p>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">Trial</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{trialCount} Qs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">Main</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{mainCount} Qs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">Total</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{trialCount + mainCount} Qs</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                      {tags.map((tag, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[8px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{tag}</span>
                      ))}
                    </div>

                    <div className="h-[1px] w-full bg-black/5 dark:bg-white/10 mb-4" />

                    <div className="flex items-center justify-end">
                      <span className="px-5 py-1.5 text-[11px] font-bold rounded-full bg-brand-green text-white shadow-sm hover:shadow-md shadow-brand-green/20 transition-all">
                        Manage Bank
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="py-6 text-center">
            <p className="text-[11px] text-brand-text-light-secondary/70 dark:text-brand-text-secondary font-medium">&copy; {new Date().getFullYear()} Origin BI | Admin Console</p>
          </footer>
        </main>
      </div>
    );
  }

  // ─── INSIDE MODULE: Question Management ───
  const accent = ACCENT_COLORS[selectedModule];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 h-[60px] sm:h-[64px] bg-white/[0.96] dark:bg-[#19211C]/[0.96] backdrop-blur-xl border-b border-gray-100/[0.8] dark:border-white/[0.06]">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedModule(null); setView("list"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight border bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/[0.06] dark:border-white/[0.12] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
              <ArrowLeft className="w-3.5 h-3.5 text-brand-green" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <Logo className="h-5 hidden sm:block" />
            <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-xl text-white shadow-md [&_svg]:w-4 [&_svg]:h-4" style={{ background: accent.gradient }}>
                {MODULE_ICONS[selectedModule]}
              </div>
              <div className="leading-tight">
                <p className="text-[12px] font-bold text-slate-800 dark:text-white tracking-tight">{ASSESSMENT_TYPE_LABELS[selectedModule]}</p>
                <p className="text-[9px] font-semibold text-brand-green tracking-tight uppercase">Bank Management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Trial/Main Toggle */}
            <div className="relative flex items-center gap-1 p-1 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-md shadow-sm">
              <button onClick={() => { setMode("trial"); setView("list"); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${mode === "trial" ? "text-white bg-brand-green shadow-md" : "text-brand-text-light-secondary dark:text-brand-text-secondary hover:bg-brand-light-secondary dark:hover:bg-white/5 border-transparent"}`}>
                <Beaker size={10} className="inline mr-1" /> Trial
              </button>
              <button onClick={() => { setMode("main"); setView("list"); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${mode === "main" ? "text-white bg-brand-green shadow-md" : "text-brand-text-light-secondary dark:text-brand-text-secondary hover:bg-brand-light-secondary dark:hover:bg-white/5 border-transparent"}`}>
                <BookOpen size={10} className="inline mr-1" /> Main
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-4 pt-[76px]">
        {/* Filters + Actions Bar */}
        <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-[24px] p-4 mb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <button onClick={() => setFilterCategory("all")} className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${filterCategory === "all" ? "text-white bg-brand-green shadow-md" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                All ({questions.length})
              </button>
              {filterCats.map(cat => (
                <button key={cat.key} onClick={() => setFilterCategory(cat.key)} className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${filterCategory === cat.key ? "text-white bg-brand-green shadow-md" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                  {cat.label} ({categoryCounts[cat.key] || 0})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full sm:w-40 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#19211C] py-1.5 pl-8 pr-3 text-[11px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-brand-green focus:outline-none" />
              </div>
              <button onClick={() => setEditingQuestion("new")} className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-white shadow-sm hover:shadow-md shadow-brand-green/20 transition-all" title="Add"><Plus size={14} /></button>
              <button onClick={() => setView("json-import")} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-brand-green hover:bg-slate-50 dark:hover:bg-white/10 transition-all" title="Import"><Upload size={14} /></button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-[24px] p-5 min-h-[350px]">
          {view === "json-import" ? (
            <JsonImportPanel assessmentType={selectedModule} mode={mode} onImport={handleImport} onCancel={() => setView("list")} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4 text-white shadow-md [&_svg]:w-6 [&_svg]:h-6" style={{ background: accent.gradient }}>{MODULE_ICONS[selectedModule]}</div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{questions.length === 0 ? "Empty Question Bank" : "No Results"}</h3>
              <p className="mt-1.5 max-w-xs text-[12px] text-slate-500 dark:text-slate-400 font-medium">{questions.length === 0 ? `Add questions to the ${ASSESSMENT_TYPE_LABELS[selectedModule]} ${mode} bank.` : "Adjust your search or filters."}</p>
              {questions.length === 0 && (
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setEditingQuestion("new")} className="px-4 py-2 text-[11px] font-bold rounded-full bg-brand-green text-white shadow-sm">
                    <Plus size={12} className="inline mr-1" /> New Question
                  </button>
                  <button onClick={() => setView("json-import")} className="px-4 py-2 text-[11px] font-semibold border border-slate-200 dark:border-white/10 rounded-full text-slate-700 dark:text-slate-300">
                    <Upload size={12} className="inline mr-1" /> Bulk Import
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Showing {filtered.length} of {questions.length}</p>
                <div className="flex items-center gap-3">
                  <button onClick={handleExportJson} className="text-[10px] font-bold text-slate-500 hover:text-brand-green transition-colors uppercase tracking-wider"><Download size={10} className="inline mr-1" /> Export</button>
                  <button onClick={() => setClearConfirm(true)} className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-wider"><Trash2 size={10} className="inline mr-1" /> Clear All</button>
                </div>
              </div>
              <div className="grid gap-3">
                {filtered.map(q => (
                  <QuestionCard key={(q as { id: string }).id} question={q} index={questions.indexOf(q)} assessmentType={selectedModule} onEdit={() => setEditingQuestion(q)} onDelete={() => setDeleteConfirm((q as { id: string }).id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Editor Modal */}
      {editingQuestion !== null && (
        <QuestionEditor question={editingQuestion === "new" ? null : editingQuestion} assessmentType={selectedModule} onSave={handleSaveQuestion} onCancel={() => setEditingQuestion(null)} />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-[24px] bg-white dark:bg-[#19211C] p-6 shadow-2xl border border-white/20 dark:border-white/[0.08]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 mb-4"><Trash2 size={20} className="text-red-500" /></div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Delete Question?</h3>
              <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 font-medium">This cannot be undone.</p>
              <div className="mt-6 flex w-full gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-[12px] font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                <button onClick={() => handleDeleteQuestion(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-[12px] font-bold text-white shadow-sm">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirm */}
      {clearConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setClearConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-[24px] bg-white dark:bg-[#19211C] p-6 shadow-2xl border border-white/20 dark:border-white/[0.08]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 mb-4"><AlertCircle size={20} className="text-red-500" /></div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Clear Entire Bank?</h3>
              <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 font-medium">All questions in {mode} {ASSESSMENT_TYPE_LABELS[selectedModule]} will be removed.</p>
              <div className="mt-6 flex w-full gap-3">
                <button onClick={() => setClearConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-[12px] font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                <button onClick={handleClearAll} className="flex-1 py-2.5 rounded-xl bg-red-500 text-[12px] font-bold text-white shadow-sm">Yes, Clear All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-xl border backdrop-blur-xl ${toast.type === "success" ? "border-brand-green/20 bg-white/90 dark:bg-[#19211C]/90 text-brand-green" : "border-red-500/20 bg-white/90 dark:bg-[#19211C]/90 text-red-500"}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${toast.type === "success" ? "bg-brand-green" : "bg-red-500"}`} />
          <span className="text-[11px] font-bold uppercase tracking-wider">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
