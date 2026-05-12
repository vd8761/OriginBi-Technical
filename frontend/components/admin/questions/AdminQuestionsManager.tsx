"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  clearQuestions as apiClearQuestions,
  ApiQuestion,
  CreateQuestionPayload,
  fetchAssessments,
  ApiAssessment,
} from "./api";
import { Settings } from "lucide-react";
import QuestionTable from "./QuestionTable";
import QuestionEditor from "./QuestionEditor";
import JsonImportPanel from "./JsonImportPanel";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  Plus, Upload, Download, Trash2, Search,
  AlertCircle, ArrowLeft, Filter,
} from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  AptitudeIcon,
  CommunicationIcon,
  MNCIcon,
  RoleIcon,
  ArrowRightWithoutLineIcon,
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
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<AssessmentType | null>(null);
  const [mode, setMode] = useState<QuestionMode>("trial");
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [moduleCounts, setModuleCounts] = useState<Record<AssessmentType, { trial: number; main: number }>>({
    aptitude: { trial: 0, main: 0 },
    mnc: { trial: 0, main: 0 },
    communication: { trial: 0, main: 0 },
    role: { trial: 0, main: 0 },
  });
  const [view, setView] = useState<"list" | "json-import">("list");
  const [editingQuestion, setEditingQuestion] = useState<AnyQuestion | null | "new">(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState<ApiAssessment | null>(null);
  const [assessmentsList, setAssessmentsList] = useState<ApiAssessment[]>([]);

  useEffect(() => {
    const loadAllAssessments = async () => {
      try {
        const modules: AssessmentType[] = ["aptitude", "mnc", "communication", "role"];
        const results: ApiAssessment[] = [];
        for (const m of modules) {
          const list = await fetchAssessments(m);
          if (list.length > 0) results.push(list[0]);
        }
        setAssessmentsList(results);
      } catch (err) {
        console.error("Failed to load all assessment details for admin dashboard cards:", err);
      }
    };
    loadAllAssessments();
  }, []);

  // ─── Load questions: API for DB modules, localStorage for others ─────────────
  const loadQuestionsForModule = useCallback(async (module: AssessmentType, m: QuestionMode) => {
    setLoading(true);
    try {
      if (isDbModule(module)) {
        const apiQuestions = await fetchQuestions(module, { mode: m });
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

  const refreshModuleCounts = useCallback(async (module?: AssessmentType) => {
    const modules = module
      ? [module]
      : (["aptitude", "mnc", "communication", "role"] as AssessmentType[]);

    await Promise.all(
      modules.map(async (currentModule) => {
        if (!isDbModule(currentModule)) return;

        try {
          const [trialQuestions, mainQuestions] = await Promise.all([
            fetchQuestions(currentModule, { mode: "trial" }),
            fetchQuestions(currentModule, { mode: "main" }),
          ]);

          setModuleCounts((prev) => ({
            ...prev,
            [currentModule]: {
              trial: trialQuestions.length,
              main: mainQuestions.length,
            },
          }));
        } catch (err) {
          console.error(`Failed to load counts for ${currentModule}:`, err);
        }
      })
    );
  }, []);

  useEffect(() => {
    refreshModuleCounts();
  }, [refreshModuleCounts]);

  useEffect(() => {
    if (!selectedModule) return;
    
    // Use an immediately invoked function to avoid synchronous setState triggers if needed
    // or just ensure the call is handled as an async side effect
    loadQuestionsForModule(selectedModule, mode);
    
    // Move resets outside if they cause issues, but here they are fine as part of the transition
    setFilterCategory("all");
    setSearchQuery("");
  }, [selectedModule, mode, loadQuestionsForModule]);

  // Load active assessment configuration details when selectedModule changes
  useEffect(() => {
    if (!selectedModule) {
      setActiveAssessment(null);
      return;
    }

    const loadAssessmentDetails = async () => {
      try {
        const assessments = await fetchAssessments(selectedModule);
        if (assessments && assessments.length > 0) {
          setActiveAssessment(assessments[0]);
        }
      } catch (err) {
        console.error("Failed to load assessment details:", err);
      }
    };

    loadAssessmentDetails();
  }, [selectedModule]);

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

  const filterCats = useMemo(() => {
    if (!selectedModule) return [];
    
    if (activeAssessment && activeAssessment.categories) {
      let cats: any[] = [];
      if (Array.isArray(activeAssessment.categories)) {
        cats = activeAssessment.categories;
      } else if (typeof activeAssessment.categories === "string") {
        try {
          cats = JSON.parse(activeAssessment.categories);
        } catch {
          cats = [];
        }
      }
      if (cats.length > 0) {
        return cats.map((c: any) => {
          if (typeof c === "string") {
            return { key: c, label: c };
          }
          const id = c.id || c.name || "";
          const name = c.name || c.id || "";
          return { key: id, label: name };
        });
      }
    }
    
    return getFilterCategories(selectedModule);
  }, [selectedModule, activeAssessment]);

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
        const payload = {
          ...frontendToPayload(selectedModule!, q),
          mode
        };
        if (isExisting && !qId.startsWith("new-")) {
          await updateQuestion(selectedModule!, Number(qId), payload);
          showToast("Question updated");
        } else {
          await createQuestion(selectedModule!, payload);
          showToast("Question added");
        }
        await loadQuestionsForModule(selectedModule!, mode);
        await refreshModuleCounts(selectedModule!);
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
        await refreshModuleCounts(selectedModule!);
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
        const payloads = imported.map(q => ({
          ...frontendToPayload(selectedModule!, q),
          mode
        }));
        const res = await bulkImportQuestions(selectedModule!, payloads);
        showToast(`Imported ${res.imported} questions`);
        await loadQuestionsForModule(selectedModule!, mode);
        await refreshModuleCounts(selectedModule!);
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

  const handleClearAll = async () => {
    if (isDbModule(selectedModule)) {
      try {
        setLoading(true);
        await apiClearQuestions(selectedModule!, mode);
        showToast(`All ${mode} questions cleared`);
        await loadQuestionsForModule(selectedModule!, mode);
        await refreshModuleCounts(selectedModule!);
      } catch (err) {
        showToast((err as Error).message || "Clear failed", "error");
      } finally {
        setLoading(false);
      }
    } else {
      setQuestions([]);
      showToast("All questions cleared");
    }
    setClearConfirm(false);
  };

  const handleExportJson = () => {
    const data = JSON.stringify(questions, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `originbi-${selectedModule}-questions.json`;
    link.click();
    showToast("Export successful");
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
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
          <div className="space-y-6">
            <div>
              <div className="flex items-center text-xs text-black dark:text-white mb-1.5 font-normal flex-wrap">
                <span className="text-black dark:text-white font-medium">
                  Admin Hub
                </span>
                <span className="mx-2 text-gray-400 dark:text-gray-600">
                  <ArrowRightWithoutLineIcon className="w-3 h-3 text-black dark:text-white" />
                </span>
                <span className="text-brand-green font-semibold">
                  Question Banks
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">Assessment Modules</h2>
              <p className="text-sm text-slate-900 dark:text-white mt-1">Select a module to manage its question library</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((at, idx) => {
                const accent = ACCENT_COLORS[at];
                const trialCount = isDbModule(at) ? moduleCounts[at]?.trial ?? 0 : loadQuestions(at, "trial").length;
                const mainCount = isDbModule(at) ? moduleCounts[at]?.main ?? 0 : loadQuestions(at, "main").length;

                return (
                  <div
                    key={at}
                    className="dashboard-glass-card !rounded-3xl p-6 flex flex-col transition-all duration-300 group h-full hover:border-brand-green/30 text-left dark:bg-white/[0.05]"
                  >
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center justify-center shrink-0 w-14 h-14 rounded-[20px] text-white shadow-md [&_svg]:w-7 [&_svg]:h-7" style={{ background: accent.gradient }}>
                        {MODULE_ICONS[at]}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">{ASSESSMENT_TYPE_LABELS[at]}</h3>
                      </div>
                    </div>

                    <p className="text-[13px] text-slate-900 dark:text-white line-clamp-2 leading-relaxed mb-6 font-medium">{ASSESSMENT_TYPE_DESCRIPTIONS[at]}</p>

                    <div className="flex items-center gap-5 mb-6 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-1.5">Trial</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{trialCount} Qs</span>
                      </div>
                      <div className="flex flex-col border-l border-slate-200 dark:border-white/10 pl-5">
                        <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-1.5">Main</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{mainCount} Qs</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-6 mt-auto">
                      {(() => {
                        const dbExam = assessmentsList.find(a => {
                          const dbModule = at === "communication" ? "grammar" : at;
                          return a.module_type === dbModule || a.assessment_code === at;
                        });
                        if (dbExam && dbExam.categories) {
                          let parsed: any[] = [];
                          if (Array.isArray(dbExam.categories)) {
                            parsed = dbExam.categories;
                          } else if (typeof dbExam.categories === "string") {
                            try { parsed = JSON.parse(dbExam.categories); } catch { parsed = []; }
                          }
                          if (parsed.length > 0) {
                            return parsed.slice(0, 4).map((cat: any, tIdx: number) => {
                              const name = typeof cat === "string" ? cat : (cat.name || cat.id || "");
                              return (
                                <span key={tIdx} className="px-2.5 py-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{name}</span>
                              );
                            });
                          }
                        }
                        return MODULE_TAGS[at].map((tag, tIdx) => (
                          <span key={tIdx} className="px-2.5 py-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{tag}</span>
                        ));
                      })()}
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-6" />

                    <div className="flex items-center justify-between gap-3">
                      {isDbModule(at) ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/questions/settings?module=${at}`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-white hover:text-brand-green hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm cursor-pointer"
                        >
                          <Settings size={13} className="text-brand-green" />
                          <span>Settings</span>
                        </button>
                      ) : (
                        <div />
                      )}
                      <button 
                        onClick={() => { setSelectedModule(at); setView("list"); }}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-green text-white shadow-md hover:bg-brand-green/90 transition-all active:scale-95"
                      >
                        Manage Questions
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="py-10 text-center opacity-40">
            <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Origin BI | Powered by Beyond Intelligence</p>
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
            <Logo className="h-5" />
            <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
              <button onClick={() => setMode("trial")} className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${mode === "trial" ? "bg-brand-green text-white" : "text-slate-900 dark:text-white hover:text-slate-800 dark:hover:text-white"}`}>Trial</button>
              <button onClick={() => setMode("main")} className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${mode === "main" ? "bg-brand-green text-white" : "text-slate-900 dark:text-white hover:text-slate-800 dark:hover:text-white"}`}>Main</button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
        {/* Header / breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center text-xs text-black dark:text-white mb-1.5 font-normal flex-wrap">
            <button onClick={() => setSelectedModule(null)} className="hover:underline hover:text-brand-green transition-colors cursor-pointer text-black dark:text-white font-medium">
              Admin Hub
            </button>
            <span className="mx-2 text-gray-400 dark:text-gray-600">
              <ArrowRightWithoutLineIcon className="w-3 h-3 text-black dark:text-white" />
            </span>
            <button onClick={() => setSelectedModule(null)} className="hover:underline hover:text-brand-green transition-colors cursor-pointer text-black dark:text-white font-medium">
              Question Banks
            </button>
            <span className="mx-2 text-gray-400 dark:text-gray-600">
              <ArrowRightWithoutLineIcon className="w-3 h-3 text-black dark:text-white" />
            </span>
            <span className="text-brand-green font-semibold">
              {ASSESSMENT_TYPE_LABELS[selectedModule]}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-white mt-1.5">
            {ASSESSMENT_TYPE_LABELS[selectedModule]}
          </h1>
        </div>
        {/* ACTION BAR: ALIGNED WITH MAIN ADMIN UX */}
        <div className="flex flex-col xl:flex-row justify-between gap-4 items-start xl:items-center mb-6">
          {/* Filter Tabs - Now on the left */}
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="w-full sm:w-64">
              <CustomSelect
                label="Filter by Category"
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { label: `All Questions (${questions.length})`, value: "all" },
                  ...filterCats.map(cat => ({
                    label: `${cat.label} (${categoryCounts[cat.key] || 0})`,
                    value: cat.key
                  }))
                ]}
              />
            </div>
          </div>
          
          {/* Action Buttons: Export, Clear, Bulk Import, Add New */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <button onClick={handleExportJson} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:text-brand-green hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
              <Download size={16} className="text-brand-green" />
              <span>Export</span>
            </button>

            <button onClick={() => setClearConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
              <Trash2 size={16} />
              <span>Clear Bank</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden xl:block mx-1" />
  
            <button 
              onClick={() => setView("json-import")} 
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
            >
              <span>Bulk Import</span>
              <Upload size={16} className="text-brand-green" />
            </button>
 
            {isDbModule(selectedModule) && (
              <button 
                onClick={() => router.push(`/admin/questions/settings?module=${selectedModule}`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-semibold text-slate-700 dark:text-white hover:text-brand-green hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
              >
                <Settings size={16} className="text-brand-green" />
                <span>Settings</span>
              </button>
            )}

            <button 
              onClick={() => setEditingQuestion("new")} 
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green rounded-lg text-sm font-semibold text-white hover:bg-brand-green/90 transition-all"
            >
              <span>Add New</span>
              <Plus size={16} />
            </button>
          </div>
        </div>


        {/* LIST CONTAINER */}
        <div className="min-h-[600px]">
          {view === "json-import" ? (
            <JsonImportPanel assessmentType={selectedModule} onImport={handleImport} onCancel={() => setView("list")} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
                <div>
                  <h3 className="text-2xl font-bold text-[#150089] dark:text-white">
                    Inventory Overview <span className="text-brand-green">({questions.length})</span>
                  </h3>
                </div>
                
                {/* Search Bar - Now relocated here */}
                <div className="relative w-full md:w-72 lg:w-96">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search repository..."
                    className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-slate-300 dark:focus:border-white/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={16} />
                  </div>
                </div>
              </div>


              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Loading questions...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-center mb-6 opacity-40">
                    <AlertCircle size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Questions Found</h3>
                  <p className="mt-2 text-sm text-slate-900 dark:text-white max-w-xs leading-relaxed">We couldn't find any questions matching your search. Try adjusting your filters or search terms.</p>
                  <button onClick={() => { setFilterCategory("all"); setSearchQuery(""); }} className="mt-8 px-6 py-2.5 rounded-full border border-brand-green/20 text-[11px] font-black uppercase tracking-widest text-brand-green hover:bg-brand-green hover:text-white transition-all">Clear Filters</button>
                </div>
              ) : (
                <QuestionTable 
                  questions={filtered} 
                  loading={loading} 
                  assessmentType={selectedModule!} 
                  onEdit={(q) => setEditingQuestion(q)} 
                  onDelete={(id) => setDeleteConfirm(id)} 
                  categories={filterCats.map(c => ({ id: c.key, name: c.label }))}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {editingQuestion !== null && (
          <QuestionEditor 
            question={editingQuestion === "new" ? null : editingQuestion} 
            assessmentType={selectedModule} 
            categories={filterCats.map(c => ({ id: c.key, name: c.label }))}
            onSave={handleSaveQuestion} 
            onCancel={() => setEditingQuestion(null)} 
          />
        )}
      </AnimatePresence>


      {/* Delete/Clear Modals styled with OriginBI theme */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#19211C]/80 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm rounded-[40px] bg-white dark:bg-brand-dark-primary p-8 shadow-2xl border border-slate-200 dark:border-white/10">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-red-500/10 text-red-500 mb-6"><Trash2 size={28} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Question?</h3>
                <p className="mt-3 text-[13px] text-slate-900 dark:text-white leading-relaxed font-medium">This action will permanently remove the question from this bank.</p>
                <div className="mt-8 flex w-full gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={() => handleDeleteQuestion(deleteConfirm)} className="flex-1 py-3 rounded-2xl bg-red-500 text-[12px] font-black uppercase tracking-widest text-white transition-all">Delete</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clearConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#19211C]/80 backdrop-blur-md" onClick={() => setClearConfirm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm rounded-[40px] bg-white dark:bg-brand-dark-primary p-8 shadow-2xl border border-slate-200 dark:border-white/10">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-red-500/10 text-red-500 mb-6"><AlertCircle size={28} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Clear Entire Bank?</h3>
                <p className="mt-3 text-[13px] text-slate-900 dark:text-white leading-relaxed font-medium">This will remove all {questions.length} questions from this bank. This action cannot be undone.</p>
                <div className="mt-8 flex w-full gap-3">
                  <button onClick={() => setClearConfirm(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={handleClearAll} className="flex-1 py-3 rounded-2xl bg-red-500 text-[12px] font-black uppercase tracking-widest text-white transition-all">Clear All</button>
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
