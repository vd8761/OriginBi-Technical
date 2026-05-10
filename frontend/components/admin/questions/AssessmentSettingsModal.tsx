import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Save, Loader2, Info, Plus, Shield, 
    Settings, LayoutGrid, Award, SlidersHorizontal 
} from "lucide-react";
import { ApiAssessment, updateAssessment } from "./api";

interface AssessmentSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assessment: ApiAssessment | null;
    onUpdateSuccess: (updated: ApiAssessment) => void;
}

type TabType = "general" | "categories" | "grading";

export default function AssessmentSettingsModal({
    isOpen,
    onClose,
    assessment,
    onUpdateSuccess
}: AssessmentSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("general");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [duration, setDuration] = useState(60);
    const [questionLimit, setQuestionLimit] = useState(0);
    const [tabSwitchLimit, setTabSwitchLimit] = useState(0);
    const [antiCopyEnabled, setAntiCopyEnabled] = useState(false);
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleOptions, setShuffleOptions] = useState(true);

    // Category states
    const [categoriesList, setCategoriesList] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState("");

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
        setTabSwitchLimit(Number(assessment.tab_switch_limit || 0));
        setAntiCopyEnabled(Boolean(assessment.anti_copy_enabled));
        setShuffleQuestions(Boolean(assessment.shuffle_questions));
        setShuffleOptions(Boolean(assessment.shuffle_options));

        // Categories helper
        let cats: string[] = [];
        if (assessment.categories) {
            if (Array.isArray(assessment.categories)) {
                cats = assessment.categories;
            } else if (typeof assessment.categories === "string") {
                try {
                    cats = JSON.parse(assessment.categories);
                } catch {
                    cats = [];
                }
            }
        }
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
        const trimmed = newCategory.trim();
        if (!trimmed) return;
        if (categoriesList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setError("Category already exists.");
            return;
        }
        setCategoriesList([...categoriesList, trimmed]);
        setNewCategory("");
        setError(null);
    };

    const handleRemoveCategory = (catToRemove: string) => {
        setCategoriesList(categoriesList.filter(c => c !== catToRemove));
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
                categories: categoriesList,
                difficulty_marks: diffMarks,
                difficulty_negative_marks: diffNegMarks,
                tab_switch_limit: tabSwitchLimit,
                anti_copy_enabled: antiCopyEnabled,
                shuffle_questions: shuffleQuestions,
                shuffle_options: shuffleOptions
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
                <div className="flex border-b border-slate-800 px-6 py-2 gap-4 bg-slate-950/40">
                    <button
                        type="button"
                        onClick={() => setActiveTab("general")}
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                            activeTab === "general" 
                                ? "border-emerald-400 text-emerald-400" 
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Rules & Limits
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("categories")}
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
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
                        className={`py-2 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
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
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase block">
                                        Add Custom Category/Topic
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                                            className="flex-1 bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                                            placeholder="Type a custom topic (e.g., Logical Fallacy)"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-semibold text-xs px-4 rounded-lg flex items-center gap-1.5 transition"
                                        >
                                            <Plus className="w-4 h-4 stroke-[3]" />
                                            Add
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                                        Active Categories ({categoriesList.length})
                                    </label>

                                    {categoriesList.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-950/20 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                                            No categories set. Add categories above to populate selection editors.
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2.5 p-4 bg-slate-950/40 border border-slate-800 rounded-xl max-h-80 overflow-y-auto">
                                            {categoriesList.map((cat) => (
                                                <motion.div
                                                    layout
                                                    key={cat}
                                                    className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 pl-3 pr-1.5 py-1 rounded-full flex items-center gap-2 text-xs text-slate-200 shadow-md group transition"
                                                >
                                                    <span className="font-medium">{cat}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCategory(cat)}
                                                        className="p-1 rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </motion.div>
                                            ))}
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
                                        <strong>Pluggable Weight Matrix:</strong> These values represent default scoring configurations. Marks entered below dynamically override individual question-level markings to guarantee absolute consistency across the assessment.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* Easy Rule */}
                                    <div className="p-4 bg-slate-950/40 border border-slate-800 hover:border-emerald-500/10 rounded-xl space-y-3.5 transition">
                                        <h3 className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                                            Easy Complexity Score
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Positive Marks
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.25"
                                                    min="0"
                                                    required
                                                    value={easyMarks}
                                                    onChange={(e) => setEasyMarks(Math.max(0, Number(e.target.value)))}
                                                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/30 rounded-lg py-1.5 px-3 text-sm text-white outline-none transition"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Negative Deduction
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
                                    </div>

                                    {/* Medium Rule */}
                                    <div className="p-4 bg-slate-950/40 border border-slate-800 hover:border-emerald-500/10 rounded-xl space-y-3.5 transition">
                                        <h3 className="text-xs font-bold text-teal-400 tracking-wider uppercase">
                                            Medium Complexity Score
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Positive Marks
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.25"
                                                    min="0"
                                                    required
                                                    value={mediumMarks}
                                                    onChange={(e) => setMediumMarks(Math.max(0, Number(e.target.value)))}
                                                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/30 rounded-lg py-1.5 px-3 text-sm text-white outline-none transition"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Negative Deduction
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
                                    </div>

                                    {/* Hard Rule */}
                                    <div className="p-4 bg-slate-950/40 border border-slate-800 hover:border-emerald-500/10 rounded-xl space-y-3.5 transition">
                                        <h3 className="text-xs font-bold text-amber-500 tracking-wider uppercase">
                                            Hard Complexity Score
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Positive Marks
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.25"
                                                    min="0"
                                                    required
                                                    value={hardMarks}
                                                    onChange={(e) => setHardMarks(Math.max(0, Number(e.target.value)))}
                                                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/30 rounded-lg py-1.5 px-3 text-sm text-white outline-none transition"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Negative Deduction
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
