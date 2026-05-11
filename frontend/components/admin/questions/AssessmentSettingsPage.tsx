"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, Loader2, Plus, X, Info, LayoutGrid, Award, SlidersHorizontal, Shield, Trash2, Edit2, Check } from "lucide-react";
import { ApiAssessment, fetchAssessments, updateAssessment } from "./api";
import { AssessmentType, ASSESSMENT_TYPE_LABELS } from "./types";
import { AptitudeIcon, CommunicationIcon, MNCIcon, RoleIcon, ArrowRightWithoutLineIcon } from "@/components/icons";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const MODULE_ICONS: Record<AssessmentType, React.ReactNode> = {
  aptitude: <AptitudeIcon className="w-5 h-5" />,
  mnc: <MNCIcon className="w-5 h-5" />,
  communication: <CommunicationIcon className="w-5 h-5" />,
  role: <RoleIcon className="w-5 h-5" />,
};

type SettingsTab = "general" | "rules_limits" | "categories" | "grading";

export default function AssessmentSettingsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Record<string, ApiAssessment>>({});
  const [activeModule, setActiveModule] = useState<AssessmentType>("aptitude");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasModifications, setHasModifications] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | "">(60);
  const [questionLimit, setQuestionLimit] = useState<number | "">(0);
  const [tabSwitchLimit, setTabSwitchLimit] = useState<number | "">(0);
  const [antiCopyEnabled, setAntiCopyEnabled] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [amount, setAmount] = useState<number | "">(0);
  interface Category {
    id: string;
    name: string;
  }

  const [trialAttemptsLimit, setTrialAttemptsLimit] = useState<number | "">(5);
  const [mainAttemptsLimit, setMainAttemptsLimit] = useState<number | "">(2);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const handleStartEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;
    setCategoriesList(categoriesList.map(c => c.id === id ? { ...c, name: trimmed } : c));
    setEditingCategoryId(null);
    setEditingCategoryName("");
    markDirty();
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };
  const [easyMarks, setEasyMarks] = useState<number | "">(1);
  const [easyNeg, setEasyNeg] = useState<number | "">(0);
  const [mediumMarks, setMediumMarks] = useState<number | "">(2);
  const [mediumNeg, setMediumNeg] = useState<number | "">(0.25);
  const [hardMarks, setHardMarks] = useState<number | "">(5);
  const [hardNeg, setHardNeg] = useState<number | "">(0.25);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const modules: AssessmentType[] = ["aptitude", "mnc", "communication", "role"];
        const results: Record<string, ApiAssessment> = {};
        for (const m of modules) {
          const list = await fetchAssessments(m);
          if (list.length > 0) results[m] = list[0];
        }
        setAssessments(results);

        // Respective assessment setting opens automatically based on query parameter
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseMap = (val: any, fb: Record<string, number>) => {
    if (!val) return fb;
    if (typeof val === "object") return { ...fb, ...val };
    try { return { ...fb, ...JSON.parse(val) }; } catch { return fb; }
  };

  const parseCats = (val: any): Category[] => {
    if (!val) return [];
    let parsed: any[] = [];
    if (Array.isArray(val)) {
      parsed = val;
    } else {
      try {
        parsed = JSON.parse(val);
      } catch {
        parsed = [];
      }
    }
    return parsed.map((c: any) => {
      if (typeof c === "string") {
        return { id: c, name: c };
      }
      return { id: c.id || c.name || "", name: c.name || c.id || "" };
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
    setHasModifications(false);
  };

  const switchModule = (m: AssessmentType) => {
    if (hasModifications && !window.confirm("You have unsaved changes. Switch anyway?")) return;
    setActiveModule(m);
    setActiveTab("general");
    if (assessments[m]) populateForm(assessments[m]);
    setHasModifications(false);
  };

  const markDirty = () => setHasModifications(true);

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
      };
      const updated = await updateAssessment(a.assessment_id, payload as any);
      setAssessments(prev => ({ ...prev, [activeModule]: updated }));
      setHasModifications(false);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) { console.error(err); setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 5000); }
    finally { setSaving(false); }
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    const id = newCategoryId.trim() || name.toLowerCase().replace(/[^a-z0-9\-_]/g, "_").replace(/_+/g, "_");
    
    if (!name || !id) return;
    if (categoriesList.some(c => c.id.toLowerCase() === id.toLowerCase() || c.name.toLowerCase() === name.toLowerCase())) {
      alert("A category with this ID or Name already exists.");
      return;
    }
    setCategoriesList([...categoriesList, { id, name }]);
    setNewCategoryName("");
    setNewCategoryId("");
    markDirty();
  };

  const inputCls = "block w-full max-w-lg rounded-lg border-0 py-2.5 px-4 bg-slate-50 dark:bg-white/5 text-black dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-white/10 placeholder:text-black/50 dark:placeholder:text-white/50 focus:ring-2 focus:ring-inset focus:ring-brand-green sm:text-sm sm:leading-6 transition-all hover:ring-slate-300 dark:hover:ring-white/20";
  const labelCls = "block text-[15px] font-semibold leading-6 text-black dark:text-white";
  const descCls = "mt-1.5 text-[13px] leading-relaxed text-black dark:text-white font-medium";

  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-brand-light-secondary dark:bg-brand-dark-primary font-sans">
        <div className="flex h-full w-full items-center justify-center min-h-[500px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent shadow-[0_0_15px_rgba(30,211,106,0.5)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none"><div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] assessment-grid" /></div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 h-[64px] sm:h-[72px] bg-white/[0.9] dark:bg-[#19211C]/[0.9] backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          <div className="flex items-center gap-6">
            <Logo className="h-5" />
            <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px] animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 px-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-xs text-black dark:text-white mb-1.5 font-normal flex-wrap">
              <button onClick={() => router.push("/admin/questions")} className="hover:underline hover:text-brand-green transition-colors cursor-pointer text-black dark:text-white">
                Dashboard
              </button>
              <span className="mx-2 text-gray-400 dark:text-gray-600">
                <ArrowRightWithoutLineIcon className="w-3 h-3 text-black dark:text-white" />
              </span>
              <button onClick={() => router.push("/admin/questions")} className="hover:underline hover:text-brand-green transition-colors cursor-pointer text-black dark:text-white">
                Question Banks
              </button>
              <span className="mx-2 text-gray-400 dark:text-gray-600">
                <ArrowRightWithoutLineIcon className="w-3 h-3 text-black dark:text-white" />
              </span>
              <span className="text-brand-green font-semibold">
                {ASSESSMENT_TYPE_LABELS[activeModule]} Settings
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
              {ASSESSMENT_TYPE_LABELS[activeModule]} Settings
            </h1>

          </div>
          <div className="flex items-center gap-4">
            {saveStatus === "success" && <span className="flex items-center text-sm font-medium text-brand-green animate-pulse">✓ Saved successfully</span>}
            {saveStatus === "error" && <span className="text-sm font-medium text-red-500">Failed to save</span>}
            <button onClick={handleSave} disabled={!hasModifications || saving}
              className={`inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${hasModifications && !saving ? "bg-brand-green hover:bg-brand-green/90 hover:shadow-lg hover:shadow-brand-green/30 hover:-translate-y-0.5" : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-80"}`}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
            </button>
          </div>
        </div>

        {/* Single-column layout (Sidebar removed) */}
        <div className="w-full pb-12 h-full min-h-[600px]">
          {/* Right Pane (Now takes full width) */}
          <div className="w-full">
            <div className="bg-white/60 dark:bg-[#1f2823]/80 backdrop-blur-xl rounded-2xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/5 overflow-hidden border border-white dark:border-white/[0.05]">
              {/* Tab navigation inside card */}
              <div className="flex border-b border-gray-100 dark:border-white/5 px-6 sm:px-10 pt-6 gap-6 overflow-x-auto">
                {([["general", "General", SlidersHorizontal], ["rules_limits", "Rules & Limits", Shield], ["categories", "Dynamic Categories", LayoutGrid], ["grading", "Scoring Matrix", Award]] as [SettingsTab, string, any][]).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`pb-4 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${activeTab === key ? "border-brand-green text-brand-green" : "border-transparent text-black dark:text-white hover:text-brand-green"}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              <div className="px-6 py-8 sm:p-10">
                {/* General Tab */}
                {activeTab === "general" && (
                  <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Assessment Display Name</label><p className={descCls}>The name shown to administrators and in assessment headers.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="text" value={name} onChange={e => { setName(e.target.value); markDirty(); }} className={inputCls} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Assessment Amount</label><p className={descCls}>The fee or value associated with this assessment. Set to 0 if free.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="number" min={0} step="0.01" value={amount} onChange={e => { const val = e.target.value; setAmount(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Trial Attempts Limit</label><p className={descCls}>Total number of trial attempts a candidate is allowed. Set to 0 for unlimited.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={trialAttemptsLimit} onChange={e => { const val = e.target.value; setTrialAttemptsLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="sm:max-w-md"><label className={labelCls}>Main Attempts Limit</label><p className={descCls}>Total number of main/paid attempts a candidate is allowed. Set to 0 for unlimited.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={mainAttemptsLimit} onChange={e => { const val = e.target.value; setMainAttemptsLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                    </div>
                  </div>
                )}

                {/* Rules & Limits Tab */}
                {activeTab === "rules_limits" && (
                  <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Test Timer (Minutes)</label><p className={descCls}>Total duration candidates have to complete this assessment.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="number" min={1} value={duration} onChange={e => { const val = e.target.value; setDuration(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Question Limit</label><p className={descCls}>Serve a random subset of this size. Set to 0 to deliver the entire question pool.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={questionLimit} onChange={e => { const val = e.target.value; setQuestionLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Tab-Switch Warning Limit</label><p className={descCls}>Auto-submit after this many tab switches. Set to 0 to disable.</p></div>
                      <div className="sm:max-w-[400px] w-full"><input type="number" min={0} value={tabSwitchLimit} onChange={e => { const val = e.target.value; setTabSwitchLimit(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Block Copy & Paste</label><p className={descCls}>Prevent candidates from selecting or copying content during the test.</p></div>
                      <button onClick={() => { setAntiCopyEnabled(!antiCopyEnabled); markDirty(); }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${antiCopyEnabled ? "bg-brand-green" : "bg-gray-200 dark:bg-gray-700"}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${antiCopyEnabled ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <div className="sm:max-w-md"><label className={labelCls}>Shuffle Questions Order</label><p className={descCls}>Scramble question ordering dynamically per candidate session.</p></div>
                      <button onClick={() => { setShuffleQuestions(!shuffleQuestions); markDirty(); }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${shuffleQuestions ? "bg-brand-green" : "bg-gray-200 dark:bg-gray-700"}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${shuffleQuestions ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="sm:max-w-md"><label className={labelCls}>Shuffle Question Options</label><p className={descCls}>Randomize option ordering on multiple-choice cards.</p></div>
                      <button onClick={() => { setShuffleOptions(!shuffleOptions); markDirty(); }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${shuffleOptions ? "bg-brand-green" : "bg-gray-200 dark:bg-gray-700"}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${shuffleOptions ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Categories Tab */}
                {activeTab === "categories" && (
                  <div className="space-y-10">
                    <div className="pb-8 border-b border-gray-50 dark:border-white/[0.02]">
                      <label className={labelCls}>Add Custom Category / Topic</label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 max-w-2xl">
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1.5">Category Name</label>
                          <input 
                            type="text" 
                            value={newCategoryName} 
                            onChange={e => {
                              const val = e.target.value;
                              setNewCategoryName(val);
                              const slug = val
                                .trim()
                                .toLowerCase()
                                .replace(/[^a-z0-9\-_]/g, "_")
                                .replace(/_+/g, "_");
                              setNewCategoryId(slug);
                            }}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                            className={inputCls} 
                            placeholder="e.g. Data Interpretation" 
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1.5">Category ID (For Backend)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={newCategoryId} 
                              onChange={e => setNewCategoryId(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, ""))}
                              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                              className={inputCls + " flex-1"} 
                              placeholder="e.g. data_interpretation" 
                            />
                            <button 
                              type="button" 
                              onClick={handleAddCategory}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition shadow-sm active:scale-95 shrink-0"
                            >
                              <Plus className="w-4 h-4" />Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Active Categories ({categoriesList.length})</label>
                      {categoriesList.length === 0 ? (
                        <div className="mt-4 p-8 text-center bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-black dark:text-white font-medium text-sm">No categories configured yet.</div>
                      ) : (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.01] shadow-sm max-w-2xl custom-scrollbar">
                          <table className="min-w-[500px] w-full divide-y divide-slate-100 dark:divide-white/10">
                            <thead className="bg-slate-50 dark:bg-white/5">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Category Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Category ID</th>
                                <th scope="col" className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white w-20">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] bg-transparent">
                              {categoriesList.map(cat => {
                                const isEditing = cat.id === editingCategoryId;
                                return (
                                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={editingCategoryName}
                                          onChange={e => setEditingCategoryName(e.target.value)}
                                          onKeyDown={e => e.key === "Enter" && handleSaveEdit(cat.id)}
                                          className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold max-w-xs focus:ring-2 focus:ring-brand-green/50 focus:outline-none text-slate-900 dark:text-white transition-all shadow-inner"
                                          placeholder="Category Name"
                                        />
                                      ) : (
                                        cat.name
                                      )}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-mono font-bold text-slate-900 dark:text-white leading-normal border border-slate-200/50 dark:border-white/5 opacity-80">
                                        {cat.id}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-center text-sm">
                                      <div className="flex items-center justify-center gap-1.5">
                                        {isEditing ? (
                                          <>
                                            <button 
                                              type="button" 
                                              onClick={() => handleSaveEdit(cat.id)}
                                              title="Save name"
                                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                            >
                                              <Check className="h-4 w-4 stroke-[2.5]" />
                                            </button>
                                            <button 
                                              type="button" 
                                              onClick={handleCancelEdit}
                                              title="Cancel editing"
                                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-orange-500 dark:text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                                            >
                                              <X className="h-4 w-4 stroke-[2.5]" />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button 
                                              type="button" 
                                              onClick={() => handleStartEdit(cat)}
                                              title="Edit category name"
                                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-blue-500 dark:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button 
                                              type="button" 
                                              onClick={() => { 
                                                if (window.confirm(`Are you sure you want to delete "${cat.name}"?`)) {
                                                  setCategoriesList(categoriesList.filter(c => c.id !== cat.id)); 
                                                  markDirty(); 
                                                }
                                              }}
                                              title="Delete category"
                                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Grading Tab */}
                {activeTab === "grading" && (
                  <div className="space-y-10">
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-2xl flex gap-3">
                      <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[13px] text-black dark:text-white font-semibold leading-relaxed">
                        <strong>Pluggable Weight Matrix:</strong> These values dynamically override individual question-level markings to guarantee consistent scoring across the assessment.
                      </p>
                    </div>
                    {([["Easy", "brand-green", easyMarks, setEasyMarks, easyNeg, setEasyNeg],
                       ["Medium", "teal-500", mediumMarks, setMediumMarks, mediumNeg, setMediumNeg],
                       ["Hard", "amber-500", hardMarks, setHardMarks, hardNeg, setHardNeg]] as const).map(([label, color, marks, setM, neg, setN], i) => (
                      <div key={label} className={`flex flex-col sm:flex-row sm:items-start justify-between gap-6 ${i < 2 ? "pb-8 border-b border-gray-50 dark:border-white/[0.02]" : ""}`}>
                        <div className="sm:max-w-md">
                          <label className={labelCls}>{label} Complexity Score</label>
                          <p className={descCls}>Positive marks awarded and negative deduction for {label.toLowerCase()}-level questions.</p>
                        </div>
                        <div className="flex gap-4 sm:max-w-[400px] w-full">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-black dark:text-white uppercase mb-1.5">+ Marks</label>
                            <input type="number" step="0.25" min="0" value={marks}
                              onChange={e => { const val = e.target.value; (setM as any)(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-black dark:text-white uppercase mb-1.5">− Penalty</label>
                            <input type="number" step="0.05" min="0" value={neg}
                              onChange={e => { const val = e.target.value; (setN as any)(val === "" ? "" : Number(val)); markDirty(); }} className={inputCls} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
