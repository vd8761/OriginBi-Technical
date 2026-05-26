"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Check, X, AlertCircle, Award, 
  HelpCircle, Volume2, Mic, FileText, Briefcase, 
  Tag, Clock, List, AlertTriangle, Layers, Edit, Eye
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { fetchQuestion, ApiQuestion } from "@/components/admin/questions/api";
import { AnyQuestion, AssessmentType, ASSESSMENT_TYPE_LABELS, QUESTION_KIND_LABELS, APTITUDE_CATEGORY_LABELS, QuestionKind } from "@/components/admin/questions/types";

function apiToFrontend(module: AssessmentType, q: ApiQuestion): AnyQuestion {
  const common = {
    id: String(q.id),
    text: q.questionText,
    options: q.options ? q.options.map(o => ({ id: String(o.id), text: o.text })) : [],
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
    correctAnswer: q.metadata?.correctAnswer || undefined,
  };

  switch (module) {
    case "aptitude":
      return { ...common, category: q.category, subcategory: q.subcategory } as any;
    case "mnc":
      return { ...common, topic: q.category } as any;
    case "communication": {
      const commQ: any = {
        ...common,
        taskType: q.category as any,
        instructions: q.questionText,
        passage: q.metadata?.passage,
        audioUrl: q.metadata?.audioUrl,
        prompt: q.metadata?.prompt,
        prepTimeSeconds: q.metadata?.prepTimeSeconds,
        recordTimeSeconds: q.metadata?.recordTimeSeconds,
        minWords: q.metadata?.minWords,
        maxWords: q.metadata?.maxWords,
        questions: q.metadata?.questions,
      };
      return commQ as any;
    }
    case "role": {
      const roleQ: any = {
        ...common,
        questionType: q.category as any,
        category: q.subcategory,
        subCategory: q.subcategory,
        title: q.metadata?.title,
        scenarioContext: q.metadata?.scenarioContext,
        ticketId: q.metadata?.ticketId,
        priority: q.metadata?.priority,
        reportedBy: q.metadata?.reportedBy,
      };
      return roleQ as any;
    }
    default:
      return common as any;
  }
}

function QuestionDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionId = params.questionId as string;
  const moduleParam = searchParams.get("module") as AssessmentType;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [rawDbQuestion, setRawDbQuestion] = useState<ApiQuestion | null>(null);

  // Register breadcrumbs & title dynamically
  useRegisterAdminPage({
    eyebrow: "Workspace",
    title: "Question Details",
    breadcrumb: [
      { label: "Assessments", href: "/admin/questions" },
      ...(moduleParam ? [{ label: ASSESSMENT_TYPE_LABELS[moduleParam] || moduleParam, href: `/admin/questions?module=${moduleParam}` }] : []),
      { label: "Question Details" },
    ],
  });

  useEffect(() => {
    if (!questionId || !moduleParam) {
      setError("Missing question ID or module parameter.");
      setLoading(false);
      return;
    }

    const loadQuestionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch raw DB question
        const qIdNum = parseInt(questionId, 10);
        if (isNaN(qIdNum)) {
          throw new Error("Invalid question ID format.");
        }
        
        const dbQ = await fetchQuestion(moduleParam, qIdNum);
        setRawDbQuestion(dbQ);
        
        // Map to frontend structure
        const mapped = apiToFrontend(moduleParam, dbQ);
        setQuestion(mapped);
      } catch (err: any) {
        console.error("Error loading question details:", err);
        setError(err.message || "Failed to load the question details. Please make sure the question exists.");
      } finally {
        setLoading(false);
      }
    };

    loadQuestionData();
  }, [questionId, moduleParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Question Details...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-brand-dark-primary rounded-3xl border border-red-500/20 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Details</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">{error || "Something went wrong."}</p>
        <button
          onClick={() => router.push(moduleParam ? `/admin/questions?module=${moduleParam}` : "/admin/questions")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green text-white text-sm font-semibold hover:bg-brand-green/90 transition-all"
        >
          <ArrowLeft size={16} />
          <span>Back to Questions</span>
        </button>
      </div>
    );
  }

  const difficulty = (question as any).difficulty || "medium";
  const status = (question as any).status || "active";
  const marks = (question as any).marks ?? 1;
  const negativeMarks = (question as any).negativeMarks ?? 0;
  const explanation = (question as any).explanation;
  const imageUrl = (question as any).imageUrl;

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => router.push(moduleParam ? `/admin/questions?module=${moduleParam}` : "/admin/questions")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Questions</span>
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20 uppercase tracking-wider">
            {ASSESSMENT_TYPE_LABELS[moduleParam] || moduleParam}
          </span>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider ${
            status === "active" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Question Content & Structure */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Question Text Card */}
          <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-brand-green" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Question Text</span>
            
            {/* Display passage/audio instructions if communication */}
            {moduleParam === "communication" && (question as any).instructions && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-green block mb-1">Instructions</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {(question as any).instructions}
                </p>
              </div>
            )}

            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
              {(question as any).text || (question as any).instructions || "No question text provided."}
            </h2>

            {imageUrl && (
              <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-96">
                <img 
                  src={imageUrl} 
                  alt="Question Attachment" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Module-Specific Content Area */}
          {moduleParam === "communication" && (
            <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                <Volume2 className="text-brand-green" size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Communication Details</h3>
              </div>

              {/* Passage for Reading task */}
              {(question as any).passage && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Reading Passage</span>
                  <div className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-medium">
                    {(question as any).passage}
                  </div>
                </div>
              )}

              {/* Audio URL */}
              {(question as any).audioUrl && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Audio Clip</span>
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-3">
                    <span className="text-xs text-slate-500 font-semibold truncate">{(question as any).audioUrl}</span>
                    <audio controls className="w-full">
                      <source src={(question as any).audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              )}

              {/* Speaking task prompt / times */}
              {(question as any).taskType === "speaking" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                    <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl"><Clock size={20} /></div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Preparation Time</span>
                      <strong className="text-slate-900 dark:text-white">{(question as any).prepTimeSeconds ?? 30} seconds</strong>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                    <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl"><Mic size={20} /></div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Recording Duration</span>
                      <strong className="text-slate-900 dark:text-white">{(question as any).recordTimeSeconds ?? 90} seconds</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Writing task prompt / word limits */}
              {(question as any).taskType === "writing" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                    <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl"><FileText size={20} /></div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Minimum Words</span>
                      <strong className="text-slate-900 dark:text-white">{(question as any).minWords ?? 50} words</strong>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                    <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl"><FileText size={20} /></div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Maximum Words</span>
                      <strong className="text-slate-900 dark:text-white">{(question as any).maxWords ?? 200} words</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Subquestions listing if present */}
              {Array.isArray((question as any).questions) && (question as any).questions.length > 0 && (
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Subquestions ({(question as any).questions.length})</span>
                  
                  <div className="space-y-4">
                    {(question as any).questions.map((subQ: any, subIdx: number) => (
                      <div key={subQ.id || subIdx} className="p-6 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex gap-2">
                          <span className="font-extrabold text-brand-green">{subIdx + 1}.</span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{subQ.text}</h4>
                        </div>

                        {/* Options for subquestion */}
                        {Array.isArray(subQ.options) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-5">
                            {subQ.options.map((opt: any) => {
                              const isCorrect = opt.id === subQ.correctOptionId;
                              return (
                                <div 
                                  key={opt.id} 
                                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold ${
                                    isCorrect 
                                      ? "bg-brand-green/10 border-brand-green text-brand-green" 
                                      : "bg-white dark:bg-transparent border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  {isCorrect && <Check size={14} className="stroke-[3]" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Options Display for standard MCQs/MSQs/TFs */}
          {Array.isArray((question as any).options) && (question as any).options.length > 0 && (
            <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <List className="text-brand-green" size={20} />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Options & Choices</h3>
                </div>
                
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {QUESTION_KIND_LABELS[(question.kind || "mcq") as QuestionKind] || "Single Choice (MCQ)"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-2">
                {(question as any).options.map((opt: any, idx: number) => {
                  // Determine correctness based on kind — normalise to string for safe comparison
                  const optId = String(opt.id);
                  const isCorrect = question.kind === "msq"
                    ? (question.correctOptionIds ?? []).map(String).includes(optId)
                    : optId === String((question as any).correctOptionId);

                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between p-4.5 rounded-2xl border transition-all ${
                        isCorrect
                          ? "bg-brand-green/5 dark:bg-brand-green/[0.03] border-brand-green text-brand-green"
                          : "bg-slate-50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isCorrect 
                            ? "bg-brand-green text-white" 
                            : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400"
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-semibold text-sm">{opt.text}</span>
                      </div>
                      
                      {isCorrect && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-white">
                          <Check size={14} className="stroke-[3]" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Numerical answer if numerical kind */}
          {question.kind === "numerical" && (
            <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
                <HelpCircle className="text-brand-green" size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Numerical Correct Answer</h3>
              </div>
              
              <div className="p-6 bg-brand-green/5 dark:bg-brand-green/[0.02] border border-dashed border-brand-green/30 rounded-2xl text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-1">Correct Answer</span>
                <span className="text-3xl font-black text-brand-green tracking-tight">
                  {question.correctAnswer || (question as any).correctOptionId || "-"}
                </span>
              </div>
            </div>
          )}

          {/* Explanation Area */}
          <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
              <Award className="text-brand-green" size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Solution & Explanation</h3>
            </div>
            
            {explanation ? (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {explanation}
              </p>
            ) : (
              <div className="flex flex-col items-center py-6 text-center text-slate-400 dark:text-slate-500">
                <AlertCircle size={24} className="mb-2 opacity-40" />
                <span className="text-xs font-semibold">No explanation provided for this question.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Meta details, properties */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
              Properties
            </h3>

            {/* Assessment module label */}
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Assessment Stream</span>
              <div className="flex items-center gap-2.5">
                <Briefcase size={16} className="text-brand-green" />
                <span className="font-bold text-slate-800 dark:text-white text-sm">
                  {ASSESSMENT_TYPE_LABELS[moduleParam] || moduleParam}
                </span>
              </div>
            </div>

            {/* Category / Topic */}
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Category / Section</span>
              <div className="flex items-center gap-2.5">
                <Tag size={16} className="text-brand-green" />
                <span className="font-bold text-slate-800 dark:text-white text-sm capitalize">
                  {(() => {
                    const raw = (question as any).category || (question as any).topic || (question as any).taskType || (question as any).questionType || "General";
                    return APTITUDE_CATEGORY_LABELS[raw] || raw;
                  })()}
                </span>
              </div>
            </div>

            {/* Subcategory */}
            {((question as any).subcategory || (question as any).subCategory) && (
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Subcategory</span>
                <div className="flex items-center gap-2.5">
                  <Layers size={16} className="text-brand-green" />
                  <span className="font-bold text-slate-800 dark:text-white text-sm capitalize">
                    {(question as any).subcategory || (question as any).subCategory}
                  </span>
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Difficulty</span>
              <div className="flex items-center">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  difficulty.toLowerCase() === 'easy' ? 'bg-[#1ED36A]/10 text-[#1ED36A]' :
                  difficulty.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
              </div>
            </div>

            {/* Marks & Negative Marks */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Weightage Marks</span>
                <strong className="text-slate-900 dark:text-white text-lg font-black">+{marks}</strong>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Negative Penalty</span>
                <strong className="text-red-500 text-lg font-black">-{negativeMarks}</strong>
              </div>
            </div>
          </div>

          {/* Role-Based Scenario Context Metadata */}
          {moduleParam === "role" && (question as any).questionType === "scenario" && (
            <div className="bg-white dark:bg-brand-dark-primary rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                Scenario Meta
              </h3>
              
              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Scenario Title:</span>
                  <span className="text-slate-950 dark:text-white font-bold text-right truncate max-w-[150px]">
                    {(question as any).title || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Incident Ticket ID:</span>
                  <span className="text-slate-950 dark:text-white font-mono bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                    {(question as any).ticketId || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Severity Priority:</span>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    (question as any).priority === 'Critical' || (question as any).priority === 'High' 
                      ? 'bg-red-500/10 text-red-500' 
                      : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {(question as any).priority || "Medium"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Reported By:</span>
                  <span className="text-slate-950 dark:text-white truncate max-w-[150px]">
                    {(question as any).reportedBy || "System Admin"}
                  </span>
                </div>
              </div>

              {/* Scenario Context */}
              {(question as any).scenarioContext && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Scenario Context</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                    {(question as any).scenarioContext}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Database Info Card */}
          {rawDbQuestion && (
            <div className="bg-slate-50/50 dark:bg-white/[0.01] rounded-3xl p-8 border border-slate-200/50 dark:border-white/5 shadow-sm space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block border-b border-slate-100 dark:border-white/5 pb-2">Record Audit</span>
              
              <div className="space-y-2 text-[11px] font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Database Row ID:</span>
                  <span className="text-slate-950 dark:text-white font-mono">{rawDbQuestion.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assessment Link ID:</span>
                  <span className="text-slate-950 dark:text-white font-mono">{rawDbQuestion.assessmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Record Created:</span>
                  <span className="text-slate-950 dark:text-white font-mono">
                    {new Date(rawDbQuestion.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Record Updated:</span>
                  <span className="text-slate-950 dark:text-white font-mono">
                    {new Date(rawDbQuestion.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestionDetailsPage() {
  return (
    <AdminGuard>
      <QuestionDetailsContent />
    </AdminGuard>
  );
}
