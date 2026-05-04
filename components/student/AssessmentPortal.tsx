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
import AssessmentCard from "./AssessmentCard";

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
    accentColor: "#1ed36a",
    gradient: "linear-gradient(135deg, #1ed36a 0%, #19b35a 100%)",
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
    accentColor: "#1ed36a",
    gradient: "linear-gradient(135deg, #1ed36a 0%, #17a050 100%)",
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
    accentColor: "#1ed36a",
    gradient: "linear-gradient(135deg, #1ed36a 0%, #148a3c 100%)",
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
    accentColor: "#1ed36a",
    gradient: "linear-gradient(135deg, #1ed36a 0%, #0f7a32 100%)",
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
    accentColor: "#1ed36a",
    gradient: "linear-gradient(135deg, #1ed36a 0%, #16a348 100%)",
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
  { label: "Ready", value: "ready" },
  { label: "Core Skills", value: "core" },
  { label: "Technical", value: "technical" },
  { label: "Career", value: "career" },
];

const TRACK_PALETTE = {
  core: "#1ed36a",
  technical: "#17a050",
  career: "#148a3c",
} as const;

const AssessmentPortal: React.FC = () => {
  const [showAptitudeModal, setShowAptitudeModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentView, setCurrentView] = useState<AssessmentView>("dashboard");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<AssessmentFilter>("all");
  const [showNextStepAlert, setShowNextStepAlert] = useState(true); // Default true to simulate completion of Aptitude
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
  const totalDuration = useMemo(
    () => EXAMS.reduce((sum, exam) => sum + (parseInt(exam.duration, 10) || 0), 0),
    [],
  );

  const readinessScore = useMemo(() => {
    if (!EXAMS.length) {
      return 0;
    }
    return Math.round((readyExams.length / EXAMS.length) * 100);
  }, [readyExams.length]);

  const avgDuration = useMemo(
    () => Math.round(totalDuration / Math.max(EXAMS.length, 1)),
    [totalDuration],
  );

  const avgPrice = useMemo(
    () => Math.round(EXAMS.reduce((sum, exam) => sum + exam.price, 0) / Math.max(EXAMS.length, 1)),
    [],
  );

  const maxPrice = useMemo(
    () => EXAMS.reduce((max, exam) => Math.max(max, exam.price), 0),
    [],
  );

  const largestExam = useMemo(
    () => EXAMS.reduce((prev, exam) => (exam.questions > prev.questions ? exam : prev), EXAMS[0]),
    [],
  );

  const trackCounts = useMemo(() => {
    const counts: Record<Exclude<AssessmentFilter, "all" | "ready">, number> = {
      core: 0,
      technical: 0,
      career: 0,
    };

    EXAMS.forEach((exam) => {
      const track = (exam as ExtendedExam).track;
      if (track) {
        counts[track] += 1;
      }
    });

    return counts;
  }, []);

  const spotlightExam = (readyExams[0] ?? EXAMS[0]) as Exam;

  const trackLanes = [
    {
      id: "core",
      label: "Aptitude+ Core",
      description: "Quantitative, Logical, Data Interpretation, and Visual Reasoning.",
      count: 1, // Visual adjustment for demo
      accent: TRACK_PALETTE.core,
    },
    {
      id: "communication",
      label: "Business Linguistics",
      description: "Corporate Etiquette, Grammar, Syntax, and Reading Comprehension.",
      count: 1,
      accent: TRACK_PALETTE.technical,
    },
    {
      id: "technical",
      label: "Technical Groupings",
      description: "Programming Foundations, Web Tech, Backend, Database & Cloud.",
      count: 2,
      accent: TRACK_PALETTE.career,
    },
    {
      id: "career",
      label: "Role-Based Specialization",
      description: "Full Stack Developer, Data Scientist, UI/UX Architect, DevOps.",
      count: 4,
      accent: "#2563eb",
    },
  ];

  const queueExams = readyExams.slice(0, 3);

  const momentumTrend = [36, 48, 42, 58, 66, 72, 68];

  // Career Identity - Professional persona
  const careerIdentity = {
    archetype: "Full Stack Developer",
    level: "Technical Grouping: Pending",
    xp: 850,
    xpToNext: 2000,
    badges: ["Aptitude Clear", "Logic Elite"],
    quote: "Strong performance in High-End Data Interpretation suggests backend architecture potential.",
  };

  // Skill Constellation - Interactive skill visualization
  const skillGalaxy = [
    { name: "Quantitative", level: 92, connections: ["Logic", "Data"], x: 20, y: 30 },
    { name: "Logic & Analytical", level: 88, connections: ["Quantitative"], x: 45, y: 20 },
    { name: "Data Interpretation", level: 85, connections: ["Data", "Visualization"], x: 25, y: 55 },
    { name: "Visual Reasoning", level: 75, connections: ["Web Tech"], x: 50, y: 60 },
    { name: "Web Tech", level: 60, connections: ["Architecture"], x: 75, y: 55 },
    { name: "Backend Systems", level: 45, connections: ["Logic"], x: 70, y: 25 },
    { name: "Database & Cloud", level: 40, connections: ["Backend Systems"], x: 85, y: 40 },
  ];

  // Energy Zones - Focus distribution across categories
  const momentumZones = [
    { name: "Deep Focus", value: 78, color: "#1ed36a", status: "Active" },
    { name: "Quick Wins", value: 65, color: "#17a050", status: "Steady" },
    { name: "Learning", value: 92, color: "#148a3c", status: "Surging" },
    { name: "Review", value: 45, color: "#19b35a", status: "Building" },
  ];

  // Daily Rituals - Micro-habits
  const dailyRituals = [
    { id: 1, name: "Morning Calibration", duration: "5 min", streak: 12, completed: true, type: "warmup" },
    { id: 2, name: "Deep Dive Session", duration: "25 min", streak: 7, completed: true, type: "focus" },
    { id: 3, name: "Skill Sprint", duration: "10 min", streak: 5, completed: false, type: "practice" },
    { id: 4, name: "Reflection & Log", duration: "5 min", streak: 9, completed: false, type: "review" },
  ];

  // Wisdom Cards - AI-generated insights
  const wisdomCards = [
    { 
      type: "insight", 
      title: "Pattern Recognition", 
      content: "You solve logical reasoning problems 23% faster than last month. This suggests strong neural pathway formation.",
      icon: "🧠",
      color: "#8b5cf6"
    },
    { 
      type: "opportunity", 
      title: "Hidden Connection", 
      content: "Your data interpretation skills directly correlate with system design potential. Consider the Architecture track.",
      icon: "✨",
      color: "#f59e0b"
    },
    { 
      type: "milestone", 
      title: "Velocity Surge", 
      content: "You've maintained 7 consecutive days of progress. Your consistency score is now in the top 15%.",
      icon: "🚀",
      color: "#10b981"
    },
  ];

  // Career Timeline - Professional journey phases
  const careerTimeline = [
    { phase: "Aptitude+", status: "completed", date: "Just now", achievement: "Quantitative & Logic Clear" },
    { phase: "Communication", status: "active", date: "Next Step", achievement: "Linguistics & Articulation" },
    { phase: "Technical Grouping", status: "locked", date: "Pending", achievement: "Programming Foundations" },
    { phase: "Role-Based", status: "locked", date: "Future", achievement: "Software Engineering Fitment" },
  ];

  const signalHighlights = [
    {
      label: "Next Mission",
      value: "Aptitude",
      detail: "Start with foundational skills",
    },
    {
      label: "Growth Potential",
      value: "High",
      detail: "Based on your skill gaps",
    },
    {
      label: "Certification",
      value: "Ready",
      detail: "Complete to earn your badge",
    },
  ];

  // Performance Intelligence Layer
  const performanceData = {
    accuracyTrend: [65, 72, 68, 75, 82, 78, 85],
    speedVsAccuracy: { speed: 72, accuracy: 85 },
    difficultyBreakdown: {
      easy: { accuracy: 92, count: 15 },
      medium: { accuracy: 78, count: 20 },
      hard: { accuracy: 65, count: 10 },
    },
    errorDistribution: {
      concept: 35,
      calculation: 25,
      misinterpretation: 40,
    },
  };

  // Skill Heatmap Data
  const skillHeatmap = [
    { category: "Aptitude", skills: [
      { name: "Percentages", level: 85 },
      { name: "Time & Work", level: 72 },
      { name: "Data Interpretation", level: 68 },
      { name: "Puzzles", level: 79 },
    ]},
    { category: "Coding", skills: [
      { name: "Strings", level: 88 },
      { name: "Arrays", level: 82 },
      { name: "Logic", level: 76 },
      { name: "Simulation", level: 70 },
    ]},
    { category: "Role-Based", skills: [
      { name: "API Design", level: 75 },
      { name: "Debugging", level: 83 },
      { name: "Optimization", level: 69 },
    ]},
  ];

  // AI Confidence & Reliability Score
  const aiConfidence = {
    score: 87,
    reliability: "High",
    consistency: 91,
    accuracyStability: 84,
    timeVariance: 12,
  };

  // Learning Recommendations
  const learningRecommendations = [
    {
      priority: "high",
      topic: "Time & Work",
      reason: "Accuracy below threshold (72%)",
      level: "Medium",
      action: "Practice 20 medium-level problems",
    },
    {
      priority: "medium",
      topic: "Optimization",
      reason: "Slow performance on complex scenarios",
      level: "Advanced",
      action: "Focus on algorithm efficiency patterns",
    },
    {
      priority: "low",
      topic: "Data Interpretation",
      reason: "Minor improvement needed",
      level: "Hard",
      action: "Attempt 10 challenging DI sets",
    },
  ];

  // Real-time Insight Bar
  const realtimeInsights = {
    questionsAttempted: 32,
    totalQuestions: 45,
    accuracy: 84,
    timeLeft: "18:45",
    currentModule: "Aptitude",
    confidenceScore: 87,
  };

  const focusSignals = [
    {
      label: "Recommended start",
      value: spotlightExam.shortTitle,
      detail: `${spotlightExam.duration} - ${spotlightExam.questions} Qs`,
    },
    {
      label: "Core lane depth",
      value: `${trackCounts.core} exams`,
      detail: "quant + logic coverage",
    },
    {
      label: "Tech lane depth",
      value: `${trackCounts.technical} exams`,
      detail: "coding + MNC focus",
    },
    {
      label: "Career lane depth",
      value: `${trackCounts.career} exams`,
      detail: "role-fit diagnostics",
    },
  ];

  const updateFeed = [
    {
      title: "Aptitude benchmark refreshed",
      detail: "New logic patterns added to reasoning set.",
      time: "2h ago",
    },
    {
      title: "Communication tasks upgraded",
      detail: "Listening cues now graded for nuance.",
      time: "Yesterday",
    },
    {
      title: "Role-fit rubric expanded",
      detail: "Scenario variants for product roles.",
      time: "2 days ago",
    },
  ];

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

    // Show appropriate pre-test modal or navigate directly
    if (exam.id === "aptitude") {
      setShowAptitudeModal(true);
    } else if (exam.id === "communication") {
      setShowCommunicationModal(true);
    } else if (exam.id === "role") {
      setShowRoleModal(true);
    } else if (exam.id === "coding") {
      router.push("/assessment/coding");
    } else if (exam.id === "mnc") {
      router.push("/assessment/mnc");
    }
  };

  const currentHeaderView: AssessmentView = currentView === "details" ? "assessment" : currentView;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-green/20 via-brand-green/5 to-transparent blur-[90px] animate-float-slow opacity-80" />
        <div className="absolute -bottom-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-brand-green/15 via-brand-green/5 to-transparent blur-[100px] animate-float-slower opacity-70" />
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] assessment-scan mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <Header
        currentView={currentHeaderView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={() => console.log("Logging out...")}
      />

      <main className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-8 px-4 pb-8 pt-24 sm:px-6 lg:px-10">
        {currentView === "dashboard" || currentView === "assessment" ? (
          <>
            {/* Command Deck */}
            {currentView === "dashboard" && (
              <section className="relative overflow-hidden rounded-[2.75rem] border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/80 backdrop-blur-2xl shadow-[0_28px_80px_rgba(25,33,28,0.08)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.5)] p-6 sm:p-10 lg:p-12">
              <div className="absolute inset-0">
                <div className="absolute -top-16 left-[-8%] h-72 w-72 rounded-full bg-gradient-to-br from-brand-green/15 to-transparent blur-[60px] animate-float-slow" />
                <div className="absolute bottom-[-25%] right-[-6%] h-80 w-80 rounded-full bg-gradient-to-tr from-brand-green/10 to-transparent blur-[70px] animate-float-slower" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.03),rgba(15,23,42,0))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              </div>

              <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
                <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
                  <div className="inline-flex items-center gap-3 rounded-full border border-brand-green/30 dark:border-brand-green/30 bg-brand-green/10 dark:bg-brand-green/15 px-5 py-2.5 text-brand-green dark:text-brand-green text-sm font-semibold tracking-wide shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60 animate-ping"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green"></span>
                    </span>
                    {readyExams.length} live assessments ready
                  </div>

                  <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-text-light-primary dark:text-brand-text-primary tracking-tight leading-[1.05]">
                    Your career compass
                    <span className="block mt-2 bg-gradient-to-r from-brand-green via-brand-green to-brand-green/70 bg-clip-text text-transparent">
                      discover, validate, and accelerate.
                    </span>
                  </h1>

                  <p className="mt-5 text-lg sm:text-xl text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed max-w-2xl">
                    Identify your strengths, bridge skill gaps, and align with industry expectations. Each assessment unlocks personalized insights for your professional journey.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <button className="px-7 py-4 rounded-2xl bg-brand-green text-white font-semibold shadow-xl shadow-brand-green/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      Explore library
                    </button>
                    <button className="px-7 py-4 rounded-2xl bg-brand-light-primary/80 dark:bg-white/5 text-brand-text-light-primary dark:text-brand-text-primary font-semibold border border-brand-light-tertiary/70 dark:border-white/10 shadow-sm hover:bg-brand-light-primary hover:-translate-y-1 transition-all duration-300">
                      Run quick scan
                    </button>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">
                    {["AI proctored", "Instant reports", "Role fit mapping"].map((item) => (
                      <span key={item} className="rounded-full border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/70 dark:bg-white/5 px-4 py-2 shadow-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 animate-slide-up" style={{ animationDelay: "160ms" }}>
                  <div className="sm:col-span-2 relative overflow-hidden rounded-3xl border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 p-6 shadow-[0_18px_50px_rgba(25,33,28,0.08)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Mission Status</p>
                        <p className="mt-2 text-3xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">
                          {readinessScore}% ready
                        </p>
                        <p className="mt-2 text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">
                          Based on live assessments and total question volume.
                        </p>
                      </div>
                      <div
                        className="relative h-24 w-24 rounded-full [--ring-track:rgba(226,232,240,0.5)] dark:[--ring-track:rgba(255,255,255,0.12)]"
                        style={{ background: `conic-gradient(#1ed36a ${readinessScore * 3.6}deg, var(--ring-track) 0deg)` }}
                      >
                        <span className="absolute inset-0 rounded-full border border-brand-green/30 animate-pulse-ring" />
                        <div className="absolute inset-2 rounded-full bg-brand-light-primary/90 dark:bg-brand-dark-primary border border-brand-light-tertiary/80 dark:border-white/10 flex items-center justify-center text-sm font-bold text-brand-text-light-primary dark:text-brand-text-primary">
                          {readinessScore}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-2xl bg-brand-light-primary/70 dark:bg-white/5 border border-brand-light-tertiary/60 dark:border-white/10 p-3">
                        <p className="text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">Exams</p>
                        <p className="text-lg font-bold text-brand-text-light-primary dark:text-brand-text-primary">{EXAMS.length}</p>
                      </div>
                      <div className="rounded-2xl bg-brand-green/5 dark:bg-brand-green/10 border border-brand-green/20 dark:border-brand-green/20 p-3">
                        <p className="text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">Live</p>
                        <p className="text-lg font-bold text-brand-green">{readyExams.length}</p>
                      </div>
                      <div className="rounded-2xl bg-brand-light-primary/70 dark:bg-white/5 border border-brand-light-tertiary/60 dark:border-white/10 p-3">
                        <p className="text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">Avg time</p>
                        <p className="text-lg font-bold text-brand-text-light-primary dark:text-brand-text-primary">{avgDuration} min</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 p-5 shadow-[0_18px_40px_rgba(25,33,28,0.08)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Featured Mission</p>
                      <span
                        className={
                          "text-[10px] font-bold px-2.5 py-1 rounded-full " +
                          (spotlightExam.available
                            ? "bg-brand-green/15 text-brand-green dark:text-brand-green"
                            : "bg-brand-text-light-secondary/15 text-brand-text-light-secondary dark:text-brand-text-secondary")
                        }
                      >
                        {spotlightExam.statusLabel}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ background: `${spotlightExam.accentColor}1a`, color: spotlightExam.accentColor }}
                      >
                        {spotlightExam.icon}
                      </div>
                      <div>
                        <p className="text-base font-bold text-brand-text-light-primary dark:text-brand-text-primary">{spotlightExam.shortTitle}</p>
                        <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary">
                          {spotlightExam.duration} - {spotlightExam.questions} questions
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartExam(spotlightExam)}
                      className="mt-5 w-full rounded-2xl border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 py-2.5 text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary hover:bg-brand-light-primary hover:shadow-md transition-all"
                    >
                      {spotlightExam.available ? "Start now" : "View details"}
                    </button>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 p-5 shadow-[0_18px_40px_rgba(25,33,28,0.08)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Track Overview</p>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text-light-secondary/70 dark:text-brand-text-secondary/70">Live</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {trackLanes.map((lane) => (
                        <div key={lane.id}>
                          <div className="flex items-center justify-between text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">
                            <span>{lane.label}</span>
                            <span>{lane.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-brand-light-tertiary/50 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(18, Math.round((lane.count / Math.max(EXAMS.length, 1)) * 100))}%`,
                                background: lane.accent,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* Signal Board */}
            {currentView === "dashboard" && (
            <section
              className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] animate-slide-up"
              style={{ animationDelay: "240ms" }}
            >
              <div className="relative overflow-hidden rounded-[2.5rem] border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_18px_60px_rgba(25,33,28,0.08)]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Training Roadmap</p>
                    <h3 className="mt-3 text-2xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">Build your skill pathway</h3>
                    <p className="mt-2 text-sm text-brand-text-light-secondary dark:text-brand-text-secondary max-w-md">
                      Stack the right mix of core, technical, and career assessments for your target role.
                    </p>
                  </div>
                  <div className="rounded-full border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">
                    Live progress
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {trackLanes.map((lane) => (
                    <div
                      key={lane.id}
                      className="relative overflow-hidden rounded-2xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div
                        className="absolute inset-0 opacity-70"
                        style={{ background: `linear-gradient(135deg, ${lane.accent}1f, transparent 60%)` }}
                      />
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">{lane.label}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-light-primary/60 dark:bg-white/10 text-brand-text-light-secondary dark:text-brand-text-secondary">
                            {Math.round((lane.count / EXAMS.length) * 100)}%
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-bold" style={{ color: lane.accent }}>
                          {lane.count}
                        </p>
                        <p className="mt-1 text-xs text-brand-text-light-secondary dark:text-brand-text-secondary">{lane.description}</p>
                        <div className="mt-3 h-1.5 rounded-full bg-brand-light-tertiary/50 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(18, Math.round((lane.count / Math.max(EXAMS.length, 1)) * 100))}%`,
                              background: lane.accent,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] text-brand-text-light-secondary/70 dark:text-brand-text-secondary/70">
                          {lane.count} of {EXAMS.length} assessments
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Stats Row */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/60 dark:bg-white/5 p-3 text-center">
                    <p className="text-[10px] font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary uppercase">Total Progress</p>
                    <p className="mt-1 text-lg font-bold text-brand-text-light-primary dark:text-brand-text-primary">{Math.round((readyExams.length / EXAMS.length) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-brand-green/30 dark:border-brand-green/30 bg-brand-green/5 dark:bg-brand-green/10 p-3 text-center">
                    <p className="text-[10px] font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary uppercase">Completed</p>
                    <p className="mt-1 text-lg font-bold text-brand-green">{readyExams.length}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/20 dark:border-blue-400/20 bg-blue-500/5 dark:bg-blue-400/10 p-3 text-center">
                    <p className="text-[10px] font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary uppercase">In Progress</p>
                    <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">{EXAMS.filter(e => !e.available).length}</p>
                  </div>
                  <div className="rounded-xl border border-violet-500/20 dark:border-violet-400/20 bg-violet-500/5 dark:bg-violet-400/10 p-3 text-center">
                    <p className="text-[10px] font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary uppercase">Skill Score</p>
                    <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">87</p>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2.5rem] border border-brand-light-tertiary/50 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_18px_60px_rgba(25,33,28,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Quick Launch</p>
                    <h3 className="mt-3 text-2xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">Ready to start now</h3>
                    <p className="mt-2 text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">
                      Jump into the next best assessment while your momentum is high.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilter("ready")}
                    className="rounded-full border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary hover:bg-brand-light-primary transition-all"
                  >
                    Show ready
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {queueExams.length ? (
                    queueExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex flex-col gap-4 rounded-2xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                            style={{ background: `${exam.accentColor}1a`, color: exam.accentColor }}
                          >
                            {exam.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary">{exam.shortTitle}</p>
                            <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary">
                              {exam.duration} - {exam.questions} questions
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartExam(exam)}
                          className="rounded-xl bg-brand-green text-white px-4 py-2 text-xs font-semibold hover:opacity-90 transition-all"
                        >
                          Start
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 p-4 text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">
                      All tracks are prepping. Check back soon.
                    </div>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* Career Timeline */}
            {currentView === "dashboard" && (
            <section
              className="animate-slide-up"
              style={{ animationDelay: "400ms" }}
            >
              <div className="rounded-[2.5rem] border border-brand-light-tertiary/50 dark:border-white/10 bg-gradient-to-br from-brand-light-secondary/80 via-brand-light-primary/70 to-brand-green/10 dark:from-brand-dark-secondary/70 dark:via-brand-dark-primary/60 dark:to-brand-green/5 p-6 sm:p-8 shadow-[0_18px_60px_rgba(25,33,28,0.08)]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Career Journey</p>
                    <h3 className="mt-2 text-xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">Your Professional Path</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-green/20 to-brand-green/10 text-brand-green dark:text-brand-green">{careerTimeline.filter(t => t.status === 'completed').length}/{careerTimeline.length} Phases</span>
                </div>

                <div className="relative">
                  {/* Timeline line - gradient from green through blue to violet */}
                  <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-green via-blue-500 to-violet-500 dark:from-brand-green dark:via-blue-400 dark:to-violet-400" />
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {careerTimeline.map((phase, idx) => {
                      const colors = {
                        completed: { bg: 'bg-brand-green/10', border: 'border-brand-green/20', text: 'text-brand-green', dot: 'bg-brand-green border-brand-green' },
                        active: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500 border-blue-500 animate-pulse' },
                        upcoming: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500/30 border-violet-500/50' },
                        locked: { bg: 'bg-brand-light-secondary/50', border: 'border-brand-light-tertiary/50', text: 'text-brand-text-light-secondary dark:text-brand-text-secondary', dot: 'bg-brand-light-tertiary dark:bg-white/10 border-brand-light-tertiary dark:border-white/20' }
                      };
                      const color = colors[phase.status as keyof typeof colors] || colors.locked;
                      
                      return (
                        <div key={phase.phase} className="relative pt-12">
                          {/* Timeline node */}
                          <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 z-10 ${color.dot}`}>
                            {phase.status === 'completed' && (
                              <svg className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          
                          <div className={`text-center p-4 rounded-2xl border transition-all hover:scale-105 ${color.bg} ${color.border} dark:bg-opacity-10`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${color.text}`}>{phase.phase}</p>
                            <p className="text-xs font-bold text-brand-text-light-primary dark:text-brand-text-primary">{phase.achievement}</p>
                            <p className="text-[9px] text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">{phase.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* Assessment Library with Filters */}
            <section className="space-y-6 animate-slide-up" style={{ animationDelay: "320ms" }}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold text-brand-text-light-primary dark:text-brand-text-primary tracking-tight">Assessment Library</h3>
                  <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">Filter by category or swipe to explore all assessments.</p>
                </div>
                <div className="relative">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-green/20 via-transparent to-brand-green/10 blur-lg opacity-70" />
                  <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/70 dark:bg-brand-dark-secondary/70 backdrop-blur-md shadow-sm">
                    {FILTERS.map((item) => {
                      const isActive = filter === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setFilter(item.value)}
                          className={
                            "relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 " +
                            (isActive
                              ? "text-white bg-brand-green shadow-md"
                              : "text-brand-text-light-secondary dark:text-brand-text-secondary hover:text-brand-text-light-primary dark:hover:text-brand-text-primary hover:bg-brand-light-secondary dark:hover:bg-white/5")
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">
                  Showing <span className="font-semibold text-brand-text-light-primary dark:text-brand-text-primary">{filteredExams.length}</span> assessments
                </p>
                <div className="rounded-full border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/70 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">
                  {filteredExams.length} available
                </div>
              </div>
              <ExamCarousel
                exams={filteredExams}
                onSelectExam={handleSelectExam}
                onStartExam={handleStartExam}
              />
            </section>

            {/* Performance Hub */}
            <section className="py-12 border-t border-brand-light-tertiary/60 dark:border-white/10 mt-4 animate-slide-up" style={{ animationDelay: "520ms" }}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-brand-text-light-primary dark:text-brand-text-primary tracking-tight">Performance Hub</h3>
                  <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">Insights and analytics from your assessment journey.</p>
                </div>
                <div className="text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">Live snapshot</div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/70 dark:bg-white/5 p-6 sm:p-8 shadow-[0_18px_60px_rgba(25,33,28,0.08)]">
                  <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top_left,rgba(30,211,106,0.16),transparent_55%)]" />
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Performance Overview</p>
                        <h4 className="mt-2 text-2xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">Your Assessment Analytics</h4>
                        <p className="mt-2 text-sm text-brand-text-light-secondary dark:text-brand-text-secondary max-w-xl">
                          A comprehensive view of your progress, skills, and readiness across all assessment tracks.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["Refreshed hourly", "AI-scored", "Multi-track"].map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-brand-light-tertiary/70 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-text-light-secondary dark:text-brand-text-secondary"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Career Identity Card */}
                    <div className="mt-6 relative overflow-hidden rounded-3xl border border-brand-light-tertiary/50 dark:border-white/10 bg-gradient-to-br from-brand-green/10 via-brand-green/5 to-transparent p-6 sm:p-8">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-green/20 to-transparent rounded-full blur-3xl" />
                      <div className="relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green dark:text-brand-green">Your Career Identity</p>
                            <h3 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-text-light-primary dark:text-brand-text-primary">{careerIdentity.archetype}</h3>
                            <p className="mt-1 text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">{careerIdentity.level}</p>
                          </div>
                          <div className="flex gap-2">
                            {careerIdentity.badges.map((badge) => (
                              <span key={badge} className="px-3 py-1.5 rounded-full bg-brand-light-primary/80 dark:bg-white/10 border border-brand-green/30 dark:border-brand-green/30 text-xs font-semibold text-brand-green dark:text-brand-green">
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* XP Progress */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-brand-text-light-secondary dark:text-brand-text-secondary">Experience Points</span>
                            <span className="font-bold text-brand-text-light-primary dark:text-brand-text-primary">{careerIdentity.xp} / {careerIdentity.xpToNext} XP</span>
                          </div>
                          <div className="h-2 rounded-full bg-brand-light-tertiary/50 dark:bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green/70" style={{ width: `${(careerIdentity.xp / careerIdentity.xpToNext) * 100}%` }} />
                          </div>
                        </div>
                        
                        <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary italic">"{careerIdentity.quote}"</p>
                      </div>
                    </div>

                    {/* Social Sharing Hub - Share Your Achievements */}
                    <div className="mt-6 rounded-3xl border border-brand-light-tertiary/50 dark:border-white/10 bg-gradient-to-br from-brand-light-primary/90 to-brand-green/5 dark:from-white/5 dark:to-brand-green/10 p-5">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Achievement Hub</p>
                          <p className="mt-2 text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary">Share your success</p>
                          <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">Showcase your certifications and milestones</p>
                        </div>
                        <div className="rounded-full bg-brand-green/10 dark:bg-brand-green/20 p-2">
                          <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </div>
                      </div>

                      {/* Recent Achievements Cards */}
                      <div className="space-y-3 mb-5">
                        <div className="rounded-2xl border border-brand-green/20 dark:border-brand-green/30 bg-gradient-to-r from-brand-green/10 to-transparent p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary">Aptitude Certified</p>
                              <p className="text-[11px] text-brand-text-light-secondary dark:text-brand-text-secondary">Completed with 92% accuracy</p>
                              <p className="text-[10px] text-brand-green mt-1">2 days ago</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/60 dark:bg-white/5 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary">7-Day Streak</p>
                              <p className="text-[11px] text-brand-text-light-secondary dark:text-brand-text-secondary">Consistent daily practice</p>
                              <p className="text-[10px] text-brand-green mt-1">Active now</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Share Buttons */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-light-secondary dark:text-brand-text-secondary">Share to</p>
                        <div className="grid grid-cols-4 gap-2">
                          <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#0077B5]/10 hover:bg-[#0077B5]/20 border border-[#0077B5]/20 transition-all group">
                            <svg className="w-5 h-5 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            <span className="text-[9px] font-medium text-brand-text-light-secondary dark:text-brand-text-secondary group-hover:text-[#0077B5]">LinkedIn</span>
                          </button>
                          <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/20 transition-all group">
                            <svg className="w-5 h-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                            <span className="text-[9px] font-medium text-brand-text-light-secondary dark:text-brand-text-secondary group-hover:text-[#1DA1F2]">Twitter</span>
                          </button>
                          <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 transition-all group">
                            <svg className="w-5 h-5 text-gray-700 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                            </svg>
                            <span className="text-[9px] font-medium text-brand-text-light-secondary dark:text-brand-text-secondary group-hover:text-brand-text-light-primary dark:group-hover:text-white">GitHub</span>
                          </button>
                          <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-green-100 hover:bg-green-200 dark:bg-brand-green/10 dark:hover:bg-brand-green/20 border border-green-200 dark:border-brand-green/30 transition-all group">
                            <svg className="w-5 h-5 text-green-600 dark:text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="text-[9px] font-medium text-brand-text-light-secondary dark:text-brand-text-secondary group-hover:text-green-600 dark:group-hover:text-brand-green">Copy</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {signalHighlights.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/80 dark:bg-white/5 p-3 hover:shadow-sm transition-all">
                          <p className="text-xs font-semibold text-brand-text-light-secondary dark:text-brand-text-secondary">{item.label}</p>
                          <p className="mt-1 text-sm font-bold text-brand-text-light-primary dark:text-brand-text-primary">{item.value}</p>
                          <p className="mt-1 text-[11px] text-brand-text-light-secondary dark:text-brand-text-secondary">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Creative Sections */}
                <div className="grid gap-6">
                  {/* Skill Constellation */}
                  {/* Skills Overview */}
                  <div className="rounded-[2.5rem] border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/70 dark:bg-white/5 p-6 sm:p-8 shadow-[0_18px_40px_rgba(25,33,28,0.08)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-green/10 to-transparent rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Skills Constellation</p>
                          <p className="text-[10px] text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">Multi-dimensional capability map</p>
                        </div>
                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green">Real-time</span>
                      </div>

                      {/* Concentric Progress SVG Design */}
                      <div className="flex flex-col xl:flex-row items-center gap-6">
                        <div className="relative w-40 h-40 shrink-0">
                          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform drop-shadow-lg filter">
                            <defs>
                              <linearGradient id="ringGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1ed36a" />
                                <stop offset="100%" stopColor="#15a34f" />
                              </linearGradient>
                              <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                              </linearGradient>
                              <linearGradient id="ringGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#6d28d9" />
                              </linearGradient>
                              <linearGradient id="ringGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#b45309" />
                              </linearGradient>
                            </defs>
                            {skillGalaxy.slice(0, 4).map((skill, index) => {
                              const radius = 88 - (index * 22);
                              const circumference = 2 * Math.PI * radius;
                              const offset = circumference - ((skill.level > 100 ? 100 : skill.level) / 100) * circumference;
                              
                              return (
                                <g key={skill.name}>
                                  {/* Background Track */}
                                  <circle
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    fill="none"
                                    className="stroke-brand-light-tertiary/30 dark:stroke-white/10"
                                    strokeWidth="12"
                                  />
                                  {/* Active Progress */}
                                  <circle
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    fill="none"
                                    className="transition-all duration-1000 ease-in-out opacity-90"
                                    stroke={`url(#ringGrad${index})`}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                          {/* Center Element */}
                          <div className="absolute inset-0 m-auto w-12 h-12 rounded-full border border-brand-green/20 bg-brand-green/5 dark:bg-brand-green/10 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-xs font-bold text-brand-green">87</span>
                          </div>
                        </div>

                        {/* Legend / Stats */}
                        <div className="w-full flex-1 space-y-3">
                          {skillGalaxy.slice(0, 4).map((skill, index) => {
                            const colors = ["bg-[#1ed36a]", "bg-[#3b82f6]", "bg-[#8b5cf6]", "bg-[#f59e0b]"];
                            return (
                              <div key={skill.name} className="group relative">
                                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-brand-light-secondary/50 dark:hover:bg-white/5 transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-2.5 h-2.5 rounded-full ${colors[index]} shadow-[0_0_8px_${colors[index]}40]`} />
                                    <span className="text-sm font-semibold text-brand-text-light-primary dark:text-brand-text-primary">{skill.name}</span>
                                  </div>
                                  <span className="text-sm font-bold text-brand-text-light-secondary dark:text-brand-text-primary">{skill.level}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Connection insight - elegant badge */}
                      <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-brand-light-secondary/80 to-transparent dark:from-white/[0.03] dark:to-transparent border-l-2 border-brand-green">
                        <div className="flex gap-3">
                          <svg className="w-4 h-4 text-brand-green shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed">
                            <span className="font-semibold text-brand-text-light-primary dark:text-brand-text-primary mr-1">Nexus Found:</span>
                            Your interplay between <span className="font-medium text-brand-green">Logic</span> and <span className="font-medium text-blue-500">Patterns</span> indicates elite analytical bandwidth. Ready for architecture training.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Development Focus */}
                  <div className="rounded-[2.5rem] border border-brand-light-tertiary/60 dark:border-white/10 bg-brand-light-primary/70 dark:bg-white/5 p-6 shadow-[0_18px_40px_rgba(25,33,28,0.08)]">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text-light-secondary dark:text-brand-text-secondary">Development Focus</p>
                    </div>

                    {/* Current focus */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-4 transform transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <p className="text-sm font-medium text-brand-text-light-primary dark:text-brand-text-primary">Communication Assessment</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">Next Action</span>
                      </div>
                      <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary mb-3">
                        Complete Business Linguistics and Reading Comprehension to unlock your Technical Groupings funnel.
                      </p>
                      <button 
                        onClick={() => handleStartExam(EXAMS.find(e => e.id === 'communication') || EXAMS[1])}
                        className="w-full mt-2 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      >
                        Start Communication Module
                      </button>
                    </div>

                    {/* Next up */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
                      <div className="absolute inset-0 bg-slate-50/50 dark:bg-black/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <span className="bg-white/80 dark:bg-black/60 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 backdrop-blur-md border border-slate-200 dark:border-white/10">Requires Comm Score</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2 opacity-60">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <p className="text-sm font-medium text-brand-text-light-primary dark:text-brand-text-primary">Backend & Systems</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">Locked</span>
                      </div>
                      <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary opacity-60">
                        Algorithms, Data Structures (Advanced Trees, Graphs), and Dynamic Programming.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </section>
          </>
        ) : currentView === "assessment" ? (
          <div className="animate-slide-up space-y-10" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Assessments</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select an assessment to validate your skills and get certified.</p>
              </div>
              
              <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-md shadow-sm">
                {FILTERS.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={
                        "relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 " +
                        (isActive
                          ? "text-white bg-slate-900 dark:bg-white dark:text-slate-900 shadow-md"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5")
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <AssessmentCard
                  key={exam.id}
                  title={exam.title}
                  description={exam.description}
                  statusLabel={exam.statusLabel}
                  statusTone={exam.available ? "success" : "warning"}
                  totalQuestions={exam.questions}
                  duration={exam.duration}
                  price={`₹${exam.price}`}
                  tags={exam.tags}
                  icon={exam.icon}
                  available={exam.available}
                  level={exam.difficulty}
                  insight={exam.statusLabel}
                  onDetailsClick={() => handleSelectExam(exam)}
                  onStartClick={() => handleStartExam(exam)}
                />
              ))}
            </div>
          </div>
        ) : (
          <section className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center rounded-3xl bg-brand-light-primary/80 dark:bg-brand-dark-secondary/80 backdrop-blur-xl border border-brand-light-tertiary/60 dark:border-white/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-light-secondary dark:bg-white/5 text-brand-text-light-secondary dark:text-brand-text-secondary">
              <ProfileIcon className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-medium text-brand-text-light-primary dark:text-brand-text-primary">Profile & Settings</h2>
            <p className="mt-3 max-w-md text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed">
              Your profile area is being prepared. You can continue exploring assessments and start any available test from the library.
            </p>
            <button
              type="button"
              onClick={() => setCurrentView("assessment")}
              className="mt-6 px-6 py-3 rounded-xl bg-brand-green text-white text-sm font-medium transition-all hover:opacity-90"
            >
              View assessments
            </button>
          </section>
        )}

        <footer className="py-8 text-center">
          <p className="text-sm text-brand-text-light-secondary/70 dark:text-brand-text-secondary">
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
