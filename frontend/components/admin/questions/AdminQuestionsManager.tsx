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
  CodingQuestion, CODING_CATEGORIES,
  getSupportedQuestionKinds, parseQuestionKindEnabledMap, QuestionKind
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
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  Plus, Upload, Download, Trash2, Search,
  AlertCircle, ArrowLeft, Filter, ChevronDown, Code
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
  coding: { color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
};

const MODULE_ICONS: Record<AssessmentType, React.ReactNode> = {
  aptitude: <AptitudeIcon className="w-7 h-7" />,
  mnc: <MNCIcon className="w-7 h-7" />,
  communication: <CommunicationIcon className="w-7 h-7" />,
  role: <RoleIcon className="w-7 h-7" />,
  coding: <Code className="w-7 h-7" />,
};

const MODULE_TAGS: Record<AssessmentType, string[]> = {
  aptitude: ["Quantitative", "Logical", "Data", "Abstract"],
  mnc: ["DSA", "System Design", "Culture", "HR Prep"],
  communication: ["Listening", "Speaking", "Reading", "Writing"],
  role: ["Concepts", "Scenarios", "Judgement", "Role fit"],
  coding: ["Algorithms", "Data Structures", "In-Browser IDE"],
};

function getCatKey(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": return (q as AptitudeQuestion).category;
    case "mnc": return (q as MNCQuestion).topic;
    case "communication": return (q as CommQuestion).taskType;
    case "role": return (q as RoleQuestion).questionType;
    case "coding": return (q as CodingQuestion).category;
  }
}

function getFilterCategories(t: AssessmentType): { key: string; label: string; subcategories?: any[] }[] {
  switch (t) {
    case "aptitude": return APTITUDE_CATEGORIES.map(c => ({ key: c, label: `${c}`, subcategories: [] }));
    case "mnc": return MNC_TOPICS.map(c => ({ key: c, label: c }));
    case "communication": return (Object.entries(COMM_TASK_LABELS) as [CommTaskType, string][]).map(([k, v]) => ({ key: k, label: v }));
    case "role": return (Object.entries(ROLE_QUESTION_TYPE_LABELS) as [RoleQuestionType, string][]).map(([k, v]) => ({ key: k, label: v }));
    case "coding": return CODING_CATEGORIES.map(c => ({ key: c, label: c }));
  }
}

function getSearchText(q: AnyQuestion, t: AssessmentType): string {
  switch (t) {
    case "aptitude": { const a = q as AptitudeQuestion; return `${a.text} ${a.category} ${a.subcategory || ""}`.toLowerCase(); }
    case "mnc": { const m = q as MNCQuestion; return `${m.text} ${m.topic}`.toLowerCase(); }
    case "communication": { const c = q as CommQuestion; return `${c.instructions} ${c.prompt || ""} ${c.questions?.map(sq => sq.text).join(" ") || ""}`.toLowerCase(); }
    case "role": { const r = q as RoleQuestion; return `${r.text} ${r.category || ""} ${r.title || ""} ${r.scenarioContext || ""}`.toLowerCase(); }
    case "coding": { const c = q as CodingQuestion; return `${c.text} ${c.category}`.toLowerCase(); }
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
    kind: q.metadata?.kind || "mcq",
    correctOptionIds: q.metadata?.correctOptionIds || (q.correctOptionId ? [String(q.correctOptionId)] : []),
  };

  switch (module) {
    case "aptitude":
      return { ...common, category: q.category, subcategory: q.subcategory } as AptitudeQuestion;
    case "mnc":
      return { ...common, topic: q.category } as MNCQuestion;
    case "communication":
      return { ...common, taskType: q.category as CommTaskType, instructions: q.questionText } as unknown as CommQuestion;
    case "role":
      return { ...common, questionType: q.category as RoleQuestionType } as RoleQuestion;
    case "coding":
      return { ...common, category: q.category } as unknown as CodingQuestion;
    default:
      return common as any;
  }
}

