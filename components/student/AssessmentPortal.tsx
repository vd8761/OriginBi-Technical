"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import ExamCarousel, { Exam } from "./ExamCarousel";
import ExamDetailModal from "./ExamDetailModal";
import AptitudePreTest from "../assessment/aptitude/AptitudePreTest";
import CommunicationPreTest from "../assessment/communication/CommunicationPreTest";
import RolePreTest from "../assessment/role/RolePreTest";
import { ProfileIcon, AptitudeIcon, CommunicationIcon, CodingIcon, MNCIcon, RoleIcon } from "../icons";

type AssessmentView = "dashboard" | "assessment" | "profile" | "details";
type AssessmentId = "aptitude" | "communication" | "coding" | "mnc" | "role";
type AssessmentFilter = "all" | "ready" | "core" | "technical" | "career";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  features: string[];
  badge?: string;
  popular?: boolean;
}

interface ExtendedExam extends Exam {
  track: Exclude<AssessmentFilter, "all" | "ready">;
}

interface ExamDetailData {
  focus: string;
  skills: { title: string; description: string }[];
  sections: { name: string; detail: string; weight: string }[];
  outcomes: string[];
  requirements: string[];
  pricingTiers: PricingTier[];
}

const EXAMS: ExtendedExam[] = [
  {
    id: "aptitude",
    title: "Aptitude Assessment",
    shortTitle: "Aptitude",
    description: "Evaluate numerical agility, logical structure, data interpretation, and pattern recognition under timed conditions.",
    duration: "60 min",
    questions: 60,
    difficulty: "Intermediate",
    price: 99,
    tags: ["Quantitative", "Logical", "Data", "Abstract"],
    icon: <AptitudeIcon className="w-7 h-7" />,
    available: true,
    statusLabel: "Ready",
    accentColor: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    track: "core",
  },
  {
    id: "communication",
    title: "Communication Assessment",
    shortTitle: "Communication",
    description: "Measure listening, speaking, reading, and writing performance through workplace-style tasks.",
    duration: "30 min",
    questions: 40,
    difficulty: "Beginner",
    price: 149,
    tags: ["Listening", "Speaking", "Reading", "Writing"],
    icon: <CommunicationIcon className="w-7 h-7" />,
    available: true,
    statusLabel: "Ready",
    accentColor: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    track: "core",
  },
  {
    id: "coding",
    title: "Coding Assessment",
    shortTitle: "Coding",
    description: "Validate programming fundamentals with number logic, strings, arrays, and simulation-driven exercises.",
    duration: "90 min",
    questions: 30,
    difficulty: "Intermediate",
    price: 199,
    originalPrice: 299,
    discount: 33,
    tags: ["Logic", "Strings", "Arrays", "Simulation"],
    icon: <CodingIcon className="w-7 h-7" />,
    available: false,
    statusLabel: "Coming Soon",
    accentColor: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    track: "technical",
  },
  {
    id: "mnc",
    title: "MNC Based Questions",
    shortTitle: "MNC Prep",
    description: "Practice high-frequency interview patterns across arrays, trees, dynamic programming, graphs, and systems thinking.",
    duration: "60 min",
    questions: 25,
    difficulty: "Advanced",
    price: 249,
    originalPrice: 399,
    discount: 38,
    tags: ["Arrays", "Trees", "DP", "Graphs"],
    icon: <MNCIcon className="w-7 h-7" />,
    available: false,
    statusLabel: "Coming Soon",
    accentColor: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    track: "technical",
  },
  {
    id: "role",
    title: "Role Based Questions",
    shortTitle: "Role Based",
    description: "Assess role-fit through conceptual MCQs and scenario decisions designed around practical job responsibilities.",
    duration: "45 min",
    questions: 20,
    difficulty: "Intermediate",
    price: 299,
    tags: ["Concepts", "Scenarios", "Judgement", "Role fit"],
    icon: <RoleIcon className="w-7 h-7" />,
    available: true,
    statusLabel: "Ready",
    accentColor: "#84cc16",
    gradient: "linear-gradient(135deg, #84cc16 0%, #65a30d 100%)",
    track: "career",
  },
];

