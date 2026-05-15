// ── Assessment Type (top-level module selector) ──
export type AssessmentType = "aptitude" | "mnc" | "communication" | "role" | "coding";

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  aptitude: "Aptitude Assessment",
  mnc: "MNC Career Prep",
  communication: "Communication Skills",
  role: "Role-Based Technical",
  coding: "Coding & Development",
};

export const ASSESSMENT_TYPE_DESCRIPTIONS: Record<AssessmentType, string> = {
  aptitude: "Quantitative, Logical, and Verbal reasoning question bank.",
  mnc: "Technical MCQs focused on Data Structures, Algorithms, and Core CS.",
  communication: "Multi-skill tasks including Audio, Speaking, Reading, and Writing.",
  role: "Context-aware conceptual and scenario-based technical evaluations.",
  coding: "In-browser IDE assessments for algorithms and problem solving.",
};

export const ASSESSMENT_TYPE_ICONS: Record<AssessmentType, string> = {
  aptitude: "📊",
  mnc: "🏢",
  communication: "💬",
  role: "🎯",
  coding: "💻",
};

// ── Shared ──
export interface QuestionOption {
  id: string;
  text: string;
}

export type QuestionMode = "trial" | "main";
export type ViewMode = "list" | "json-import";

// ── Aptitude ──
export type DifficultyLevel = "easy" | "medium" | "hard";
export type QuestionStatus = "active" | "inactive";

export interface AptitudeQuestion {
  id: string;
  category: string;
  subcategory?: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  // DB-aligned fields
  assessmentId?: number;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  status?: QuestionStatus;
  imageUrl?: string | null;
  explanation?: string;
}

export const APTITUDE_CATEGORIES = ["QA", "LR", "DI", "AR", "VA"] as const;

export const APTITUDE_CATEGORY_LABELS: Record<string, string> = {
  QA: "Quantitative Aptitude",
  LR: "Logical Reasoning",
  DI: "Data Interpretation",
  AR: "Abstract Reasoning",
  VA: "Verbal Ability",
};

// ── MNC ──
export interface MNCQuestion {
  id: string;
  topic: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  // DB-aligned fields
  assessmentId?: number;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  status?: QuestionStatus;
  imageUrl?: string | null;
  explanation?: string;
}

export const MNC_TOPICS = [
  "Data Structures", "Algorithms", "Dynamic Programming",
  "Graph Theory", "System Design", "OOP", "Databases",
  "Networking", "OS Concepts", "General"
] as const;

// ── Communication ──
export type CommTaskType = "audio" | "reading" | "speaking" | "writing" | "mcq";

export interface CommQuestion {
  id: string;
  taskType: CommTaskType;
  category?: string;
  subcategory?: string;
  instructions: string;
  // For audio / reading / mcq
  questions?: { id: string; text: string; options: QuestionOption[]; correctOptionId?: string }[];
  // For reading
  passage?: string;
  // For audio
  audioUrl?: string;
  // For speaking
  prompt?: string;
  prepTimeSeconds?: number;
  recordTimeSeconds?: number;
  // For writing
  minWords?: number;
  maxWords?: number;
  // DB-aligned fields
  assessmentId?: number;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  status?: QuestionStatus;
  explanation?: string;
}

export const COMM_TASK_LABELS: Record<CommTaskType, string> = {
  audio: "Audio Comprehension",
  reading: "Reading Clarity",
  speaking: "Speaking Response",
  writing: "Writing Craft",
  mcq: "Linguistic Accuracy",
};

// ── Role-Based ──
export type RoleQuestionType = "conceptual" | "scenario";

export interface RoleQuestion {
  id: string;
  questionType: RoleQuestionType;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  // Conceptual fields
  category?: string;
  subCategory?: string;
  // Scenario fields
  title?: string;
  scenarioContext?: string;
  ticketId?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  reportedBy?: string;
  // DB-aligned fields
  assessmentId?: number;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  status?: QuestionStatus;
  imageUrl?: string | null;
  explanation?: string;
}

export const ROLE_QUESTION_TYPE_LABELS: Record<RoleQuestionType, string> = {
  conceptual: "Conceptual",
  scenario: "Scenario",
};

// ── Coding ──
export interface CodingQuestion {
  id: string;
  category: string;
  text: string;
  assessmentId?: number;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  status?: QuestionStatus;
  explanation?: string;
}

export const CODING_CATEGORIES = ["Algorithms", "Data Structures", "Logic", "Backend", "Frontend"] as const;

