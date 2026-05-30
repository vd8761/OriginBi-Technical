import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Save, Loader2, Info, Plus, Shield, 
    Settings, LayoutGrid, Award, SlidersHorizontal,
    Trash2, Edit2, Check
} from "lucide-react";
import { ApiAssessment, updateAssessment } from "./api";
import { useConfirm } from "@/components/admin/ui";

interface AssessmentSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assessment: ApiAssessment | null;
    onUpdateSuccess: (updated: ApiAssessment) => void;
}

type TabType = "general" | "rules_limits" | "categories" | "grading";

export default function AssessmentSettingsModal({
    isOpen,
    onClose,
    assessment,
    onUpdateSuccess
}: AssessmentSettingsModalProps) {
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState<TabType>("general");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [duration, setDuration] = useState(60);
    const [questionLimit, setQuestionLimit] = useState(0);
    const [trialQuestionLimit, setTrialQuestionLimit] = useState(5);
    const [tabSwitchLimit, setTabSwitchLimit] = useState(0);
    const [antiCopyEnabled, setAntiCopyEnabled] = useState(false);
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleOptions, setShuffleOptions] = useState(true);
    const [amount, setAmount] = useState(0);
    const [trialAttemptsLimit, setTrialAttemptsLimit] = useState(5);
    const [mainAttemptsLimit, setMainAttemptsLimit] = useState(2);

    interface Category {
        id: string;
        name: string;
    }

    // Category states
    const [categoriesList, setCategoriesList] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryId, setNewCategoryId] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");

    // Scoring states
    const [easyMarks, setEasyMarks] = useState(1);
    const [easyNegMarks, setEasyNegMarks] = useState(0);
    const [mediumMarks, setMediumMarks] = useState(2);
    const [mediumNegMarks, setMediumNegMarks] = useState(0);
    const [hardMarks, setHardMarks] = useState(5);
    const [hardNegMarks, setHardNegMarks] = useState(0.25);

    // Load initial values when the assessment opens
    useEffect(() => {
        if (!assessment) return;

        setName(assessment.assessment_name || "");
        setDuration(Number(assessment.total_time_minutes || 60));
        setQuestionLimit(Number(assessment.question_limit || 0));
        setTrialQuestionLimit(assessment.trial_question_limit !== undefined && assessment.trial_question_limit !== null ? Number(assessment.trial_question_limit) : 5);
        setTabSwitchLimit(Number(assessment.tab_switch_limit || 0));
        setAntiCopyEnabled(Boolean(assessment.anti_copy_enabled));
        setShuffleQuestions(Boolean(assessment.shuffle_questions));
        setShuffleOptions(Boolean(assessment.shuffle_options));
        setAmount(assessment.amount !== undefined && assessment.amount !== null ? Number(assessment.amount) : 0);
        setTrialAttemptsLimit(assessment.trial_attempts_limit !== undefined && assessment.trial_attempts_limit !== null ? Number(assessment.trial_attempts_limit) : 5);
        setMainAttemptsLimit(assessment.main_attempts_limit !== undefined && assessment.main_attempts_limit !== null ? Number(assessment.main_attempts_limit) : 2);

        // Categories helper
        let rawCats: any[] = [];
        if (assessment.categories) {
            if (Array.isArray(assessment.categories)) {
                rawCats = assessment.categories;
            } else if (typeof assessment.categories === "string") {
                try {
                    rawCats = JSON.parse(assessment.categories);
                } catch {
                    rawCats = [];
                }
            }
        }
        const cats: Category[] = rawCats.map((c: any) => {
            if (typeof c === "string") {
                return { id: c, name: c };
            }
            return { id: c.id || c.name || "", name: c.name || c.id || "" };
        });
        setCategoriesList(cats);

        // Scoring matrices
        const parseMap = (val: any, fallback: Record<string, number>) => {
            if (!val) return fallback;
            if (typeof val === "object") return { ...fallback, ...val };
            try {
                return { ...fallback, ...JSON.parse(val) };
            } catch {
                return fallback;
            }
        };

        const marks = parseMap(assessment.difficulty_marks, { easy: 1, medium: 2, hard: 5 });
        const negs = parseMap(assessment.difficulty_negative_marks, { easy: 0, medium: 0.25, hard: 0.25 });

        setEasyMarks(Number(marks.easy));
        setMediumMarks(Number(marks.medium));
        setHardMarks(Number(marks.hard));

        setEasyNegMarks(Number(negs.easy));
        setMediumNegMarks(Number(negs.medium));
        setHardNegMarks(Number(negs.hard));

        setError(null);
    }, [assessment, isOpen]);

    if (!isOpen || !assessment) return null;

    // Categories Tag Handlers
    const handleAddCategory = () => {
        const name = newCategoryName.trim();
        const id = newCategoryId.trim() || name.toLowerCase().replace(/[^a-z0-9\-_]/g, "_").replace(/_+/g, "_");
        if (!name || !id) return;
        if (categoriesList.some(c => c.id.toLowerCase() === id.toLowerCase() || c.name.toLowerCase() === name.toLowerCase())) {
            setError("Category with this ID or Name already exists.");
            return;
        }
        setCategoriesList([...categoriesList, { id, name }]);
        setNewCategoryName("");
        setNewCategoryId("");
        setError(null);
    };

    const handleRemoveCategory = async (catToRemove: Category) => {
        const confirmed = await confirm({
            title: "Delete Category?",
            message: `Are you sure you want to delete "${catToRemove.name}"?`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            variant: "danger",
        });
        if (confirmed) {
            setCategoriesList(categoriesList.filter(c => c.id !== catToRemove.id));
        }
    };

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
        setError(null);
    };

    const handleCancelEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName("");
    };

    // Form Submission
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const diffMarks = {
                easy: easyMarks,
                medium: mediumMarks,
                hard: hardMarks
            };

            const diffNegMarks = {
                easy: easyNegMarks,
                medium: mediumNegMarks,
                hard: hardNegMarks
            };

            const payload = {
                assessment_name: name,
                total_time_minutes: duration,
                question_limit: questionLimit,
                trialQuestionLimit: trialQuestionLimit,
                categories: categoriesList,
                difficulty_marks: diffMarks,
                difficulty_negative_marks: diffNegMarks,
                tab_switch_limit: tabSwitchLimit,
                anti_copy_enabled: antiCopyEnabled,
                shuffle_questions: shuffleQuestions,
                shuffle_options: shuffleOptions,
                amount: amount,
                trialAttemptsLimit: trialAttemptsLimit,
                mainAttemptsLimit: mainAttemptsLimit
            };

            const updated = await updateAssessment(assessment.assessment_id, payload as any);
            onUpdateSuccess(updated);
            onClose();
        } catch (err: any) {
            console.error("Failed to update assessment settings:", err);
            setError(err.message || "An error occurred while saving assessment settings.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden text-slate-100">
            {/* Backdrop Blur overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar drawer container */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative z-10 w-full max-w-xl bg-slate-900 border-l border-emerald-500/20 text-white shadow-2xl flex flex-col h-full"
            >
                {/* Drawer Header */}
                <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent">
                    <div>
                        <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2">
                            <Settings className="w-5 h-5 text-emerald-400" />
                            Assessment Settings
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Configure pluggable parameters and custom grading behaviors.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-800 px-6 py-2 gap-4 bg-slate-950/40 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab("general")}
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                            activeTab === "general" 
                                ? "border-emerald-400 text-emerald-400" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        General
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("rules_limits")}
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                            activeTab === "rules_limits" 
                                ? "border-emerald-400 text-emerald-400" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Shield className="w-4 h-4" />
                        Rules & Limits
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("categories")}
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                            activeTab === "categories" 
                                ? "border-emerald-400 text-emerald-400" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Dynamic Categories
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("grading")}
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                            activeTab === "grading" 
                                ? "border-emerald-400 text-emerald-400" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Award className="w-4 h-4" />
                        Scoring Matrix
                    </button>
                </div>

                {/* Content Area - Scrollable */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-lg text-xs">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {activeTab === "general" && (
                            <motion.div
                                key="general"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase block">
                                        Assessment Display Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                        placeholder="e.g. Technical Aptitude Assessment"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase block">
                                        Assessment Amount
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3.5 text-slate-400 font-bold text-sm pointer-events-none">
                                            ₹
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            required
                                            value={amount}
                                            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 pl-8 pr-3 text-sm text-white outline-none transition"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase block">
                                            Trial Attempts Limit
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            required
                                            value={trialAttemptsLimit}
                                            onChange={(e) => setTrialAttemptsLimit(Math.max(0, Number(e.target.value)))}
                                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase block">
                                            Main Attempts Limit
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            required
                                            value={mainAttemptsLimit}
                                            onChange={(e) => setMainAttemptsLimit(Math.max(0, Number(e.target.value)))}
                                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "rules_limits" && (
                            <motion.div
                                key="rules_limits"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                                            Test Timer (Minutes)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            required
                                            value={duration}
                                            onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                                            Question Limit
                                            <span className="group relative text-slate-500 hover:text-emerald-400 cursor-help">
                                                <Info className="w-3.5 h-3.5" />
                                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-950 border border-slate-800 p-2 rounded text-[10px] w-48 text-slate-300 shadow-xl z-20 font-normal normal-case leading-normal">
                                                    Serves a random subset of this size to candidates. Set to 0 to deliver the entire pool.
                                                </span>
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            required
                                            value={questionLimit}
                                            onChange={(e) => setQuestionLimit(Math.max(0, Number(e.target.value)))}
                                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                        />
                                        <div className="mt-2 text-xs leading-relaxed text-slate-400">
                                            Active Question Pool size: <strong>{assessment?.main_questions_count ?? 0} active main question(s)</strong>.
                                        </div>
                                        <div className="mt-2 p-2.5 rounded-lg border border-blue-500/10 bg-blue-500/5 text-blue-400 text-xs leading-relaxed">
                                            <strong>Trial Assessment:</strong> Bypasses adaptive engine and serves a fixed set of trial questions (first 5). Currently, there are <strong>{assessment?.trial_questions_count ?? 0} active trial question(s)</strong> in the question bank.
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                                            Trial Question Limit
                                            <span className="group relative text-slate-500 hover:text-emerald-400 cursor-help">
                                                <Info className="w-3.5 h-3.5" />
                                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-950 border border-slate-800 p-2 rounded text-[10px] w-52 text-slate-300 shadow-xl z-20 font-normal normal-case leading-normal">
                                                    Set to 0 to use the default of 5 trial questions.
                                                </span>
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            required
                                            value={trialQuestionLimit}
                                            onChange={(e) => setTrialQuestionLimit(Math.max(0, Number(e.target.value)))}
                                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                                                <Shield className="w-4 h-4" />
                                                Active Proctoring Strictness
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Block cheating behavior during test takes.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-300">
                                                Tab-Switch Warning Limit
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                required
                                                value={tabSwitchLimit}
                                                onChange={(e) => setTabSwitchLimit(Math.max(0, Number(e.target.value)))}
                                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-2.5 text-xs text-white outline-none transition"
                                                placeholder="0 = Disabled"
                                            />
                                        </div>

                                        <div className="flex flex-col justify-end space-y-2">
                                            <label className="text-xs font-medium text-slate-300 flex items-center justify-between cursor-pointer">
                                                <span>Block Copy & Paste</span>
                                                <input
                                                    type="checkbox"
                                                    checked={antiCopyEnabled}
                                                    onChange={(e) => setAntiCopyEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="relative w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-emerald-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                                        Gameplay Behavior Options
                                    </h3>
                                    
                                    <label className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition">
                                        <div>
                                            <span className="text-sm font-medium block">Shuffle Questions Order</span>
                                            <span className="text-xs text-slate-400 mt-0.5">Scramble questions dynamically per user session.</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={shuffleQuestions}
                                            onChange={(e) => setShuffleQuestions(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="relative w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-emerald-500"></div>
                                    </label>

                                    <label className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition">
                                        <div>
                                            <span className="text-sm font-medium block">Shuffle Question Options</span>
                                            <span className="text-xs text-slate-400 mt-0.5">Randomize option ordering on multiple-choice layout cards.</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={shuffleOptions}
                                            onChange={(e) => setShuffleOptions(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="relative w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-emerald-500"></div>
                                    </label>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "categories" && (
                            <motion.div
                                key="categories"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-extrabold text-white tracking-wider uppercase block">
                                                Category Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setNewCategoryName(val);
                                                    const slug = val
                                                        .trim()
                                                        .toLowerCase()
                                                        .replace(/[^a-z0-9\-_]/g, "_")
                                                        .replace(/_+/g, "_");
                                                    setNewCategoryId(slug);
                                                }}
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                                placeholder="e.g. Data Interpretation"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-extrabold text-white tracking-wider uppercase block">
                                                Category ID (for backend)
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCategoryId}
                                                    onChange={(e) => setNewCategoryId(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, ""))}
                                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                                                    className="flex-1 bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                                    placeholder="e.g. data_interpretation"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCategory}
                                                    className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-semibold text-xs px-4 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap"
                                                >
                                                    <Plus className="w-4 h-4 stroke-[3]" />
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-xs font-extrabold text-white tracking-wider uppercase block">
                                        Active Categories ({categoriesList.length})
                                    </label>

                                    {categoriesList.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-950/20 border border-dashed border-slate-800 rounded-xl text-slate-200 text-sm">
                                            No categories set. Add categories above to populate selection editors.
                                        </div>
                                    ) : (
                                        <div className="border border-slate-800 bg-slate-950/20 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                                            {categoriesList.map((cat) => {
                                                const isEditing = cat.id === editingCategoryId;
                                                return (
                                                    <motion.div
                                                        layout
                                                        key={cat.id}
                                                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                                                    >
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editingCategoryName}
                                                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                                                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(cat.id)}
                                                                className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-1 px-2.5 text-sm text-white outline-none transition"
                                                                placeholder="Category Name"
                                                            />
                                                        ) : (
                                                            <span className="font-semibold text-sm text-white">{cat.name}</span>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-mono font-bold text-white bg-slate-800 px-2.5 py-0.5 border border-slate-700 rounded shadow-inner">
                                                                {cat.id}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                {isEditing ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveEdit(cat.id)}
                                                                            title="Save name"
                                                                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition"
                                                                        >
                                                                            <Check className="w-4 h-4 stroke-[2.5]" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleCancelEdit}
                                                                            title="Cancel editing"
                                                                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition"
                                                                        >
                                                                            <X className="w-4 h-4 stroke-[2.5]" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleStartEdit(cat)}
                                                                            title="Edit category name"
                                                                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition"
                                                                        >
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveCategory(cat)}
                                                                            title="Delete category"
                                                                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "grading" && (
                            <motion.div
                                key="grading"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-3 text-amber-200">
                                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs leading-relaxed">
                                        <strong>Pluggable Weight Matrix:</strong> These values define the negative marks (penalties) for each difficulty level if negative marking is enabled. Positive marks are configured individually on each question to keep them flexible.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* Easy Rule */}
                                    <div className="p-4 bg-slate-950/40 border border-slate-800 hover:border-emerald-500/10 rounded-xl space-y-3.5 transition">
                                        <h3 className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                                            Easy Complexity Score
                                        </h3>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                Negative Deduction (Penalty)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                required
                                                value={easyNegMarks}
                                                onChange={(e) => setEasyNegMarks(Math.max(0, Number(e.target.value)))}
                                                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/30 rounded-lg py-1.5 px-3 text-sm text-white outline-none transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Medium Rule */}
                                    <div className="p-4 bg-slate-950/40 border border-slate-800 hover:border-emerald-500/10 rounded-xl space-y-3.5 transition">
                                        <h3 className="text-xs font-bold text-teal-400 tracking-wider uppercase">
                                            Medium Complexity Score
                                        </h3>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                Negative Deduction (Penalty)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                required
                                                value={mediumNegMarks}
                                                onChange={(e) => setMediumNegMarks(Math.max(0, Number(e.target.value)))}
                                                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/30 rounded-lg py-1.5 px-3 text-sm text-white outline-none transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Hard Rule */}
                                    <div className="p-4 bg-slate-950/40 border border-slate-800 hover:border-emerald-500/10 rounded-xl space-y-3.5 transition">
                                        <h3 className="text-xs font-bold text-amber-500 tracking-wider uppercase">
                                            Hard Complexity Score
                                        </h3>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                Negative Deduction (Penalty)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                required
                                                value={hardNegMarks}
                                                onChange={(e) => setHardNegMarks(Math.max(0, Number(e.target.value)))}
                                                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/30 rounded-lg py-1.5 px-3 text-sm text-white outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>

                {/* Drawer Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-medium border border-slate-800 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-emerald-500/10 active:scale-95 disabled:opacity-50 disabled:scale-100 transition"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving Configurations...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Configurations
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