const EXAM_DETAILS: Record<AssessmentId, ExamDetailData> = {
  aptitude: {
    focus: "A balanced cognitive benchmark for early career candidates and campus hiring preparation.",
    skills: [
      { title: "Numerical accuracy", description: "Speed and correctness across arithmetic, ratios, percentages, and business math." },
      { title: "Structured reasoning", description: "Ability to decode patterns, relationships, and constraints without guesswork." },
      { title: "Data interpretation", description: "Reading tables, charts, and comparisons with clear analytical judgement." },
      { title: "Abstract logic", description: "Visual and non-verbal reasoning for unfamiliar problem formats." },
    ],
    sections: [
      { name: "Quantitative Aptitude", detail: "Percentages, profit and loss, time and work, averages, mixtures, and SI/CI.", weight: "30%" },
      { name: "Logical Reasoning", detail: "Series, seating, blood relations, syllogisms, directions, and coding-decoding.", weight: "30%" },
      { name: "Data Interpretation", detail: "Bar charts, line graphs, pie charts, tables, and comparison sets.", weight: "25%" },
      { name: "Abstract Reasoning", detail: "Matrix figures, visual series, odd-one-out, and spatial patterns.", weight: "15%" },
    ],
    outcomes: ["Accuracy heatmap by section", "Time-per-question distribution", "Strength and gap summary", "Recommended practice plan"],
    requirements: ["Stable internet connection", "Quiet workspace", "Desktop or laptop preferred", "One uninterrupted 60 minute session"],
    pricingTiers: [
      {
        id: "basic",
        name: "Basic",
        price: 99,
        features: ["Full exam access", "Basic score report", "Section-wise breakdown"],
        badge: "Starter",
      },
      {
        id: "standard",
        name: "Standard",
        price: 149,
        originalPrice: 199,
        discount: 25,
        features: ["Full exam access", "Detailed analytics", "Skill gap analysis", "Practice recommendations"],
        popular: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 249,
        originalPrice: 349,
        discount: 29,
        features: ["Everything in Standard", "1-on-1 expert review", "Personalized study plan", "Mock interview session"],
      },
    ],
  },
  communication: {
    focus: "A practical language benchmark for interviews, client calls, workplace writing, and professional collaboration.",
    skills: [
      { title: "Listening comprehension", description: "Extracting intent, facts, and tone from short business audio prompts." },
      { title: "Speaking clarity", description: "Pronunciation, pacing, structure, and confidence during recorded responses." },
      { title: "Reading judgement", description: "Understanding passages, inferences, summaries, and professional context." },
      { title: "Writing quality", description: "Grammar, organization, tone, and concise workplace expression." },
    ],
    sections: [
      { name: "Listening", detail: "Audio prompts followed by comprehension and inference questions.", weight: "25%" },
      { name: "Speaking", detail: "Recorded responses for introductions, opinions, and scenario explanations.", weight: "25%" },
      { name: "Reading", detail: "Passage-based questions built around workplace communication.", weight: "25%" },
      { name: "Writing", detail: "Short-form professional writing prompts and structured responses.", weight: "25%" },
    ],
    outcomes: ["Fluency and clarity score", "Comprehension profile", "Writing improvement notes", "Interview communication guidance"],
    requirements: ["Working microphone", "Audio playback enabled", "Quiet environment", "Browser permission for recording"],
    pricingTiers: [
      {
        id: "basic",
        name: "Basic",
        price: 149,
        features: ["Full exam access", "Basic score report", "Section-wise breakdown"],
        badge: "Starter",
      },
      {
        id: "standard",
        name: "Standard",
        price: 199,
        originalPrice: 249,
        discount: 20,
        features: ["Full exam access", "Detailed analytics", "Fluency metrics", "Improvement tips"],
        popular: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 299,
        originalPrice: 399,
        discount: 25,
        features: ["Everything in Standard", "Speaking coach review", "Personalized exercises", "Video feedback session"],
      },
    ],
  },
  coding: {
    focus: "A fundamentals-first programming screen for candidates building confidence before harder technical interviews.",
    skills: [
      { title: "Problem decomposition", description: "Breaking a prompt into inputs, constraints, logic, and edge cases." },
      { title: "Core syntax thinking", description: "Using loops, conditionals, functions, and collections with control." },
      { title: "Debugging judgement", description: "Spotting off-by-one mistakes, invalid states, and missed cases." },
      { title: "Simulation logic", description: "Translating small real-world flows into reliable code steps." },
    ],
    sections: [
      { name: "Number Logic", detail: "Parity, digit operations, ranges, divisibility, and mathematical sequences.", weight: "25%" },
      { name: "Strings", detail: "Search, transform, compare, validate, and count text patterns.", weight: "25%" },
      { name: "Arrays", detail: "Traversal, frequency, pair logic, sorting basics, and window-style thinking.", weight: "30%" },
      { name: "Simulation", detail: "State updates, rule-based flows, and scenario implementation.", weight: "20%" },
    ],
    outcomes: ["Topic readiness profile", "Edge-case awareness", "Debugging focus areas", "Next technical practice path"],
    requirements: ["Desktop or laptop", "Code editor area inside the test", "Stable internet connection", "90 minute focus window"],
    pricingTiers: [
      {
        id: "basic",
        name: "Basic",
        price: 199,
        originalPrice: 249,
        discount: 20,
        features: ["Full exam access", "Basic score report", "Test cases passed"],
        badge: "Early Access",
      },
      {
        id: "standard",
        name: "Standard",
        price: 249,
        originalPrice: 349,
        discount: 29,
        features: ["Full exam access", "Time complexity analysis", "Code quality score", "Solution explanations"],
        popular: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 349,
        originalPrice: 499,
        discount: 30,
        features: ["Everything in Standard", "Mentor code review", "Algorithm suggestions", "Practice problem set"],
      },
    ],
  },
  mnc: {
    focus: "A sharper interview-practice track for candidates targeting larger product, service, and consulting companies.",
    skills: [
      { title: "Pattern recognition", description: "Identifying when to use two pointers, hashing, trees, graphs, or DP." },
      { title: "Complexity thinking", description: "Reasoning about time and space before choosing an approach." },
      { title: "DSA fluency", description: "Applying data structures to common interview problem families." },
      { title: "Round strategy", description: "Prioritizing correctness, explanation, and tradeoffs under interview pressure." },
    ],
    sections: [
      { name: "Arrays and Hashing", detail: "Frequency maps, pairs, subarrays, sorting, and search patterns.", weight: "30%" },
      { name: "Trees and Graphs", detail: "Traversal, shortest paths, connected components, and hierarchy questions.", weight: "25%" },
      { name: "Dynamic Programming", detail: "State definition, recurrence, memoization, and tabulation basics.", weight: "25%" },
      { name: "Mixed Interview Set", detail: "Company-style combinations of logic, DSA, and constraints.", weight: "20%" },
    ],
    outcomes: ["Interview topic map", "Problem family gaps", "Complexity reasoning notes", "Company-round practice priorities"],
    requirements: ["DSA fundamentals", "Desktop or laptop", "Stable internet connection", "One uninterrupted 60 minute session"],
    pricingTiers: [
      {
        id: "basic",
        name: "Basic",
        price: 249,
        originalPrice: 349,
        discount: 29,
        features: ["Full exam access", "Basic score report", "Difficulty rating"],
        badge: "Early Access",
      },
      {
        id: "standard",
        name: "Standard",
        price: 299,
        originalPrice: 449,
        discount: 33,
        features: ["Full exam access", "Company-wise trends", "Time analysis", "Weak area identification"],
        popular: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 399,
        originalPrice: 599,
        discount: 33,
        features: ["Everything in Standard", "Mock interview", "Company-specific tips", "Study roadmap"],
      },
    ],
  },
  role: {
    focus: "A role-fit diagnostic that tests conceptual knowledge and decision-making in realistic work situations.",
    skills: [
      { title: "Domain concepts", description: "Understanding of core terminology, workflows, and role-specific fundamentals." },
      { title: "Scenario judgement", description: "Choosing practical actions when requirements, constraints, or people conflict." },
      { title: "Professional reasoning", description: "Explaining tradeoffs and recognizing business impact." },
      { title: "Role alignment", description: "Matching your thinking patterns against expectations for the target path." },
    ],
    sections: [
      { name: "Conceptual MCQs", detail: "Role-specific fundamentals, tools, principles, and common workflows.", weight: "45%" },
      { name: "Scenario Decisions", detail: "Realistic workplace cases with best-action selection.", weight: "35%" },
      { name: "Priority Calls", detail: "Questions that test judgement under constraints.", weight: "10%" },
      { name: "Reflection Prompts", detail: "Short responses that reveal communication and reasoning style.", weight: "10%" },
    ],
    outcomes: ["Role-fit summary", "Concept confidence map", "Scenario judgement notes", "Career path recommendations"],
    requirements: ["Choose your target role before starting", "Quiet workspace", "Stable internet connection", "30 minute focus window"],
    pricingTiers: [
      {
        id: "basic",
        name: "Basic",
        price: 299,
        features: ["Full exam access", "Basic role-fit report", "Top 3 role matches"],
        badge: "Starter",
      },
      {
        id: "standard",
        name: "Standard",
        price: 349,
        originalPrice: 449,
        discount: 22,
        features: ["Full exam access", "Detailed role analysis", "Skill-to-role mapping", "Career suggestions"],
        popular: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 499,
        originalPrice: 699,
        discount: 29,
        features: ["Everything in Standard", "Career coach session", "Personalized roadmap", "Industry insights"],
      },
    ],
  },
};