// ── Category colors (reused) ──
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  QA: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  LR: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  DI: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  AR: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  VA: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
  // MNC topics
  "Data Structures": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  Algorithms: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  "Dynamic Programming": { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  "Graph Theory": { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  "System Design": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  OOP: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
  Databases: { bg: "bg-lime-500/10", text: "text-lime-600 dark:text-lime-400", border: "border-lime-500/20" },
  Networking: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20" },
  "OS Concepts": { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", border: "border-fuchsia-500/20" },
  General: { bg: "bg-stone-500/10", text: "text-stone-600 dark:text-stone-400", border: "border-stone-500/20" },
  // Communication
  audio: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20" },
  reading: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  speaking: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  writing: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  mcq: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  // Role
  conceptual: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  scenario: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
};

export type QuestionKind = "mcq" | "msq" | "tf" | "numerical";

// ── Union type for any question ──
export type AnyQuestion = (AptitudeQuestion | MNCQuestion | CommQuestion | RoleQuestion | CodingQuestion) & { kind?: QuestionKind; correctOptionIds?: string[]; correctAnswer?: string };

// ── Sample JSONs ──
// ── Sample JSONs ──
export const SAMPLE_JSONS: Record<AssessmentType, string> = {
  aptitude: `[
  {
    "category": "QA",
    "text": "If the price of a book is first decreased by 25% and then increased by 20%, the net change in price will be:",
    "options": [
      { "text": "10% decrease" },
      { "text": "5% decrease" },
      { "text": "No change" },
      { "text": "5% increase" }
    ],
    "correctOptionIndex": 0
  },
  {
    "category": "VA",
    "kind": "msq",
    "text": "Identify the synonyms for 'Resilient':",
    "options": [
      { "text": "Tough" },
      { "text": "Fragile" },
      { "text": "Elastic" },
      { "text": "Weak" }
    ],
    "correctOptionIndices": [0, 2]
  },
  {
    "category": "LR",
    "kind": "tf",
    "text": "In a logical sequence, if A implies B and B implies C, then A implies C.",
    "options": [
      { "text": "True" },
      { "text": "False" }
    ],
    "correctOptionIndex": 0
  },
  {
    "category": "QA",
    "kind": "numerical",
    "text": "What is the square root of 625?",
    "correctAnswer": "25",
    "explanation": "The square root of 625 is 25.",
    "difficulty": "medium",
    "marks": 2,
    "negativeMarks": 0
  }
]`,
  mnc: `[
  {
    "topic": "Data Structures",
    "text": "What is the time complexity of searching in a balanced BST?",
    "options": [
      { "text": "O(1)" },
      { "text": "O(n)" },
      { "text": "O(log n)" },
      { "text": "O(n log n)" }
    ],
    "correctOptionIndex": 2
  }
]`,
  communication: `[
  {
    "taskType": "mcq",
    "instructions": "Choose the most appropriate professional response.",
    "questions": [
      {
        "text": "Choose the most professional email opening:",
        "options": [
          { "text": "Hey, just checking in about what we talked about." },
          { "text": "It was a pleasure meeting with you earlier today." },
          { "text": "I forgot to ask something in the meeting." },
          { "text": "Did you look at the notes I sent?" }
        ],
        "correctOptionIndex": 1
      }
    ]
  },
  {
    "taskType": "reading",
    "instructions": "Read the passage and answer questions.",
    "passage": "Subject: Project Alpha Update\\n\\nThe delivery date has been moved up by two weeks...",
    "questions": [
      {
        "text": "What is the main reason for the schedule change?",
        "options": [
          { "text": "The team was working too slowly." },
          { "text": "The client has an upcoming product launch." },
          { "text": "The PM is going on leave." },
          { "text": "There was a contract error." }
        ],
        "correctOptionIndex": 1
      }
    ]
  },
  {
    "taskType": "writing",
    "instructions": "Draft an email response.",
    "prompt": "A client is frustrated about a broken feature. Draft a professional response.",
    "minWords": 50,
    "maxWords": 200
  },
  {
    "taskType": "speaking",
    "instructions": "Record a speaking response.",
    "prompt": "Explain a complex technical problem to a non-technical stakeholder.",
    "prepTimeSeconds": 30,
    "recordTimeSeconds": 90
  }
]`,
  role: `[
  {
    "questionType": "conceptual",
    "category": "API Design",
    "subCategory": "REST Fundamentals",
    "text": "Which of the architectural styles are applicable to REST?",
    "kind": "msq",
    "options": [
      { "text": "Client-Server" },
      { "text": "Stateless" },
      { "text": "Synchronous Execution" },
      { "text": "Cacheable" }
    ],
    "correctOptionIndices": [0, 1, 3]
  },
  {
    "questionType": "scenario",
    "title": "Frontend Optimization",
    "scenarioContext": "The UI freezes for 3-5 seconds when rendering 10,000 records.",
    "ticketId": "INC-8942",
    "priority": "High",
    "reportedBy": "QA Team",
    "text": "What is the most optimal solution to resolve this bottleneck?",
    "options": [
      { "text": "Increase browser memory." },
      { "text": "Implement virtualization/windowing." },
      { "text": "Use a Web Worker." },
      { "text": "Debounce the API call." }
    ],
    "correctOptionIndex": 1
  }
]`,
  coding: `[]`,
};
