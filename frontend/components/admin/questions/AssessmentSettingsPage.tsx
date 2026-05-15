"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, Loader2, Plus, X, Info, LayoutGrid, Award, SlidersHorizontal, Shield, Trash2, Edit2, Check, Search, ListChecks, Code } from "lucide-react";
import { ApiAssessment, fetchAssessments, updateAssessment } from "./api";
import { AssessmentType, ASSESSMENT_TYPE_LABELS } from "./types";
import { AptitudeIcon, CommunicationIcon, MNCIcon, RoleIcon, ArrowRightWithoutLineIcon } from "@/components/icons";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useRegisterAdminPage } from "../AdminPageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/Switch";

type SettingsTab = "general" | "question_type" | "rules_limits" | "categories" | "grading";

// ... (Removed ProperToggle as it's replaced by the new Switch component)

export default function AssessmentSettingsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Record<string, ApiAssessment>>({});
  const [activeModule, setActiveModule] = useState<AssessmentType>("aptitude");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasModifications, setHasModifications] = useState(false);

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

  const [easyMarks, setEasyMarks] = useState<number | "">(1);
  const [easyNeg, setEasyNeg] = useState<number | "">(0);
  const [mediumMarks, setMediumMarks] = useState<number | "">(2);
  const [mediumNeg, setMediumNeg] = useState<number | "">(0.25);
  const [hardMarks, setHardMarks] = useState<number | "">(5);
  const [hardNeg, setHardNeg] = useState<number | "">(0.25);

  // Question Type Settings
  const [enabledMCQ, setEnabledMCQ] = useState(true);
  const [enabledMSQ, setEnabledMSQ] = useState(false);
  const [enabledTF, setEnabledTF] = useState(false);

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
        enabled_question_types: {
          mcq: enabledMCQ,
          msq: enabledMSQ,
          true_false: enabledTF,
        }
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
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks", href: "/admin/questions" },
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

        let initialMod: AssessmentType = "aptitude";
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const queryMod = params.get("module") as AssessmentType;
          if (queryMod && modules.includes(queryMod)) {
            initialMod = queryMod;
          }
        }
        setActiveModule(initialMod);
        if (results[initialMod]) populateForm(results[initialMod]);
      } catch (err) { console.error("Failed to load assessments:", err); }
      finally { setLoading(false); }
    };
    loadAll();
  }, []);

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
    
    // Populate Question Types
    const qTypes = parseMap(a.enabled_question_types, { mcq: false, msq: false, true_false: false });
    setEnabledMCQ(Boolean(qTypes.mcq));
    setEnabledMSQ(Boolean(qTypes.msq));
    setEnabledTF(Boolean(qTypes.true_false));

    setHasModifications(false);
  };

  const markDirty = () => setHasModifications(true);

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
                <Search size={18} className="text-white/60 group-focus-within:text-brand-green transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search settings..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/50 transition-all backdrop-blur-md"
              />
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <span className="text-[10px] font-black text-white/30 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 tracking-tighter">⌘K</span>
              </div>
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
            {/* Tab navigation */}
            <div className="flex border-b border-slate-100 dark:border-white/5 px-8 sm:px-12 pt-8 gap-8 overflow-x-auto no-scrollbar">
              {([["general", "General", SlidersHorizontal], ["question_type", "Question Type", ListChecks], ["rules_limits", "Rules & Limits", Shield], ["categories", "Dynamic Categories", LayoutGrid], ["grading", "Scoring Matrix", Award]] as [SettingsTab, string, any][]).map(([key, label, Icon]) => (
                <button 
                  key={key} 
                  onClick={() => setActiveTab(key)}
                  className={`relative pb-6 px-1 text-sm font-bold flex items-center gap-2.5 whitespace-nowrap transition-all duration-300 ${
                    activeTab === key ? "text-brand-green" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-300 ${activeTab === key ? "scale-110" : ""}`} />
                  <span>{label}</span>
                  {activeTab === key && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-brand-green rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8 sm:p-12 min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* General Tab */}
                  {activeTab === "general" && (
                    <div className="space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Assessment Display Name</label><p className={descCls}>The name shown to administrators and in assessment headers.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="text" value={name} onChange={e => { setName(e.target.value); markDirty(); }} className={inputCls} /></div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Assessment Amount</label><p className={descCls}>The fee or value associated with this assessment. Set to 0 if free.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="number" min={0} step="0.01" value={amount} onChange={e => { const val = e.target.value; setAmount(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Trial Attempts Limit</label><p className={descCls}>Total number of trial attempts a candidate is allowed. Set to 0 for unlimited.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={trialAttemptsLimit} onChange={e => { const val = e.target.value; setTrialAttemptsLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="sm:max-w-md"><label className={labelCls}>Main Attempts Limit</label><p className={descCls}>Total number of main/paid attempts a candidate is allowed. Set to 0 for unlimited.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={mainAttemptsLimit} onChange={e => { const val = e.target.value; setMainAttemptsLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                      </div>
                    </div>
                  )}

                  {/* Question Type Tab */}
                  {activeTab === "question_type" && (
                    <div className="space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md">
                          <label className={labelCls}>Multiple Choice (MCQ)</label>
                          <p className={descCls}>Single correct answer from multiple options. The most common format for all modules.</p>
                        </div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch checked={enabledMCQ} onCheckedChange={(val) => { setEnabledMCQ(val); markDirty(); }} />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md">
                          <label className={labelCls}>Multi-Select MCQ (MSQ)</label>
                          <p className={descCls}>Allows candidates to select one or more correct options. Good for complex technical or logical scenarios.</p>
                        </div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch checked={enabledMSQ} onCheckedChange={(val) => { setEnabledMSQ(val); markDirty(); }} />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="sm:max-w-md">
                          <label className={labelCls}>True or False</label>
                          <p className={descCls}>Simple binary choice format. Ideal for quick verification of facts or logic statements.</p>
                        </div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch checked={enabledTF} onCheckedChange={(val) => { setEnabledTF(val); markDirty(); }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rules & Limits Tab */}
                  {activeTab === "rules_limits" && (
                    <div className="space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Test Timer (Minutes)</label><p className={descCls}>Total duration candidates have to complete this assessment.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="number" min={1} value={duration} onChange={e => { const val = e.target.value; setDuration(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Question Limit</label><p className={descCls}>Serve a random subset of this size. Set to 0 to deliver the entire question pool.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={questionLimit} onChange={e => { const val = e.target.value; setQuestionLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Tab-Switch Warning Limit</label><p className={descCls}>Auto-submit after this many tab switches. Set to 0 to disable.</p></div>
                        <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={tabSwitchLimit} onChange={e => { const val = e.target.value; setTabSwitchLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Block Copy & Paste</label><p className={descCls}>Prevent candidates from selecting or copying content during the test.</p></div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch checked={antiCopyEnabled} onCheckedChange={(val) => { setAntiCopyEnabled(val); markDirty(); }} />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 border-b border-slate-50 dark:border-white/[0.02]">
                        <div className="sm:max-w-md"><label className={labelCls}>Shuffle Questions Order</label><p className={descCls}>Scramble question ordering dynamically per candidate session.</p></div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch checked={shuffleQuestions} onCheckedChange={(val) => { setShuffleQuestions(val); markDirty(); }} />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="sm:max-w-md"><label className={labelCls}>Shuffle Question Options</label><p className={descCls}>Randomize option ordering on multiple-choice cards.</p></div>
                        <div className="sm:max-w-[400px] w-full flex justify-end">
                          <Switch checked={shuffleOptions} onCheckedChange={(val) => { setShuffleOptions(val); markDirty(); }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Categories Tab */}
                  {activeTab === "categories" && (
                    <div className="space-y-12">
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {categoriesList.map(cat => (
                          <div key={cat.id} className="flex flex-col bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                              <div className="min-w-0">
                                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate">{cat.name}</h3>
                                <code className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-1 block uppercase">{cat.id}</code>
                              </div>
                              <button 
                                onClick={() => window.confirm(`Delete "${cat.name}"?`) && (setCategoriesList(categoriesList.filter(c => c.id !== cat.id)), markDirty())}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="p-6 flex flex-col gap-6">
                              <div className="flex flex-wrap gap-2">
                                {(cat.subcategories || []).map(sc => (
                                  <div key={sc.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300 group/tag">
                                    <span>{sc.name}</span>
                                    <button onClick={() => handleRemoveSubCategory(cat.id, sc.id)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={12} strokeWidth={3} /></button>
                                  </div>
                                ))}
                              </div>
                              <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder="Add subcategory..." 
                                  value={newSubCategoryNames[cat.id] || ""}
                                  onChange={e => setNewSubCategoryNames(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                  onKeyDown={e => e.key === "Enter" && (handleAddSubCategory(cat.id, newSubCategoryNames[cat.id] || ""), setNewSubCategoryNames(prev => ({ ...prev, [cat.id]: "" })))}
                                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green/20 transition-all"
                                />
                                <button 
                                  onClick={() => { handleAddSubCategory(cat.id, newSubCategoryNames[cat.id] || ""); setNewSubCategoryNames(prev => ({ ...prev, [cat.id]: "" })); }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-brand-green text-white"
                                >
                                  <Plus size={14} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grading Tab */}
                  {activeTab === "grading" && (
                    <div className="space-y-12">
                      <div className="p-6 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex gap-4">
                        <Info className="w-6 h-6 text-brand-green flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Pluggable Weight Matrix</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">These values dynamically override individual question markings to ensure consistency across the entire assessment.</p>
                        </div>
                      </div>
                      {([["Easy", "brand-green", easyMarks, setEasyMarks, easyNeg, setEasyNeg],
                         ["Medium", "brand-green", mediumMarks, setMediumMarks, mediumNeg, setMediumNeg],
                         ["Hard", "brand-green", hardMarks, setHardMarks, hardNeg, setHardNeg]] as const).map(([label, color, marks, setM, neg, setN], i) => (
                        <div key={label} className={`flex flex-col sm:flex-row sm:items-start justify-between gap-8 ${i < 2 ? "pb-10 border-b border-slate-50 dark:border-white/[0.02]" : ""}`}>
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
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