const FILTERS: { label: string; value: AssessmentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ready now", value: "ready" },
  { label: "Core skills", value: "core" },
  { label: "Tech hiring", value: "technical" },
  { label: "Career fit", value: "career" },
];

const AssessmentPortal: React.FC = () => {
  const [showAptitudeModal, setShowAptitudeModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentView, setCurrentView] = useState<AssessmentView>("dashboard");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<AssessmentFilter>("all");
  const router = useRouter();

  const readyExams = useMemo(() => EXAMS.filter((exam) => exam.available), []);

  const filteredExams = useMemo(() => {
    if (filter === "ready") {
      return EXAMS.filter((exam) => exam.available);
    }
    if (filter === "all") {
      return EXAMS;
    }
    return EXAMS.filter((exam) => (exam as ExtendedExam).track === filter);
  }, [filter]);

  const totalQuestions = useMemo(() => EXAMS.reduce((sum, exam) => sum + exam.questions, 0), []);

  const handleSelectExam = (exam: Exam) => {
    setSelectedExam(exam);
    setShowDetailModal(true);
  };

  const handleStartExam = (exam: Exam, tier?: PricingTier) => {
    if (!exam.available) {
      setSelectedExam(exam);
      setShowDetailModal(true);
      return;
    }

    // If a tier was selected, we could handle payment here
    if (tier) {
      console.log(`Processing payment for ${exam.title} - ${tier.name} tier: ₹${tier.price}`);
    }

    // Show appropriate pre-test modal
    if (exam.id === "aptitude") {
      setShowAptitudeModal(true);
    } else if (exam.id === "communication") {
      setShowCommunicationModal(true);
    } else if (exam.id === "role") {
      setShowRoleModal(true);
    }
  };

  const currentHeaderView: AssessmentView = currentView === "details" ? "assessment" : currentView;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-white dark:from-[#0f1712] dark:to-[#161f1a] font-sans transition-colors duration-500">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <Header
        currentView={currentHeaderView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={() => console.log("Logging out...")}
      />

      <main className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-8 px-4 pb-8 pt-24 sm:px-6 lg:px-10">
        {currentView === "dashboard" || currentView === "assessment" ? (
          <>
            {/* Hero Section - Ultra Premium Design */}
            <section className="relative overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_60px_rgba(30,211,106,0.05)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 sm:p-12 lg:p-16 group transition-all duration-700 hover:shadow-[0_30px_80px_rgba(30,211,106,0.08)]">
              {/* Dynamic Animated Orbs */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 animate-float-slow opacity-80 group-hover:opacity-100 transition-opacity duration-700 mix-blend-multiply dark:mix-blend-screen" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-brand-green/10 to-teal-400/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4 animate-float-slower opacity-60 group-hover:opacity-90 transition-opacity duration-700 mix-blend-multiply dark:mix-blend-screen" />
              
              <div className="relative z-10 grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 mb-8 backdrop-blur-md shadow-sm transform transition-all duration-300 hover:scale-105 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 cursor-default">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide">
                      {readyExams.length} Premium Exams Live
                    </span>
                  </div>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-white tracking-tight leading-[1.1] mb-6">
                    Elevate your career with
                    <span className="block mt-2 bg-gradient-to-r from-emerald-500 via-brand-green to-cyan-500 bg-clip-text text-transparent pb-2 animate-pulse" style={{ animationDuration: '4s' }}>
                      precision insights.
                    </span>
                  </h1>
                  
                  <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl font-light leading-relaxed mb-8">
                    Step into the future of hiring. AI-driven assessments that don't just test you—they <strong className="font-semibold text-slate-800 dark:text-slate-200">reveal your true potential</strong> and guide your growth.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xl shadow-slate-900/20 dark:shadow-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      Explore Library
                    </button>
                    <button className="px-8 py-4 rounded-2xl bg-white dark:bg-white/5 text-slate-700 dark:text-white font-semibold border border-slate-200 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Watch Demo
                    </button>
                  </div>
                </div>

                {/* Glassmorphic Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <div className="group relative p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden col-span-2 sm:col-span-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <div className="p-3 bg-white dark:bg-white/10 rounded-2xl shadow-sm mb-4 text-brand-green">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{EXAMS.length}</p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Curated Exams</p>
                    </div>
                  </div>
                  
                  <div className="group relative p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden col-span-2 sm:col-span-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <div className="p-3 bg-white dark:bg-white/10 rounded-2xl shadow-sm mb-4 text-cyan-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{readyExams.length}</p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Available Now</p>
                    </div>
                  </div>
                  
                  <div className="group relative p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden col-span-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col sm:flex-row items-center sm:justify-between gap-4 text-center sm:text-left">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-white/10 rounded-2xl shadow-sm text-purple-500">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{totalQuestions}+</p>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Unique Questions</p>
                        </div>
                      </div>
                      <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-[#111a15] bg-slate-200 dark:bg-slate-700 shadow-sm" style={{ backgroundImage: `url('https://i.pravatar.cc/100?img=${i}')`, backgroundSize: 'cover' }} />
                        ))}
                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-[#111a15] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm z-10">
                          +2k
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter Tabs */}
            <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Browse Categories</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Find the perfect assessment for your goals</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white/60 dark:bg-[#1a231e]/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm">
                {FILTERS.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={`
                        relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden
                        ${isActive 
                          ? "text-white shadow-md" 
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"
                        }
                      `}
                    >
                      {isActive && (
                        <span className="absolute inset-0 bg-slate-800 dark:bg-white rounded-xl -z-10 animate-fade-in-scale" />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Exam Carousel */}
            <section>
              <ExamCarousel
                exams={filteredExams}
                onSelectExam={handleSelectExam}
                onStartExam={handleStartExam}
              />
            </section>

            {/* Trust Badges - Enhanced */}
            <section className="py-10 border-t border-slate-200/60 dark:border-white/10 mt-4 animate-slide-up" style={{ animationDelay: '500ms' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Bank-Grade Security", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Instant Analytics", color: "text-cyan-500", bg: "bg-cyan-500/10" },
                  { icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", label: "Industry Certified", color: "text-purple-500", bg: "bg-purple-500/10" },
                  { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", label: "Unlimited Retakes", color: "text-amber-500", bg: "bg-amber-500/10" }
                ].map((badge, i) => (
                  <div key={i} className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-center">
                    <div className={`p-4 rounded-2xl ${badge.bg} ${badge.color} mb-4 transform group-hover:scale-110 transition-transform duration-300`}>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={badge.icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{badge.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center rounded-3xl bg-white/80 dark:bg-[#111a15]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
              <ProfileIcon className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-medium text-slate-800 dark:text-white">Profile & Settings</h2>
            <p className="mt-3 max-w-md text-slate-500 dark:text-slate-400 leading-relaxed">
              Your profile area is being prepared. You can continue exploring assessments and start any available test from the library.
            </p>
            <button
              type="button"
              onClick={() => setCurrentView("assessment")}
              className="mt-6 px-6 py-3 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-sm font-medium transition-all hover:opacity-90"
            >
              View assessments
            </button>
          </section>
        )}

        <footer className="py-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Origin BI | Powered by Beyond Intelligence
          </p>
        </footer>
      </main>

      {/* Modals */}
      <ExamDetailModal
        exam={selectedExam}
        detail={selectedExam ? EXAM_DETAILS[selectedExam.id as AssessmentId] : null}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onStart={(exam, tier) => {
          setShowDetailModal(false);
          handleStartExam(exam, tier);
        }}
      />

      {showAptitudeModal && (
        <AptitudePreTest
          onStart={() => router.push("/assessment/aptitude")}
          onClose={() => setShowAptitudeModal(false)}
        />
      )}

      {showCommunicationModal && (
        <CommunicationPreTest
          onStart={() => router.push("/assessment/communication")}
          onClose={() => setShowCommunicationModal(false)}
        />
      )}

      {showRoleModal && (
        <RolePreTest
          onStart={() => router.push("/assessment/role")}
          onClose={() => setShowRoleModal(false)}
        />
      )}
    </div>
  );
};

export default AssessmentPortal;
