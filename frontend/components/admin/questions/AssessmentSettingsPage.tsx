"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, Save, Loader2, Plus, X, Info, LayoutGrid, Award, SlidersHorizontal, Shield, Trash2, Edit2, Check, Search, ListChecks, Code, Brain, RefreshCw, Zap, BarChart3, Layers, Clock, Target, ChevronDown } from "lucide-react";
import { ApiAssessment, fetchAssessments, updateAssessment } from "./api";
import {
  AssessmentType,
  ASSESSMENT_TYPE_LABELS,
  getSupportedQuestionKinds,
  parseQuestionKindEnabledMap,
  QUESTION_KIND_DESCRIPTIONS,
  QUESTION_KIND_LABELS,
  QuestionKind,
  QuestionKindEnabledMap,
  serializeQuestionKindEnabledMap,
} from "./types";
import { useRegisterAdminPage } from "../AdminPageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/Switch";
import { useConfirm } from "@/components/admin/ui";

type SettingsTab = "general" | "question_type" | "rules_limits" | "categories" | "grading" | "adaptive";

// ... (Removed ProperToggle as it's replaced by the new Switch component)

interface AssessmentSettingsPageProps {
  moduleOverride?: AssessmentType;
}

export default function AssessmentSettingsPage({ moduleOverride }: AssessmentSettingsPageProps = {}) {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const moduleParam = (moduleOverride ?? (searchParams.get("module") as AssessmentType)) as AssessmentType;
  
  const [assessments, setAssessments] = useState<Record<string, ApiAssessment>>({});
  const [activeModule, setActiveModule] = useState<AssessmentType>(moduleParam || "aptitude");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasModifications, setHasModifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form state ... (same as before)
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | "">(60);
  const [questionLimit, setQuestionLimit] = useState<number | "">(0);
  const [tabSwitchLimit, setTabSwitchLimit] = useState<number | "">(0);
  const [antiCopyEnabled, setAntiCopyEnabled] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [amount, setAmount] = useState<number | "">(0);
  
  interface SubCategory { id: string; name: string; }
  interface Category { id: string; name: string; subcategories?: SubCategory[]; }

  const [trialAttemptsLimit, setTrialAttemptsLimit] = useState<number | "">(5);
  const [mainAttemptsLimit, setMainAttemptsLimit] = useState<number | "">(2);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [newSubCategoryNames, setNewSubCategoryNames] = useState<Record<string, string>>({});
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const toggleExpandCategory = (id: string) => {
    setExpandedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [easyMarks, setEasyMarks] = useState<number | "">(1);
  const [easyNeg, setEasyNeg] = useState<number | "">(0);
  const [mediumMarks, setMediumMarks] = useState<number | "">(2);
  const [mediumNeg, setMediumNeg] = useState<number | "">(0.25);
  const [hardMarks, setHardMarks] = useState<number | "">(5);
  const [hardNeg, setHardNeg] = useState<number | "">(0.25);

  const [enabledQuestionKinds, setEnabledQuestionKinds] = useState<QuestionKindEnabledMap>({
    mcq: true,
    msq: false,
    tf: false,
    numerical: false,
  });

  // Proctoring
  const [proctoringRequireFullscreen, setProctoringRequireFullscreen] = useState(false);
  const [fullscreenExitLimit, setFullscreenExitLimit] = useState<number | "">(0);
  const [proctoringBlockDevtools, setProctoringBlockDevtools] = useState(true);
  const [devtoolsOpenLimit, setDevtoolsOpenLimit] = useState<number | "">(0);
  const [mouseFocusLossLimit, setMouseFocusLossLimit] = useState<number | "">(0);
  const [keypressLogEnabled, setKeypressLogEnabled] = useState(false);
  const [requireCameraMic, setRequireCameraMic] = useState(false);
  const [liveProctoringEnabled, setLiveProctoringEnabled] = useState(true);

  // Adaptive Questions plugin state
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [adaptiveTotalMarks, setAdaptiveTotalMarks] = useState<number | "">(100);
  const [adaptiveTotalBlocks, setAdaptiveTotalBlocks] = useState<number | "">(4);
  const [adaptiveSecondsPerMark, setAdaptiveSecondsPerMark] = useState<number | "">(45);
  const [adaptiveBlueprintStatus, setAdaptiveBlueprintStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [adaptiveBlueprintInfo, setAdaptiveBlueprintInfo] = useState<{
    exists: boolean;
    totalMarks?: number;
    totalBlocks?: number;
    categories?: string[];
    categoryBlueprint?: Record<string, { weightPct: number; targetMarks: number }>;
  } | null>(null);
  const [adaptiveQuestionStats, setAdaptiveQuestionStats] = useState<{
    totalActiveQuestions: number;
    categories: string[];
    questionsByDifficulty: Record<string, number>;
    questionsByCategory: Record<string, number>;
  } | null>(null);
  // Load adaptive blueprint info when switching to the adaptive tab
  const loadAdaptiveInfo = async (assessmentId: number) => {
    setAdaptiveBlueprintStatus("loading");
    setAdaptiveQuestionStats(null);
    setAdaptiveBlueprintInfo(null);
    try {
      const TECH_BASE =
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
          ? ""
          : (process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000");

      const [settingsRes, bpRes] = await Promise.allSettled([
        fetch(`${TECH_BASE}/api/adaptive/v2/settings/${assessmentId}`).then(r => r.json()),
        fetch(`${TECH_BASE}/api/adaptive/v2/blueprint/${assessmentId}`).then(r => r.json()),
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value?.success) {
        const qb = settingsRes.value.questionBank;
        if (qb) {
          setAdaptiveQuestionStats({
            totalActiveQuestions: qb.totalActiveQuestions ?? 0,
            categories: qb.categories ?? [],
            questionsByDifficulty: qb.questionsByDifficulty ?? {},
            questionsByCategory: qb.questionsByCategory ?? {},
          });
        }
        const bp = settingsRes.value.blueprint;
        if (bp) {
          setAdaptiveBlueprintInfo(bp);
        }
      }

      if (bpRes.status === "fulfilled" && bpRes.value?.success && bpRes.value?.blueprint) {
        const bp = bpRes.value.blueprint;
        setAdaptiveBlueprintInfo({
          exists: true,
          totalMarks: bp.totalMarks,
          totalBlocks: bp.totalBlocks,
          categories: Object.keys(bp.categoryBlueprint ?? {}),
          categoryBlueprint: bp.categoryBlueprint,
        });
      }

      setAdaptiveBlueprintStatus("success");
    } catch {
      setAdaptiveBlueprintStatus("error");
    }
  };

  const handleRefreshBlueprint = async () => {
    const a = assessments[activeModule];
    if (!a) return;
    setAdaptiveBlueprintStatus("loading");
    try {
      const TECH_BASE =
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
          ? ""
          : (process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000");
      const res = await fetch(`${TECH_BASE}/api/adaptive/v2/blueprint/${a.assessment_id}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.blueprint) {
        const bp = data.blueprint;
        setAdaptiveBlueprintInfo({
          exists: true,
          totalMarks: bp.totalMarks,
          totalBlocks: bp.totalBlocks,
          categories: Object.keys(bp.categoryBlueprint ?? {}),
          categoryBlueprint: bp.categoryBlueprint,
        });
        setAdaptiveBlueprintStatus("success");
      } else {
        setAdaptiveBlueprintStatus("error");
      }
    } catch {
      setAdaptiveBlueprintStatus("error");
    }
  };

  useEffect(() => {
    if (activeTab === "adaptive") {
      const a = assessments[activeModule];
      if (a) loadAdaptiveInfo(a.assessment_id);
    }
  }, [activeTab, activeModule, assessments]);

  const handleSave = async () => {
    const a = assessments[activeModule];
    if (!a) return;
    setSaving(true); setSaveStatus("idle");
    try {
      const payload = {
        assessmentName: name,
        totalTimeMinutes: duration === "" ? 60 : Number(duration),
        questionLimit: questionLimit === "" ? 0 : Number(questionLimit),
        categories: categoriesList,
        difficultyMarks: {
          easy: easyMarks === "" ? 1 : Number(easyMarks),
          medium: mediumMarks === "" ? 2 : Number(mediumMarks),
          hard: hardMarks === "" ? 5 : Number(hardMarks),
        },
        difficultyNegativeMarks: {
          easy: easyNeg === "" ? 0 : Number(easyNeg),
          medium: mediumNeg === "" ? 0.25 : Number(mediumNeg),
          hard: hardNeg === "" ? 0.25 : Number(hardNeg),
        },
        tabSwitchLimit: tabSwitchLimit === "" ? 0 : Number(tabSwitchLimit),
        antiCopyEnabled,
        shuffleQuestions,
        shuffleOptions,
        amount: amount === "" ? 0 : Number(amount),
        trialAttemptsLimit: trialAttemptsLimit === "" ? 5 : Number(trialAttemptsLimit),
        mainAttemptsLimit: mainAttemptsLimit === "" ? 2 : Number(mainAttemptsLimit),
        enabled_question_types: serializeQuestionKindEnabledMap(enabledQuestionKinds),
        proctoring_require_fullscreen: proctoringRequireFullscreen,
        fullscreen_exit_limit: fullscreenExitLimit === "" ? 0 : Number(fullscreenExitLimit),
        proctoring_block_devtools: proctoringBlockDevtools,
        devtools_open_limit: devtoolsOpenLimit === "" ? 0 : Number(devtoolsOpenLimit),
        mouse_focus_loss_limit: mouseFocusLossLimit === "" ? 0 : Number(mouseFocusLossLimit),
        keypress_log_enabled: keypressLogEnabled,
        require_camera_mic: requireCameraMic,
        live_proctoring_enabled: liveProctoringEnabled,
        adaptive_enabled: adaptiveEnabled,
        adaptive_total_marks: adaptiveTotalMarks === "" ? 100 : Number(adaptiveTotalMarks),
        adaptive_total_blocks: adaptiveTotalBlocks === "" ? 4 : Number(adaptiveTotalBlocks),
        adaptive_seconds_per_mark: adaptiveSecondsPerMark === "" ? 45 : Number(adaptiveSecondsPerMark),
      };
      const updated = await updateAssessment(a.assessment_id, payload as any);
      setAssessments(prev => ({ ...prev, [activeModule]: updated }));
      setHasModifications(false);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) { console.error(err); setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 5000); }
    finally { setSaving(false); }
  };

  // Register Topbar Metadata (Simplified to avoid repetition)
  useRegisterAdminPage({
    title: `${ASSESSMENT_TYPE_LABELS[activeModule]} Settings`,
    eyebrow: "Configuration",
    breadcrumb: [
      { label: "Assessments", href: `/admin/questions?module=${activeModule}` },
      { label: `${ASSESSMENT_TYPE_LABELS[activeModule]} Settings` },
    ],
    hideSearch: true,
  });

  const handleStartEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleAddCategory = () => {
    const trimmedId = newCategoryId.trim();
    const trimmedName = newCategoryName.trim();
    if (!trimmedId || !trimmedName) return;
    if (categoriesList.find(c => c.id === trimmedId)) return;
    setCategoriesList([...categoriesList, { id: trimmedId, name: trimmedName, subcategories: [] }]);
    setNewCategoryId(""); setNewCategoryName(""); markDirty();
  };

  const handleAddSubCategory = (catId: string, subName: string) => {
    const trimmed = subName.trim();
    if (!trimmed) return;
    const subId = trimmed.toLowerCase().replace(/\s+/g, "_");
    setCategoriesList(categoriesList.map(c => {
      if (c.id === catId) {
        const subs = c.subcategories || [];
        if (subs.find(s => s.id === subId)) return c;
        return { ...c, subcategories: [...subs, { id: subId, name: trimmed }] };
      }
      return c;
    }));
    markDirty();
  };

  const handleRemoveSubCategory = (catId: string, subId: string) => {
    setCategoriesList(categoriesList.map(c => {
      if (c.id === catId) {
        return { ...c, subcategories: (c.subcategories || []).filter(s => s.id !== subId) };
      }
      return c;
    }));
    markDirty();
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;
    setCategoriesList(categoriesList.map(c => c.id === id ? { ...c, name: trimmed } : c));
    setEditingCategoryId(null);
    setEditingCategoryName("");
    markDirty();
  };

  useEffect(() => {
    if (moduleParam && moduleParam !== activeModule) {
      setActiveModule(moduleParam);
    }
  }, [moduleParam, activeModule]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const modules: AssessmentType[] = ["aptitude", "mnc", "communication", "role", "coding"];
        const results: Record<string, ApiAssessment> = {};
        for (const m of modules) {
          const list = await fetchAssessments(m);
          if (list.length > 0) results[m] = list[0];
        }
        setAssessments(results);

        if (results[activeModule]) populateForm(results[activeModule]);
      } catch (err) { console.error("Failed to load assessments:", err); }
      finally { setLoading(false); }
    };
    loadAll();
  }, [activeModule]);

  // Sync form when module changes
  useEffect(() => {
    if (assessments[activeModule]) {
      populateForm(assessments[activeModule]);
    }
  }, [activeModule, assessments]);

  const parseMap = (val: any, fb: Record<string, any>) => {
    if (!val) return fb;
    if (typeof val === "object") return { ...fb, ...val };
    try { 
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      return { ...fb, ...parsed }; 
    } catch { return fb; }
  };

  const parseCats = (val: any): Category[] => {
    if (!val) return [];
    let parsed: any[] = [];
    if (Array.isArray(val)) {
      parsed = val;
    } else {
      try { parsed = JSON.parse(val); } catch { parsed = []; }
    }
    return parsed.map((c: any) => {
      if (typeof c === "string") return { id: c, name: c, subcategories: [] };
      return { 
        id: c.id || c.name || "", 
        name: c.name || c.id || "", 
        subcategories: Array.isArray(c.subcategories) ? c.subcategories.map((sc: any) => ({
          id: sc.id || sc.name || "",
          name: sc.name || sc.id || ""
        })) : []
      };
    });
  };

  const populateForm = (a: ApiAssessment) => {
    setName(a.assessment_name || "");
    setDuration(Number(a.total_time_minutes || 60));
    setQuestionLimit(Number(a.question_limit || 0));
    setTabSwitchLimit(Number(a.tab_switch_limit || 0));
    setAntiCopyEnabled(Boolean(a.anti_copy_enabled));
    setShuffleQuestions(Boolean(a.shuffle_questions));
    setShuffleOptions(Boolean(a.shuffle_options));
    setAmount(a.amount !== undefined && a.amount !== null ? Number(a.amount) : 0);
    setTrialAttemptsLimit(a.trial_attempts_limit !== undefined && a.trial_attempts_limit !== null ? Number(a.trial_attempts_limit) : 5);
    setMainAttemptsLimit(a.main_attempts_limit !== undefined && a.main_attempts_limit !== null ? Number(a.main_attempts_limit) : 2);
    setCategoriesList(parseCats(a.categories));
    const m = parseMap(a.difficulty_marks, { easy: 1, medium: 2, hard: 5 });
    const n = parseMap(a.difficulty_negative_marks, { easy: 0, medium: 0.25, hard: 0.25 });
    setEasyMarks(Number(m.easy)); setMediumMarks(Number(m.medium)); setHardMarks(Number(m.hard));
    setEasyNeg(Number(n.easy)); setMediumNeg(Number(n.medium)); setHardNeg(Number(n.hard));

    setProctoringRequireFullscreen(Boolean(a.proctoring_require_fullscreen));
    setFullscreenExitLimit(a.fullscreen_exit_limit ?? 0);
    setProctoringBlockDevtools(a.proctoring_block_devtools !== false);
    setDevtoolsOpenLimit(a.devtools_open_limit ?? 0);
    setMouseFocusLossLimit(a.mouse_focus_loss_limit ?? 0);
    setKeypressLogEnabled(Boolean(a.keypress_log_enabled));
    setRequireCameraMic(Boolean(a.require_camera_mic));
    setLiveProctoringEnabled(a.live_proctoring_enabled !== false);

    // Adaptive Questions plugin
    setAdaptiveEnabled(Boolean(a.adaptive_enabled));
    setAdaptiveTotalMarks(a.adaptive_total_marks !== undefined ? Number(a.adaptive_total_marks) : 100);
    setAdaptiveTotalBlocks(a.adaptive_total_blocks !== undefined ? Number(a.adaptive_total_blocks) : 4);
    setAdaptiveSecondsPerMark(a.adaptive_seconds_per_mark !== undefined ? Number(a.adaptive_seconds_per_mark) : 45);

    // Populate Question Types
    setEnabledQuestionKinds(parseQuestionKindEnabledMap(activeModule, a.enabled_question_types));

    setHasModifications(false);
  };

  const markDirty = () => setHasModifications(true);
  const visibleQuestionKinds = getSupportedQuestionKinds(activeModule);

  const toggleQuestionKind = (kind: QuestionKind, enabled: boolean) => {
    setEnabledQuestionKinds(prev => ({ ...prev, [kind]: enabled }));
    markDirty();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const matchesQuery = (texts: string[]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return texts.some(t => t?.toLowerCase().includes(query));
  };

  const hasGeneralMatches = 
    matchesQuery(["Assessment Display Name", "The name shown to administrators and in assessment headers.", "name"]) ||
    matchesQuery(["Assessment Amount", "The fee or value associated with this assessment. Set to 0 if free.", "amount", "price", "cost", "fee", "rupees", "inr"]) ||
    matchesQuery(["Trial Attempts Limit", "Total number of trial attempts a candidate is allowed. Set to 0 for unlimited.", "trial", "attempts", "limit"]) ||
    matchesQuery(["Main Attempts Limit", "Total number of main/paid attempts a candidate is allowed. Set to 0 for unlimited.", "main", "attempts", "limit", "paid"]);

  const hasQuestionTypeMatches = visibleQuestionKinds.some(kind => 
    matchesQuery([QUESTION_KIND_LABELS[kind], QUESTION_KIND_DESCRIPTIONS[kind], "question", "type", kind])
  );

  const hasRulesLimitsMatches = 
    matchesQuery(["Test Timer (Minutes)", "Total duration candidates have to complete this assessment.", "timer", "time", "duration", "minutes"]) ||
    matchesQuery(["Question Limit", "Serve a random subset of this size. Set to 0 to deliver the entire question pool.", "limit", "pool", "questions count"]) ||
    matchesQuery(["Tab-Switch Warning Limit", "Auto-submit after this many tab switches. Set to 0 to disable.", "tab", "switch", "warning", "proctoring", "cheat"]) ||
    matchesQuery(["Block Copy & Paste", "Prevent candidates from selecting or copying content during the test.", "copy", "paste", "block", "select", "prevent"]) ||
    matchesQuery(["Shuffle Questions Order", "Scramble question ordering dynamically per candidate session.", "shuffle", "randomize", "questions"]) ||
    matchesQuery(["Shuffle Question Options", "Randomize option ordering on multiple-choice cards.", "shuffle", "randomize", "options"]);

  const hasCategoriesMatches = matchesQuery(["Dynamic Category Builder", "Define logical categories and subcategories to structure your assessment pool.", "category", "categories", "subcategory", "slug", ...categoriesList.map(c => c.name), ...categoriesList.map(c => c.id)]);

  const hasGradingMatches = 
    matchesQuery(["Easy Complexity Score", "Marks and penalties for easy-tier questions.", "easy", "marks", "penalty", "grading", "scoring", "points"]) ||
    matchesQuery(["Medium Complexity Score", "Marks and penalties for medium-tier questions.", "medium", "marks", "penalty", "grading", "scoring", "points"]) ||
    matchesQuery(["Hard Complexity Score", "Marks and penalties for hard-tier questions.", "hard", "marks", "penalty", "grading", "scoring", "points"]);

  const hasAdaptiveMatches =
    matchesQuery(["Adaptive Mode", "Enable adaptive block-based assessment", "adaptive", "blueprint", "blocks", "marks", "seconds per mark", "auto"]);

  const inputCls = "block w-full max-w-lg rounded-xl border-0 py-3 px-4 bg-slate-50 dark:bg-white/5 text-black dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-white/10 placeholder:text-black/30 dark:placeholder:text-white/30 focus:ring-2 focus:ring-inset focus:ring-brand-green sm:text-sm transition-all hover:ring-slate-300 dark:hover:ring-white/20";
  const labelCls = "block text-[15px] font-bold leading-tight text-slate-900 dark:text-white";
  const descCls = "mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium";

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[500px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent shadow-[0_0_15px_rgba(30,211,106,0.3)]" />
      </div>
    );
  }

  return (
    <div className="relative w-full font-sans overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] assessment-grid" />
      </div>

      <main className="relative z-10 py-2">
        <div className="w-full pb-12">
          {/* Action Bar Above Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4">
            <div className="relative group max-w-md w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                <Search size={18} className="text-slate-400 dark:text-white/60 group-focus-within:text-brand-green transition-colors" />
              </div>
              <input 
                type="text" 
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className={`w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-12 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/50 transition-all backdrop-blur-md ${searchQuery ? "pr-10" : "pr-4"}`}
              />
              {searchQuery && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <AnimatePresence>
                {saveStatus === "success" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green/10 border border-brand-green/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                    <span className="text-[11px] font-bold text-brand-green">Changes Saved</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={handleSave} 
                disabled={!hasModifications || saving}
                className={`group relative flex items-center gap-2.5 px-8 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  hasModifications && !saving 
                    ? "bg-brand-green text-[#0f1411] hover:-translate-y-0.5 active:scale-95" 
                    : "bg-white/5 text-slate-500 cursor-not-allowed opacity-60 border border-white/5"
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className={`w-4 h-4 transition-transform duration-300 ${hasModifications ? "group-hover:scale-110" : ""}`} />
                )}
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#1C241F]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-white/5 overflow-hidden">
            {/* Tab navigation or Search results header */}
            {searchQuery ? (
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 px-8 sm:px-12 py-6">
                <div className="flex items-center gap-2.5">
                  <Search className="w-5 h-5 text-brand-green" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Search Results for <span className="text-brand-green font-extrabold">&quot;{searchQuery}&quot;</span>
                  </h2>
                </div>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-slate-400 hover:text-brand-green transition-colors"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="flex border-b border-slate-100 dark:border-white/5 px-8 sm:px-12 pt-8 gap-8 overflow-x-auto no-scrollbar">
                {([
                  ["general",       "General",            SlidersHorizontal],
                  ["question_type", "Question Type",      ListChecks],
                  ["rules_limits",  "Rules & Limits",     Shield],
                  ["categories",    "Dynamic Categories", LayoutGrid],
                  ["grading",       "Scoring Matrix",     Award],
                  ...(activeModule !== "coding" ? [["adaptive", "Adaptive", Brain] as [SettingsTab, string, any]] : []),
                ] as [SettingsTab, string, any][]).map(([key, label, Icon]) => (
                  <button 
                    key={key} 
                    onClick={() => setActiveTab(key)}
                    className={`relative pb-6 px-1 text-sm font-bold flex items-center gap-2.5 whitespace-nowrap transition-all duration-300 ${
                      activeTab === key ? "text-brand-green" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-300 ${activeTab === key ? "scale-110" : ""}`} />
                    <span>{label}</span>
                    {key === "adaptive" && adaptiveEnabled && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-green/15 text-brand-green border border-brand-green/20">
                        ON
                      </span>
                    )}
                    {activeTab === key && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-brand-green rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="p-8 sm:p-12 min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={searchQuery ? "search" : activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-16"
                >
                  {/* General Tab */}
                  {(activeTab === "general" || searchQuery) && hasGeneralMatches && (
                    <div className="space-y-12">
                      {searchQuery && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                          <SlidersHorizontal className="w-4 h-4 text-brand-green" />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">General Settings</h3>
                        </div>
                      )}
                      {matchesQuery(["Assessment Display Name", "The name shown to administrators and in assessment headers.", "name"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Assessment Display Name</label><p className={descCls}>The name shown to administrators and in assessment headers.</p></div>
                          <div className="sm:max-w-[400px] w-full"><input type="text" value={name} onChange={e => { setName(e.target.value); markDirty(); }} className={inputCls} /></div>
                        </div>
                      )}
                      {matchesQuery(["Assessment Amount", "The fee or value associated with this assessment. Set to 0 if free.", "amount", "price", "cost", "fee", "rupees", "inr"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Assessment Amount</label><p className={descCls}>The fee or value associated with this assessment. Set to 0 if free.</p></div>
                          <div className="sm:max-w-[400px] w-full relative flex items-center">
                            <span className="absolute left-4 text-slate-400 dark:text-white/40 pointer-events-none font-bold text-sm">
                              ₹
                            </span>
                            <input type="number" min={0} step="0.01" value={amount} onChange={e => { const val = e.target.value; setAmount(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls + " pl-8"} />
                          </div>
                        </div>
                      )}
                      {matchesQuery(["Trial Attempts Limit", "Total number of trial attempts a candidate is allowed. Set to 0 for unlimited.", "trial", "attempts", "limit"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Trial Attempts Limit</label><p className={descCls}>Total number of trial attempts a candidate is allowed. Set to 0 for unlimited.</p></div>
                          <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={trialAttemptsLimit} onChange={e => { const val = e.target.value; setTrialAttemptsLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                        </div>
                      )}
                      {matchesQuery(["Main Attempts Limit", "Total number of main/paid attempts a candidate is allowed. Set to 0 for unlimited.", "main", "attempts", "limit", "paid"]) && (
                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${activeModule === "coding" ? "pb-10 border-b border-slate-50 dark:border-white/[0.02]" : ""}`}>
                          <div className="sm:max-w-md"><label className={labelCls}>Main Attempts Limit</label><p className={descCls}>Total number of main/paid attempts a candidate is allowed. Set to 0 for unlimited.</p></div>
                          <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={mainAttemptsLimit} onChange={e => { const val = e.target.value; setMainAttemptsLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                        </div>
                      )}

                      {/* Adaptive Questions Plugin Mount — intentionally removed.
                          The Adaptive toggle and settings now live in the dedicated
                          "Adaptive" tab. Nothing is mounted here anymore. */}

                      {activeModule === "coding" && (
                        <div className="pt-10 mt-2 border-t border-slate-100 dark:border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-4 h-4 text-brand-green" />
                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Coding-Specific Settings</h3>
                          </div>
                          <p className={descCls + " mb-6"}>
                            Question authoring, language toggles, and Judge0 runtime limits for coding challenges
                            live in their own surfaces. Use the shortcuts below.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                            <Link
                              href="/admin/coding"
                              className="block p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-brand-green/40 transition-all"
                            >
                              <p className="text-[13px] font-bold text-slate-900 dark:text-white">Manage Coding Questions</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Problems, test cases, starter code, and visibility per question.
                              </p>
                            </Link>
                            <Link
                              href="/admin/plugins/languages"
                              className="block p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-brand-green/40 transition-all"
                            >
                              <p className="text-[13px] font-bold text-slate-900 dark:text-white">Languages & Judge0 Limits</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Allowed languages and per-language time and memory caps.
                              </p>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Type Tab */}
                  {(activeTab === "question_type" || searchQuery) && hasQuestionTypeMatches && (
                    <div className="space-y-12">
                      {searchQuery && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                          <ListChecks className="w-4 h-4 text-brand-green" />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Question Types</h3>
                        </div>
                      )}
                      {visibleQuestionKinds
                        .filter(kind => matchesQuery([QUESTION_KIND_LABELS[kind], QUESTION_KIND_DESCRIPTIONS[kind], "question", "type", kind]))
                        .map((kind, index, arr) => (
                          <div
                            key={kind}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
                              index < arr.length - 1 ? "pb-10 border-b border-slate-50 dark:border-white/[0.02]" : ""
                            }`}
                          >
                            <div className="sm:max-w-md">
                              <label className={labelCls}>{QUESTION_KIND_LABELS[kind]}</label>
                              <p className={descCls}>{QUESTION_KIND_DESCRIPTIONS[kind]}</p>
                            </div>
                            <div className="sm:max-w-[400px] w-full flex justify-end">
                              <Switch checked={enabledQuestionKinds[kind]} onCheckedChange={(val) => toggleQuestionKind(kind, val)} />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Rules & Limits Tab */}
                  {(activeTab === "rules_limits" || searchQuery) && hasRulesLimitsMatches && (
                    <div className="space-y-12">
                      {searchQuery && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                          <Shield className="w-4 h-4 text-brand-green" />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Rules & Limits</h3>
                        </div>
                      )}
                      {matchesQuery(["Test Timer (Minutes)", "Total duration candidates have to complete this assessment.", "timer", "time", "duration", "minutes"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Test Timer (Minutes)</label><p className={descCls}>Total duration candidates have to complete this assessment.</p></div>
                          <div className="sm:max-w-[400px] w-full"><input type="number" min={1} value={duration} onChange={e => { const val = e.target.value; setDuration(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                        </div>
                      )}
                      {matchesQuery(["Question Limit", "Serve a random subset of this size. Set to 0 to deliver the entire question pool.", "limit", "pool", "questions count"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Question Limit</label><p className={descCls}>Serve a random subset of this size. Set to 0 to deliver the entire question pool.</p></div>
                          <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={questionLimit} onChange={e => { const val = e.target.value; setQuestionLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                        </div>
                      )}
                      {matchesQuery(["Tab-Switch Warning Limit", "Auto-submit after this many tab switches. Set to 0 to disable.", "tab", "switch", "warning", "proctoring", "cheat"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Tab-Switch Warning Limit</label><p className={descCls}>Auto-submit after this many tab switches. Set to 0 to disable.</p></div>
                          <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={tabSwitchLimit} onChange={e => { const val = e.target.value; setTabSwitchLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                        </div>
                      )}
                      {matchesQuery(["Block Copy & Paste", "Prevent candidates from selecting or copying content during the test.", "copy", "paste", "block", "select", "prevent"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Block Copy & Paste</label><p className={descCls}>Prevent candidates from selecting or copying content during the test.</p></div>
                          <div className="sm:max-w-[400px] w-full flex justify-end">
                            <Switch checked={antiCopyEnabled} onCheckedChange={(val) => { setAntiCopyEnabled(val); markDirty(); }} />
                          </div>
                        </div>
                      )}
                      {matchesQuery(["Shuffle Questions Order", "Scramble question ordering dynamically per candidate session.", "shuffle", "randomize", "questions"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                          <div className="sm:max-w-md"><label className={labelCls}>Shuffle Questions Order</label><p className={descCls}>Scramble question ordering dynamically per candidate session.</p></div>
                          <div className="sm:max-w-[400px] w-full flex justify-end">
                            <Switch checked={shuffleQuestions} onCheckedChange={(val) => { setShuffleQuestions(val); markDirty(); }} />
                          </div>
                        </div>
                      )}
                      {matchesQuery(["Shuffle Question Options", "Randomize option ordering on multiple-choice cards.", "shuffle", "randomize", "options"]) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="sm:max-w-md"><label className={labelCls}>Shuffle Question Options</label><p className={descCls}>Randomize option ordering on multiple-choice cards.</p></div>
                          <div className="sm:max-w-[400px] w-full flex justify-end">
                            <Switch checked={shuffleOptions} onCheckedChange={(val) => { setShuffleOptions(val); markDirty(); }} />
                          </div>
                        </div>
                      )}

                      <div className="pt-10 mt-2 border-t border-slate-100 dark:border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-brand-green" />
                          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Proctoring</h3>
                        </div>
                        <p className={descCls + " mb-6"}>
                          Per-exam capture and limits. Counters live-stream to the admin Proctoring page (5s polling).
                        </p>

                        <div className="space-y-12">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Live proctoring to admin panel</label><p className={descCls}>When off, events still record but are hidden from the admin live monitor.</p></div>
                            <div className="sm:max-w-[400px] w-full flex justify-end">
                              <Switch checked={liveProctoringEnabled} onCheckedChange={(val) => { setLiveProctoringEnabled(val); markDirty(); }} />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Require Camera &amp; Mic</label><p className={descCls}>Prompt the candidate for camera and microphone access and show a self-view tile. Audio and video stay on the device — nothing is uploaded.</p></div>
                            <div className="sm:max-w-[400px] w-full flex justify-end">
                              <Switch checked={requireCameraMic} onCheckedChange={(val) => { setRequireCameraMic(val); markDirty(); }} />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Require Fullscreen</label><p className={descCls}>Force fullscreen on entry; count exits.</p></div>
                            <div className="sm:max-w-[400px] w-full flex justify-end">
                              <Switch checked={proctoringRequireFullscreen} onCheckedChange={(val) => { setProctoringRequireFullscreen(val); markDirty(); }} />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Fullscreen exit limit</label><p className={descCls}>Auto-flag after this many fullscreen exits. 0 = log only.</p></div>
                            <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={fullscreenExitLimit} onChange={e => { const v = e.target.value; setFullscreenExitLimit(v === "" ? "" : Number(v)); markDirty(); }} className={inputCls} /></div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Detect Developer Tools</label><p className={descCls}>Heuristic: window outer/inner size delta + F12/Inspector shortcut counter.</p></div>
                            <div className="sm:max-w-[400px] w-full flex justify-end">
                              <Switch checked={proctoringBlockDevtools} onCheckedChange={(val) => { setProctoringBlockDevtools(val); markDirty(); }} />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Devtools-open limit</label><p className={descCls}>Auto-flag after this many devtools-open events. 0 = log only.</p></div>
                            <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={devtoolsOpenLimit} onChange={e => { const v = e.target.value; setDevtoolsOpenLimit(v === "" ? "" : Number(v)); markDirty(); }} className={inputCls} /></div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                            <div className="sm:max-w-md"><label className={labelCls}>Mouse focus-loss limit</label><p className={descCls}>Count window-blur and mouse-leave events. 0 = log only.</p></div>
                            <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={mouseFocusLossLimit} onChange={e => { const v = e.target.value; setMouseFocusLossLimit(v === "" ? "" : Number(v)); markDirty(); }} className={inputCls} /></div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="sm:max-w-md"><label className={labelCls}>Log keypress activity</label><p className={descCls}>Throttled keystroke counter (max 1 event / 250 ms). Off by default.</p></div>
                            <div className="sm:max-w-[400px] w-full flex justify-end">
                              <Switch checked={keypressLogEnabled} onCheckedChange={(val) => { setKeypressLogEnabled(val); markDirty(); }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Categories Tab */}
                  {(activeTab === "categories" || searchQuery) && hasCategoriesMatches && (
                    <div className="space-y-12">
                      {searchQuery && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                          <LayoutGrid className="w-4 h-4 text-brand-green" />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Dynamic Categories</h3>
                        </div>
                      )}
                      
                      <div className="pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <label className={labelCls}>Dynamic Category Builder</label>
                        <p className={descCls}>Define logical categories and subcategories to structure your assessment pool.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-3xl">
                          <div>
                            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Category Name</label>
                            <input 
                              type="text" 
                              value={newCategoryName} 
                              onChange={e => {
                                const val = e.target.value;
                                setNewCategoryName(val);
                                const slug = val.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
                                setNewCategoryId(slug);
                              }}
                              className={inputCls} 
                              placeholder="e.g. Data Interpretation" 
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Backend slug</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={newCategoryId} 
                                onChange={e => setNewCategoryId(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, ""))}
                                className={inputCls + " flex-1"} 
                                placeholder="data_interpretation" 
                              />
                              <button 
                                onClick={handleAddCategory}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-brand-green text-white rounded-xl hover:bg-brand-green/90 transition active:scale-95 shrink-0"
                              >
                                <Plus size={16} /> Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {categoriesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                          <LayoutGrid className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Categories Added</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">Use the builder above to define your first main category and start linking subcategories.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/3">Main Category</th>
                                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subcategories</th>
                                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-64">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {categoriesList
                                  .filter(cat => !searchQuery || matchesQuery([cat.name, cat.id, "category", "categories"]))
                                  .map(cat => {
                                    const isExpanded = expandedCategoryIds.includes(cat.id);
                                    return (
                                      <React.Fragment key={cat.id}>
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors border-b border-slate-100 dark:border-white/5">
                                          <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col">
                                              <span className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</span>
                                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{cat.id}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 align-middle">
                                            {isExpanded ? (
                                              <span className="text-[11px] font-semibold text-brand-green italic">
                                                Editing subcategories...
                                              </span>
                                            ) : (
                                              <div className="flex flex-wrap gap-1.5 items-center">
                                                {(!cat.subcategories || cat.subcategories.length === 0) ? (
                                                  <span className="text-[11px] font-semibold text-slate-400 italic">No subcategories</span>
                                                ) : (
                                                  <>
                                                    {cat.subcategories.slice(0, 5).map(sc => (
                                                      <span key={sc.id} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                        {sc.name}
                                                      </span>
                                                    ))}
                                                    {cat.subcategories.length > 5 && (
                                                      <span className="text-[10px] font-bold text-brand-green">
                                                        +{cat.subcategories.length - 5} more
                                                      </span>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-6 py-4 align-middle text-right space-x-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleExpandCategory(cat.id)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 active:scale-95 ${
                                                isExpanded
                                                  ? "bg-brand-green/10 border-brand-green/20 text-brand-green"
                                                  : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                                              }`}
                                            >
                                              <span>Manage</span>
                                              <ChevronDown size={12} className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={async () => {
                                                const confirmed = await confirm({
                                                  title: "Delete Category?",
                                                  message: `Are you sure you want to delete "${cat.name}"? This will also delete all linked subcategories.`,
                                                  confirmLabel: "Delete",
                                                  cancelLabel: "Cancel",
                                                  variant: "danger",
                                                });
                                                if (confirmed) {
                                                  setCategoriesList(categoriesList.filter(c => c.id !== cat.id));
                                                  markDirty();
                                                }
                                              }}
                                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all inline-flex items-center justify-center align-middle"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </td>
                                        </tr>
                                        {isExpanded && (
                                          <tr className="bg-slate-50/[0.04] dark:bg-white/[0.005]">
                                            <td colSpan={3} className="px-6 py-4 border-b border-slate-200 dark:border-white/5">
                                              <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                                                
                                                {/* Left: Input box with save button */}
                                                <div className="flex items-center gap-3 w-full md:w-[45%]">
                                                  <input 
                                                    type="text" 
                                                    placeholder="Enter subcategory name..." 
                                                    value={newSubCategoryNames[cat.id] || ""}
                                                    onChange={e => setNewSubCategoryNames(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                                    onKeyDown={e => e.key === "Enter" && (handleAddSubCategory(cat.id, newSubCategoryNames[cat.id] || ""), setNewSubCategoryNames(prev => ({ ...prev, [cat.id]: "" })))}
                                                    className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                                  />
                                                  <button 
                                                    type="button"
                                                    onClick={() => { handleAddSubCategory(cat.id, newSubCategoryNames[cat.id] || ""); setNewSubCategoryNames(prev => ({ ...prev, [cat.id]: "" })); }}
                                                    className="px-5 py-2.5 text-xs font-bold bg-brand-green hover:bg-brand-green/90 text-white rounded-xl transition active:scale-95 whitespace-nowrap shadow-sm"
                                                  >
                                                    Save
                                                  </button>
                                                </div>

                                                {/* Right: Wrapping list of subcategories */}
                                                <div className="flex-1 w-full">
                                                  {(!cat.subcategories || cat.subcategories.length === 0) ? (
                                                    <span className="text-xs text-slate-400 italic justify-start md:justify-end flex">No subcategories defined yet.</span>
                                                  ) : (
                                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 justify-start md:justify-end">
                                                      {cat.subcategories.map(sc => (
                                                        <div key={sc.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 group/tag transition-colors hover:bg-slate-200 dark:hover:bg-white/10">
                                                          <span>{sc.name}</span>
                                                          <button 
                                                            type="button"
                                                            onClick={() => handleRemoveSubCategory(cat.id, sc.id)} 
                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                          >
                                                            <X size={11} strokeWidth={2.5} />
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>

                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grading Tab */}
                  {(activeTab === "grading" || searchQuery) && hasGradingMatches && (
                    <div className="space-y-12">
                      {searchQuery && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                          <Award className="w-4 h-4 text-brand-green" />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Scoring Matrix</h3>
                        </div>
                      )}
                      
                      {!searchQuery && (
                        <div className="p-6 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex gap-4">
                          <Info className="w-6 h-6 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Pluggable Weight Matrix</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">These values dynamically override individual question markings to ensure consistency across the entire assessment.</p>
                          </div>
                        </div>
                      )}
                      
                      {([["Easy", "brand-green", easyMarks, setEasyMarks, easyNeg, setEasyNeg],
                         ["Medium", "brand-green", mediumMarks, setMediumMarks, mediumNeg, setMediumNeg],
                         ["Hard", "brand-green", hardMarks, setHardMarks, hardNeg, setHardNeg]] as const)
                        .filter(([label]) => matchesQuery([label + " Complexity Score", "Marks and penalties for " + label.toLowerCase() + "-tier questions.", "easy", "medium", "hard", "marks", "penalty", "grading", "scoring", "points"]))
                        .map(([label, color, marks, setM, neg, setN], i, arr) => (
                          <div key={label} className={`flex flex-col sm:flex-row sm:items-start justify-between gap-8 ${i < arr.length - 1 ? "pb-10 border-b border-slate-50 dark:border-white/[0.02]" : ""}`}>
                            <div className="sm:max-w-md">
                              <label className={labelCls}>{label} Complexity Score</label>
                              <p className={descCls}>Marks and penalties for {label.toLowerCase()}-tier questions.</p>
                            </div>
                            <div className="flex gap-4 sm:max-w-[400px] w-full">
                              <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">+ Marks</label>
                                <input type="number" step="0.25" min="0" value={marks} onChange={e => { const val = e.target.value; (setM as any)(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">− Penalty</label>
                                <input type="number" step="0.05" min="0" value={neg} onChange={e => { const val = e.target.value; (setN as any)(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* ── Adaptive Tab ─────────────────────────────────────────── */}
                  {(activeTab === "adaptive" || (searchQuery && hasAdaptiveMatches)) && activeModule !== "coding" && (
                    <div className="space-y-10">
                      {searchQuery && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                          <Brain className="w-4 h-4 text-brand-green" />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Adaptive Settings</h3>
                        </div>
                      )}

                      {/* Enable / Disable toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md">
                          <label className={labelCls}>Enable Adaptive Mode</label>
                          <p className={descCls}>
                            When on, candidates receive questions in adaptive blocks. Difficulty adjusts
                            automatically after each block based on performance. The blueprint is built
                            automatically from the question bank — no manual setup needed.
                          </p>
                        </div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch
                            checked={adaptiveEnabled}
                            onCheckedChange={val => { setAdaptiveEnabled(val); markDirty(); }}
                          />
                        </div>
                      </div>

                      {/* Settings grid — always visible so admin can configure before enabling */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div>
                          <label className={labelCls}>Total Marks</label>
                          <p className={descCls}>Full exam marks distributed across all blocks.</p>
                          <input
                            type="number" min={10} max={500} step={5}
                            value={adaptiveTotalMarks}
                            onChange={e => { const v = e.target.value; setAdaptiveTotalMarks(v === "" ? "" : Number(v)); markDirty(); }}
                            className={inputCls + " mt-4"}
                          />
                          {adaptiveTotalMarks !== "" && adaptiveTotalBlocks !== "" && Number(adaptiveTotalBlocks) > 0 && (
                            <p className="text-[11px] text-brand-green mt-1 font-semibold">
                              = {Math.round(Number(adaptiveTotalMarks) / Number(adaptiveTotalBlocks))} marks per block
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelCls}>Number of Blocks</label>
                          <p className={descCls}>Each block adapts difficulty based on the previous block.</p>
                          <input
                            type="number" min={1} max={20}
                            value={adaptiveTotalBlocks}
                            onChange={e => { const v = e.target.value; setAdaptiveTotalBlocks(v === "" ? "" : Number(v)); markDirty(); }}
                            className={inputCls + " mt-4"}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Seconds per Mark</label>
                          <p className={descCls}>Time budget per mark for per-question time limits.</p>
                          <input
                            type="number" min={10} max={300}
                            value={adaptiveSecondsPerMark}
                            onChange={e => { const v = e.target.value; setAdaptiveSecondsPerMark(v === "" ? "" : Number(v)); markDirty(); }}
                            className={inputCls + " mt-4"}
                          />
                          {adaptiveTotalMarks !== "" && adaptiveSecondsPerMark !== "" && (
                            <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                              ≈ {Math.round(Number(adaptiveTotalMarks) * Number(adaptiveSecondsPerMark) / 60)} min total
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Auto-blueprint status panel */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-brand-green" />
                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Auto-Blueprint Status</h3>
                          </div>
                          <button
                            type="button"
                            onClick={handleRefreshBlueprint}
                            disabled={adaptiveBlueprintStatus === "loading"}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-brand-green/40 hover:text-brand-green transition-all disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${adaptiveBlueprintStatus === "loading" ? "animate-spin" : ""}`} />
                            Rebuild from Questions
                          </button>
                        </div>

                        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          The blueprint is computed <strong className="text-slate-700 dark:text-slate-300">automatically</strong> from
                          the question bank every time a candidate starts an adaptive attempt. Categories, subcategories, and
                          mark distribution are derived directly from the questions you have added — no manual configuration needed.
                        </p>

                        {adaptiveBlueprintStatus === "loading" && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-green" />
                            <span className="text-sm text-slate-500">Loading blueprint info…</span>
                          </div>
                        )}

                        {adaptiveBlueprintStatus !== "loading" && adaptiveQuestionStats && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: "Active Questions", value: adaptiveQuestionStats.totalActiveQuestions, icon: <Zap className="w-4 h-4" /> },
                              { label: "Categories", value: adaptiveQuestionStats.categories.length, icon: <BarChart3 className="w-4 h-4" /> },
                              { label: "Easy", value: adaptiveQuestionStats.questionsByDifficulty?.easy ?? 0, icon: <Target className="w-4 h-4" /> },
                              { label: "Medium + Hard", value: (adaptiveQuestionStats.questionsByDifficulty?.medium ?? 0) + (adaptiveQuestionStats.questionsByDifficulty?.hard ?? 0), icon: <Layers className="w-4 h-4" /> },
                            ].map(s => (
                              <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <span className="p-2 rounded-lg bg-brand-green/10 text-brand-green">{s.icon}</span>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{s.label}</p>
                                  <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {adaptiveBlueprintStatus !== "loading" && adaptiveBlueprintInfo?.exists && adaptiveBlueprintInfo.categoryBlueprint && (
                          <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Blueprint — Category Distribution</p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1"><Target className="w-3 h-3" />{adaptiveBlueprintInfo.totalMarks} marks</span>
                                <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{adaptiveBlueprintInfo.totalBlocks} blocks</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{adaptiveSecondsPerMark}s/mark</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(adaptiveBlueprintInfo.categoryBlueprint).map(([cat, bp]) => (
                                <div key={cat}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                      <span>{bp.weightPct.toFixed(1)}%</span>
                                      <span className="font-bold text-slate-600 dark:text-slate-300">{bp.targetMarks}m</span>
                                    </div>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-brand-green transition-all"
                                      style={{ width: `${bp.weightPct}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {adaptiveBlueprintStatus !== "loading" && (!adaptiveBlueprintInfo?.exists || !adaptiveBlueprintInfo?.categoryBlueprint) && (
                          <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3">
                            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">No blueprint yet</p>
                              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                                Add active questions to this assessment, then enable Adaptive Mode and save.
                                The blueprint will be built automatically on the first candidate attempt,
                                or you can click <strong>Rebuild from Questions</strong> above.
                              </p>
                            </div>
                          </div>
                        )}

                        {adaptiveBlueprintStatus !== "loading" && adaptiveQuestionStats && adaptiveQuestionStats.totalActiveQuestions === 0 && (
                          <div className="p-5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 flex items-start gap-3">
                            <Info className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-red-700 dark:text-red-400">No active questions found</p>
                              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                Go to the Question Banks page and add questions with categories and difficulty levels.
                                The blueprint will be built automatically once questions are available.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* How it works */}
                      {!searchQuery && (
                        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-3">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">How Adaptive Mode Works</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-700 dark:text-slate-300">📋 Blueprint (automatic)</p>
                              <p>Categories and mark distribution are derived from your question bank. Equal weight across all categories by default.</p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-slate-700 dark:text-slate-300">🧠 Adaptive Engine</p>
                              <p>After each block, the Block Readiness Score determines whether the next block is easier, same, or harder.</p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-slate-700 dark:text-slate-300">📸 Snapshot Model</p>
                              <p>Answers are locked per block when the candidate clicks Next. They can still edit previous blocks — reliability is tracked.</p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-slate-700 dark:text-slate-300">📊 Final Report</p>
                              <p>Includes marks %, topic mastery, difficulty handling, speed efficiency, and reliability score.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasGeneralMatches && !hasQuestionTypeMatches && !hasRulesLimitsMatches && !hasCategoriesMatches && !hasGradingMatches && !hasAdaptiveMatches && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 mb-4">
                        <Search size={32} />
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">No settings found</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                        We couldn&apos;t find any settings matching &quot;{searchQuery}&quot;. Try a different keyword.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
