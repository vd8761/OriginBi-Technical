import React from "react";
import type { Exam } from "@/components/student/ExamCarousel";
import {
  AptitudeIcon,
  CommunicationIcon,
  CodingIcon,
  MNCIcon,
  RoleIcon,
} from "@/components/icons";

export type AssessmentId = "aptitude" | "communication" | "coding" | "mnc" | "role";
export type AssessmentTrack = "core" | "technical" | "career";

export interface CodingLanguage {
  id: string;
  name: string;
  description: string;
  accent: string;
  icon: string;
}

export const CODING_LANGUAGES: CodingLanguage[] = [
  { id: "python", name: "Python", description: "Clean syntax, great for logic and data tasks.", accent: "#3776AB", icon: "/python.webp" },
  { id: "java", name: "Java", description: "Strict typing, dominant in enterprise interviews.", accent: "#E76F00", icon: "/java.webp" },
  { id: "cpp", name: "C++", description: "Performance-focused, common in product company rounds.", accent: "#00599C", icon: "/cpp.webp" },
  { id: "javascript", name: "JavaScript", description: "Flexible scripting, widely used for web roles.", accent: "#F7DF1E", icon: "/js.webp" },
  { id: "c", name: "C", description: "Foundational language used in core CS curriculums.", accent: "#A8B9CC", icon: "/c.webp" },
];

export interface ExtendedExam extends Exam {
  track: AssessmentTrack;
  trialAttemptsLimit?: number;
  mainAttemptsLimit?: number;
  assessmentId?: number | string;
  assessmentCode?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  features: string[];
  badge?: string;
  popular?: boolean;
}

export interface ExamDetailData {
  focus: string;
  skills: { title: string; description: string }[];
  sections: { name: string; detail: string; weight: string }[];
  outcomes: string[];
  requirements: string[];
  pricingTiers: PricingTier[];
}

export const EXAMS: ExtendedExam[] = [
  {
    id: "aptitude",
    title: "Aptitude Assessment",
    shortTitle: "Aptitude",
    description:
      "Evaluate numerical agility, logical structure, data interpretation, and pattern recognition under timed conditions.",
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
    description:
      "Measure listening, speaking, reading, and writing performance through workplace-style tasks.",
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
    description:
      "Validate programming fundamentals with number logic, strings, arrays, and simulation-driven exercises.",
    duration: "90 min",
    questions: 30,
    difficulty: "Intermediate",
    price: 199,
    tags: ["Logic", "Strings", "Arrays", "Simulation"],
    icon: <CodingIcon className="w-7 h-7" />,
    available: true,
    statusLabel: "Ready",
    accentColor: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    track: "technical",
  },
  {
    id: "mnc",
    title: "MNC Career Assessment",
    shortTitle: "MNC Career",
    description:
      "Master high-frequency interview patterns and professional expectations for top-tier MNC roles.",
    duration: "60 min",
    questions: 25,
    difficulty: "Advanced",
    price: 249,
    tags: ["DSA", "System Design", "Culture", "HR Prep"],
    icon: <MNCIcon className="w-7 h-7" />,
    available: true,
    statusLabel: "Ready",
    accentColor: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    track: "career",
  },
  {
    id: "role",
    title: "Role Based Questions",
    shortTitle: "Role Based",
    description:
      "Assess role-fit through conceptual MCQs and scenario decisions designed around practical job responsibilities.",
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

export const EXAM_DETAILS: Record<AssessmentId, ExamDetailData> = {
  aptitude: {
    focus:
      "A balanced cognitive benchmark for early career candidates and campus hiring preparation.",
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
      { id: "basic", name: "Basic", price: 99, features: ["Full exam access", "Basic score report", "Section-wise breakdown"], badge: "Starter" },
      { id: "standard", name: "Standard", price: 149, originalPrice: 199, discount: 25, features: ["Full exam access", "Detailed analytics", "Skill gap analysis", "Practice recommendations"], popular: true },
      { id: "premium", name: "Premium", price: 249, originalPrice: 349, discount: 29, features: ["Everything in Standard", "1-on-1 expert review", "Personalized study plan", "Mock interview session"] },
    ],
  },
  communication: {
    focus:
      "A practical language benchmark for interviews, client calls, workplace writing, and professional collaboration.",
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
      { id: "basic", name: "Basic", price: 149, features: ["Full exam access", "Basic score report", "Section-wise breakdown"], badge: "Starter" },
      { id: "standard", name: "Standard", price: 199, originalPrice: 249, discount: 20, features: ["Full exam access", "Detailed analytics", "Fluency metrics", "Improvement tips"], popular: true },
      { id: "premium", name: "Premium", price: 299, originalPrice: 399, discount: 25, features: ["Everything in Standard", "Speaking coach review", "Personalized exercises", "Video feedback session"] },
    ],
  },
  coding: {
    focus:
      "A fundamentals-first programming screen for candidates building confidence before harder technical interviews.",
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
      { id: "basic", name: "Basic", price: 199, originalPrice: 249, discount: 20, features: ["Full exam access", "Basic score report", "Test cases passed"], badge: "Early Access" },
      { id: "standard", name: "Standard", price: 249, originalPrice: 349, discount: 29, features: ["Full exam access", "Time complexity analysis", "Code quality score", "Solution explanations"], popular: true },
      { id: "premium", name: "Premium", price: 349, originalPrice: 499, discount: 30, features: ["Everything in Standard", "Mentor code review", "Algorithm suggestions", "Practice problem set"] },
    ],
  },
  mnc: {
    focus:
      "A sharper interview-practice track for candidates targeting larger product, service, and consulting companies.",
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
      { id: "basic", name: "Basic", price: 249, originalPrice: 349, discount: 29, features: ["Full exam access", "Basic score report", "Difficulty rating"], badge: "Early Access" },
      { id: "standard", name: "Standard", price: 299, originalPrice: 449, discount: 33, features: ["Full exam access", "Company-wise trends", "Time analysis", "Weak area identification"], popular: true },
      { id: "premium", name: "Premium", price: 399, originalPrice: 599, discount: 33, features: ["Everything in Standard", "Mock interview", "Company-specific tips", "Study roadmap"] },
    ],
  },
  role: {
    focus:
      "A role-fit diagnostic that tests conceptual knowledge and decision-making in realistic work situations.",
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
      { id: "basic", name: "Basic", price: 299, features: ["Full exam access", "Basic role-fit report", "Top 3 role matches"], badge: "Starter" },
      { id: "standard", name: "Standard", price: 349, originalPrice: 449, discount: 22, features: ["Full exam access", "Detailed role analysis", "Skill-to-role mapping", "Career suggestions"], popular: true },
      { id: "premium", name: "Premium", price: 499, originalPrice: 699, discount: 29, features: ["Everything in Standard", "Career coach session", "Personalized roadmap", "Industry insights"] },
    ],
  },
};

export const ASSESSMENT_RUN_PATH: Record<AssessmentId, string | null> = {
  aptitude: "/assessment/aptitude",
  communication: "/assessment/communication",
  role: "/assessment/role",
  coding: "/assessment/coding",
  mnc: "/assessment/mnc",
};