function frontendToPayload(module: AssessmentType, q: AnyQuestion): CreateQuestionPayload {
  const common = q as any;
  const correctIdx = common.options?.findIndex((o: any) => o.id === common.correctOptionId) ?? 0;
  
  let category = "";
  let subcategory = "";
  switch (module) {
    case "aptitude": {
      const aq = q as AptitudeQuestion;
      category = aq.category;
      subcategory = aq.subcategory || "";
      break;
    }
    case "mnc": category = (q as MNCQuestion).topic; break;
    case "communication": category = (q as CommQuestion).taskType; break;
    case "role": category = (q as RoleQuestion).questionType; break;
    case "coding": category = (q as CodingQuestion).category; break;
  }

  return {
    category,
    subcategory,
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
    metadata: {
      kind: common.kind || "mcq",
      correctOptionIds: common.kind === "msq" ? common.correctOptionIds : [common.correctOptionId],
    }
  };
}

// All modules except specialized ones are now DB-backed
const isDbModule = (m: AssessmentType | null): m is AssessmentType => 
  m === "aptitude" || m === "mnc" || m === "communication" || m === "role" || m === "coding";

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
    coding: { trial: 0, main: 0 },
  });
  const [view, setView] = useState<"list" | "json-import">("list");
  const [editingQuestion, setEditingQuestion] = useState<AnyQuestion | null | "new">(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState<ApiAssessment | null>(null);
  const [assessmentsList, setAssessmentsList] = useState<ApiAssessment[]>([]);



  useEffect(() => {
    const loadAllAssessments = async () => {
      try {
        const modules: AssessmentType[] = ["aptitude", "mnc", "communication", "role", "coding"];
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
            return { key: c, label: c, subcategories: [] };
          }
          const id = c.id || c.name || "";
          const name = c.name || c.id || "";
          return { key: id, label: name, subcategories: c.subcategories || [] };
        });
      }
    }
    
    return getFilterCategories(selectedModule) as { key: string; label: string; subcategories?: any[] }[];
  }, [selectedModule, activeAssessment]);

  const allowedQuestionKinds = useMemo<QuestionKind[]>(() => {
    if (!selectedModule) return [];
    const supportedKinds = getSupportedQuestionKinds(selectedModule);
    if (!activeAssessment) return supportedKinds;

    const enabledMap = parseQuestionKindEnabledMap(selectedModule, activeAssessment.enabled_question_types, {
      fallbackToSupported: true,
    });

    const enabledKinds = supportedKinds.filter((kind) => enabledMap[kind]);
    return enabledKinds.length > 0 ? enabledKinds : supportedKinds;
  }, [selectedModule, activeAssessment]);

  const filtered = useMemo(() => {
    if (!selectedModule) return [];
    let result = questions;
    if (filterCategory !== "all") result = result.filter(q => getCatKey(q, selectedModule) === filterCategory);
    if (filterSubCategory !== "all") {
       result = result.filter(q => {
         if (selectedModule === "aptitude") return (q as AptitudeQuestion).subcategory === filterSubCategory;
         return true;
       });
    }
    if (searchQuery.trim()) {
      const lq = searchQuery.toLowerCase();
      result = result.filter(q => getSearchText(q, selectedModule).includes(lq));
    }
    return result;
  }, [questions, filterCategory, filterSubCategory, searchQuery, selectedModule]);

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
      <div className="relative w-full font-sans overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] assessment-grid" />
        </div>

        <main className="relative z-10 mx-auto max-w-[1600px] py-2">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((at, idx) => {
                const accent = ACCENT_COLORS[at];
                const trialCount = isDbModule(at) ? moduleCounts[at]?.trial ?? 0 : loadQuestions(at, "trial").length;
                const mainCount = isDbModule(at) ? moduleCounts[at]?.main ?? 0 : loadQuestions(at, "main").length;

                return (
                  <motion.div
                    key={at}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative flex flex-col h-full rounded-[2rem] bg-white/80 dark:bg-[#1C241F]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-md transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative p-8 flex flex-col h-full z-10">
                      {/* Icon & Title Section */}
                      <div className="flex items-start justify-between mb-6">
                        <div 
                          className="flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-lg [&_svg]:w-8 [&_svg]:h-8" 
                          style={{ background: accent.gradient }}
                        >
                          {MODULE_ICONS[at]}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-brand-green/10 border border-brand-green/20">
                          <span className="text-[10px] font-bold text-brand-green tracking-wide">Active</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight transition-colors">
                          {ASSESSMENT_TYPE_LABELS[at]}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {ASSESSMENT_TYPE_DESCRIPTIONS[at]}
                        </p>
                      </div>

                      {/* Stats Section */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-50 dark:bg-white/[0.03] p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Trial Bank</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{trialCount}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.03] p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Main Bank</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{mainCount}</span>
                        </div>
                      </div>

                      {/* Tags Section */}
                      <div className="flex flex-wrap gap-2 mb-8 mt-auto">
                        {(() => {
                          const dbExam = assessmentsList.find(a => {
                            const dbModule = at === "communication" ? "grammar" : at;
                            return a.module_type === dbModule || a.assessment_code === at;
                          });
                          let tagsToShow = MODULE_TAGS[at];
                          if (dbExam && dbExam.categories) {
                            let parsed: any[] = [];
                            if (Array.isArray(dbExam.categories)) {
                              parsed = dbExam.categories;
                            } else if (typeof dbExam.categories === "string") {
                              try { parsed = JSON.parse(dbExam.categories); } catch { parsed = []; }
                            }
                            if (parsed.length > 0) {
                              tagsToShow = parsed.map(c => typeof c === "string" ? c : (c.name || c.id || ""));
                            }
                          }
                          return tagsToShow.slice(0, 3).map((tag, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="px-2.5 py-1.5 bg-slate-100/50 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wide transition-colors"
                            >
                              {tag}
                            </span>
                          ));
                        })()}
                      </div>

                      {/* Actions Section */}
                      <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                        {isDbModule(at) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/questions/settings?module=${at}`);
                            }}
                            className="flex items-center justify-center w-11 h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-white hover:text-brand-green hover:bg-brand-green/10 hover:border-brand-green/30 transition-all shadow-sm group/btn"
                            title="Assessment Settings"
                          >
                            <Settings size={18} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedModule(at); setView("list"); }}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-brand-green text-white shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 hover:shadow-brand-green/30 transition-all"
                        >
                          <span>Manage Bank</span>
                          <ArrowRightWithoutLineIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
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
    <div className="relative w-full font-sans overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] assessment-grid" />
      </div>

      <main className="relative z-10 py-2">
        {/* ACTION BAR: ALIGNED WITH MAIN ADMIN UX */}
        <div className="flex flex-col xl:flex-row justify-between gap-4 items-start xl:items-center mb-6 mt-4">
          {/* Filter Tabs & Mode Toggle */}
          <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
            <div className="w-full sm:w-64">
              <CustomSelect
                label="Filter by Category"
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { label: `All Categories (${questions.length})`, value: "all" },
                  ...filterCats.map(cat => ({
                    label: `${cat.label} (${categoryCounts[cat.key] || 0})`,
                    value: cat.key
                  }))
                ]}
              />
            </div>

            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 shadow-inner">
              {(["trial", "main"] as QuestionMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    mode === m 
                      ? "bg-brand-green text-[#0f1411] shadow-lg shadow-brand-green/20" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m === "trial" ? "Trial Bank" : "Main Bank"}
                </button>
              ))}
            </div>

            {selectedModule === "aptitude" && filterCategory !== "all" && (
              <div className="w-full sm:w-64">
                <CustomSelect
                  label="Filter by Subcategory"
                  value={filterSubCategory}
                  onChange={setFilterSubCategory}
                  options={[
                    { label: "All Subcategories", value: "all" },
                    ...(filterCats.find(c => c.key === filterCategory)?.subcategories || []).map((sc: any) => ({
                      label: sc.name,
                      value: sc.id
                    }))
                  ]}
                />
              </div>
            )}
          </div>
          
          {/* Action Buttons: Export, Clear, Bulk Import, Add New */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <button onClick={handleExportJson} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-900 dark:text-white hover:text-brand-green hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
              <Download size={16} className="text-brand-green" />
              <span>Export JSON</span>
            </button>

            <button onClick={() => setClearConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-red-400/80 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
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
            <JsonImportPanel
              assessmentType={selectedModule}
              allowedQuestionKinds={allowedQuestionKinds}
              onImport={handleImport}
              onCancel={() => setView("list")}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Inventory Overview <span className="text-brand-green">({questions.length})</span>
                    <span className="ml-3 text-xs font-medium text-slate-500 capitalize px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 inline-block align-middle">
                      {mode} bank
                    </span>
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
                  <p className="mt-2 text-sm text-slate-900 dark:text-white max-w-xs leading-relaxed">We couldn&apos;t find any questions matching your search. Try adjusting your filters or search terms.</p>
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
            allowedQuestionKinds={allowedQuestionKinds}
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
