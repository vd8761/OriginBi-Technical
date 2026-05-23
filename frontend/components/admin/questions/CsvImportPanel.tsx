"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  AssessmentType, AnyQuestion, CATEGORY_COLORS,
  AptitudeQuestion, MNCQuestion, CommQuestion, RoleQuestion, CodingQuestion,
  COMM_TASK_LABELS, ROLE_QUESTION_TYPE_LABELS, QuestionKind, QuestionOption,
  APTITUDE_CATEGORIES, APTITUDE_CATEGORY_LABELS, MNC_TOPICS,
  ROLE_QUESTION_TYPE_LABELS as ROLE_LABELS, CODING_CATEGORIES
} from "./types";
import { generateId } from "./storage";
import CustomSelect from "@/components/ui/CustomSelect";
import { uploadQuestionAsset, ChunkedImportProgress } from "./api";
import { 
  AlertCircle, CheckCircle2, Upload, Trash2, Plus, Download,
  FileSpreadsheet, Edit3, HelpCircle, Check, AlertTriangle, X, UploadCloud, Loader2
} from "lucide-react";

interface CsvImportPanelProps {
  assessmentType: AssessmentType;
  allowedQuestionKinds: QuestionKind[];
  onImport: (questions: AnyQuestion[], onProgress?: (p: ChunkedImportProgress) => void) => void;
  onCancel: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

// ─── Dynamic CSV Template Generator ───────────────────────────────────────────
function getCsvHeaders(assessmentType: AssessmentType): string[] {
  switch (assessmentType) {
    case "aptitude":
      return [
        "Category", "Subcategory", "Question Type", "Question Text",
        "Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6",
        "Correct Option Index", "Correct Answer", "Difficulty", "Marks", "Negative Marks",
        "Explanation", "Status"
      ];
    case "mnc":
      return [
        "Topic", "Question Type", "Question Text",
        "Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6",
        "Correct Option Index", "Difficulty", "Marks", "Negative Marks",
        "Explanation", "Status"
      ];
    case "role":
      return [
        "Question Type", "Category", "Subcategory",
        "Scenario Title", "Scenario Context", "Ticket ID", "Priority", "Reported By",
        "Question Kind", "Question Text",
        "Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6",
        "Correct Option Index", "Difficulty", "Marks", "Negative Marks",
        "Explanation", "Status"
      ];
    case "coding":
      return [
        "Category", "Question Text", "Difficulty", "Marks", "Negative Marks",
        "Explanation", "Status"
      ];
    case "communication":
      return [
        "Category", "Subcategory", "Question Type", "Question Text",
        "Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6",
        "Correct Option Index", "Difficulty", "Marks", "Explanation", "Status"
      ];
    default:
      return [];
  }
}

function getCsvSampleRows(assessmentType: AssessmentType): string[][] {
  switch (assessmentType) {
    case "aptitude":
      return [
        ["QA", "", "mcq", "If the price of a book is first decreased by 25% and then increased by 20%, the net change in price will be:", "10% decrease", "5% decrease", "No change", "5% increase", "", "", "1", "", "easy", "1", "0.25", "Net change is 10% decrease", "active"],
        ["VA", "", "msq", "Identify the synonyms for 'Resilient':", "Tough", "Fragile", "Elastic", "Weak", "", "", "1,3", "", "medium", "2", "0.25", "Tough and Elastic are resilient synonyms.", "active"],
        ["LR", "", "tf", "In a logical sequence, if A implies B and B implies C, then A implies C.", "True", "False", "", "", "", "", "1", "", "easy", "1", "0.25", "Transitive property of logic.", "active"],
        ["QA", "", "numerical", "What is the square root of 625?", "", "", "", "", "", "", "", "25", "medium", "2", "0.25", "625 square root is 25.", "active"]
      ];
    case "mnc":
      return [
        ["Data Structures", "mcq", "What is the time complexity of searching in a balanced BST?", "O(1)", "O(n)", "O(log n)", "O(n log n)", "", "", "3", "medium", "2", "0.25", "A balanced BST offers log n search depth.", "active"],
        ["Algorithms", "msq", "Which of the following are sorting algorithms?", "Quick Sort", "Binary Search", "Merge Sort", "Bubble Sort", "", "", "1,3,4", "medium", "2", "0.25", "Quick, Merge, and Bubble are sorting methods.", "active"]
      ];
    case "role":
      return [
        ["conceptual", "API Design", "REST Fundamentals", "", "", "", "Medium", "", "mcq", "Which HTTP method is idempotent?", "POST", "GET", "PATCH", "DELETE", "", "", "2", "easy", "1", "0.25", "GET is idempotent.", "active"],
        ["scenario", "Frontend Optimization", "", "Frontend Virtualization", "The UI freezes for 3-5 seconds when rendering 10,000 records.", "INC-8942", "High", "QA Team", "mcq", "What is the most optimal solution to resolve this bottleneck?", "Increase browser memory.", "Implement virtualization/windowing.", "Use a Web Worker.", "Debounce the API call.", "", "", "2", "hard", "5", "0.25", "Virtualization renders only visible DOM rows.", "active"]
      ];
    case "coding":
      return [
        ["Algorithms", "Write a function that finds the maximum subarray sum in O(n) time.", "medium", "5", "0", "Use Kadane's algorithm to compute in linear time.", "active"],
        ["Data Structures", "Implement a Priority Queue using a binary heap implementation.", "hard", "10", "0", "Use array-based parent-child node logic.", "active"]
      ];
    case "communication":
      return [
        ["Verbal Communication", "Self Introduction", "mcq", "Which of the following is the most professional way to start a self-introduction in an interview?", "Hi, I am John.", "Good morning, my name is John Doe and I am a software engineer.", "What's up, I'm John.", "Myself John.", "", "", "2", "easy", "1", "Polite and complete name with role is professional.", "active"],
        ["Verbal Communication", "Public Speaking", "msq", "Which of the following are effective ways to maintain audience engagement?", "Making eye contact with different sections of the room", "Speaking in a flat, monotone voice", "Using stories and relevant examples", "Reading directly from the slides at all times", "", "", "1,3", "medium", "2", "Eye contact and storytelling enhance engagement.", "active"],
        ["Verbal Communication", "Group Discussion", "tf", "Interrupting others constantly is considered a sign of leadership in a group discussion.", "True", "False", "", "", "", "", "2", "easy", "1", "Interrupting others shows lack of active listening.", "active"]
      ];
    default:
      return [];
  }
}

// ─── Clean RFC 4180 CSV Parser ─────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let col = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          col += '"';
          i++; // Skip double quote escape
        } else {
          insideQuote = false;
        }
      } else {
        col += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        row.push(col.trim());
        col = "";
      } else if (char === '\r' || char === '\n') {
        row.push(col.trim());
        col = "";
        if (row.length > 1 || row[0] !== "") {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip next char for CR LF
        }
      } else {
        col += char;
      }
    }
  }
  if (col !== "" || row.length > 0) {
    row.push(col.trim());
    result.push(row);
  }
  return result;
}

// ─── Real-time CSV Row Validator ──────────────────────────────────────────────
function validateQuestionRow(q: AnyQuestion, assessmentType: AssessmentType): ValidationError[] {
  const errors: ValidationError[] = [];
  const common = q as any;

  // Basic Text Validation
  if (assessmentType === "communication") {
    if (!common.instructions || !common.instructions.trim()) {
      errors.push({ field: "instructions", message: "Instructions are required." });
    }
    if (["speaking", "writing"].includes(common.taskType)) {
      if (!common.prompt || !common.prompt.trim()) {
        errors.push({ field: "prompt", message: `Prompt is required for ${common.taskType} task.` });
      }
    }
    if (common.taskType === "writing") {
      const min = Number(common.minWords || 0);
      const max = Number(common.maxWords || 0);
      if (min > 0 && max > 0 && min > max) {
        errors.push({ field: "minWords", message: "Min Words cannot exceed Max Words." });
      }
    }
    if (common.taskType === "speaking") {
      const prep = Number(common.prepTimeSeconds || 0);
      const rec = Number(common.recordTimeSeconds || 0);
      if (prep > 0 && rec > 0 && prep > rec) {
        errors.push({ field: "prepTimeSeconds", message: "Prep time cannot exceed speaking recording time." });
      }
    }
  } else {
    if (!common.text || !common.text.trim()) {
      errors.push({ field: "text", message: "Question text is required." });
    }
  }

  // Category and Topics Checks
  if (assessmentType === "aptitude") {
    if (!common.category || !common.category.trim()) {
      errors.push({ field: "category", message: "Category is required (e.g. QA, LR, DI, AR, VA)." });
    }
  } else if (assessmentType === "mnc") {
    if (!common.topic || !common.topic.trim()) {
      errors.push({ field: "topic", message: "Topic is required." });
    }
  } else if (assessmentType === "role") {
    if (!common.questionType || !["conceptual", "scenario"].includes(common.questionType)) {
      errors.push({ field: "questionType", message: "Question Type must be 'conceptual' or 'scenario'." });
    }
  }

  // Option / Option correctness validation
  const kind = common.kind || "mcq";
  if (assessmentType === "communication" && common.taskType === "mcq") {
    const subQ = common.questions?.[0];
    const options = subQ?.options || [];
    if (options.length < 2) {
      errors.push({ field: "options", message: "At least 2 options are required." });
    }
    const emptyOptions = options.some((o: any) => !o.text || !o.text.trim());
    if (emptyOptions) {
      errors.push({ field: "options", message: "Option descriptions cannot be empty." });
    }

    if (kind === "msq") {
      const correctIds = common.correctOptionIds || [];
      if (correctIds.length === 0) {
        errors.push({ field: "correctOptionIds", message: "At least one correct option index is required for MSQ." });
      }
      const invalidIds = correctIds.filter((id: string) => !options.some((o: any) => o.id === id));
      if (invalidIds.length > 0) {
        errors.push({ field: "correctOptionIds", message: "One or more correct option selections are invalid." });
      }
    } else {
      const correctId = common.correctOptionId || subQ?.correctOptionId;
      if (!correctId) {
        errors.push({ field: "correctOptionId", message: "Correct option selection is required." });
      } else if (!options.some((o: any) => o.id === correctId)) {
        errors.push({ field: "correctOptionId", message: "Correct option selection is invalid." });
      }
    }
  } else if (assessmentType !== "coding" && assessmentType !== "communication") {
    if (kind === "numerical") {
      if (!common.correctAnswer || !common.correctAnswer.trim()) {
        errors.push({ field: "correctAnswer", message: "Correct Answer is required for numerical questions." });
      }
    } else {
      const options = common.options || [];
      if (options.length < 2) {
        errors.push({ field: "options", message: "At least 2 options are required." });
      }
      const emptyOptions = options.some((o: any) => !o.text || !o.text.trim());
      if (emptyOptions) {
        errors.push({ field: "options", message: "Option descriptions cannot be empty." });
      }

      if (kind === "msq") {
        const correctIds = common.correctOptionIds || [];
        if (correctIds.length === 0) {
          errors.push({ field: "correctOptionIds", message: "At least one correct option index is required for MSQ." });
        }
        const invalidIds = correctIds.filter((id: string) => !options.some((o: any) => o.id === id));
        if (invalidIds.length > 0) {
          errors.push({ field: "correctOptionIds", message: "One or more correct option selections are invalid." });
        }
      } else {
        const correctId = common.correctOptionId;
        if (!correctId) {
          errors.push({ field: "correctOptionId", message: "Correct option selection is required." });
        } else if (!options.some((o: any) => o.id === correctId)) {
          errors.push({ field: "correctOptionId", message: "Correct option selection is invalid." });
        }
      }
    }
  }

  // Communication sub-questions options validation
  if (assessmentType === "communication" && ["mcq", "reading", "audio"].includes(common.taskType)) {
    const subqs = common.questions || [];
    if (subqs.length === 0) {
      errors.push({ field: "questions", message: "At least one sub-question is required for mcq/reading/audio task types." });
    } else {
      subqs.forEach((sq: any, sIdx: number) => {
        if (!sq.text || !sq.text.trim()) {
          errors.push({ field: `question_${sIdx}`, message: `Sub-question ${sIdx + 1} text is required.` });
        }
        const sqOpts = sq.options || [];
        if (sqOpts.length < 2) {
          errors.push({ field: `question_${sIdx}_options`, message: `Sub-question ${sIdx + 1} requires at least 2 options.` });
        }
        const emptySqOpts = sqOpts.some((o: any) => !o.text || !o.text.trim());
        if (emptySqOpts) {
          errors.push({ field: `question_${sIdx}_options`, message: `Sub-question ${sIdx + 1} options cannot be empty.` });
        }
        if (!sq.correctOptionId || !sqOpts.some((o: any) => o.id === sq.correctOptionId)) {
          errors.push({ field: `question_${sIdx}_correct`, message: `Sub-question ${sIdx + 1} correct option selection is missing/invalid.` });
        }
      });
    }
  }

  return errors;
}

// ─── CSV Columns to Question Objects mapping ─────────────────────────────────
function csvToQuestions(rows: string[][], assessmentType: AssessmentType): AnyQuestion[] {
  if (rows.length < 2) return [];
  const rawHeaders = rows[0];
  const headers = rawHeaders.map(h => h.toLowerCase().trim().replace(/[\s_\-()]+/g, ""));
  const dataRows = rows.slice(1);

  return dataRows.map((row, rIdx) => {
    const baseId = generateId() + `_csv_${rIdx}`;
    
    const getValue = (key: string): string => {
      const idx = headers.indexOf(key.toLowerCase().trim().replace(/[\s_\-()]+/g, ""));
      return idx !== -1 ? row[idx] || "" : "";
    };

    const difficulty = (getValue("difficulty").toLowerCase() || "medium") as any;
    const marks = getValue("marks") ? Number(getValue("marks")) : (difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 5);
    const negativeMarks = getValue("negativemarks") ? Number(getValue("negativemarks")) : 0.25;
    const status = (getValue("status").toLowerCase() || "active") as any;
    const explanation = getValue("explanation");
    const imageUrl = getValue("imageurl") || null;
    const rawKind = (getValue("questionkind") || getValue("questiontype") || "mcq").toLowerCase();
    const kind = (["mcq", "msq", "tf", "numerical"].includes(rawKind) ? rawKind : "mcq") as QuestionKind;

    const baseQuestion: any = {
      id: baseId,
      difficulty,
      marks,
      negativeMarks,
      status,
      explanation,
      imageUrl,
      kind,
    };

    switch (assessmentType) {
      case "aptitude": {
        const text = getValue("questiontext");
        const category = getValue("category") || "QA";
        const subcategory = getValue("subcategory");

        const options: QuestionOption[] = [];
        for (let i = 1; i <= 6; i++) {
          const optText = getValue(`option${i}`);
          if (optText) {
            options.push({ id: `opt_${i - 1}`, text: optText });
          }
        }

        const correctIndexStr = getValue("correctoptionindex");
        let correctOptionId = "";
        let correctOptionIds: string[] = [];

        if (kind === "numerical") {
          baseQuestion.correctAnswer = getValue("correctanswer");
        } else if (kind === "msq") {
          const indices = correctIndexStr.split(/[;,]+/).map(x => Number(x.trim()) - 1).filter(idx => !isNaN(idx));
          correctOptionIds = indices.map(idx => options[idx]?.id).filter(Boolean);
          correctOptionId = correctOptionIds[0] || "";
        } else {
          const idx = Number(correctIndexStr.trim()) - 1;
          if (!isNaN(idx) && options[idx]) {
            correctOptionId = options[idx].id;
            correctOptionIds = [correctOptionId];
          }
        }

        return {
          ...baseQuestion,
          category,
          subcategory,
          text,
          options,
          correctOptionId,
          correctOptionIds,
        } as AptitudeQuestion;
      }
      case "mnc": {
        const text = getValue("questiontext");
        const topic = getValue("topic") || "General";

        const options: QuestionOption[] = [];
        for (let i = 1; i <= 6; i++) {
          const optText = getValue(`option${i}`);
          if (optText) {
            options.push({ id: `opt_${i - 1}`, text: optText });
          }
        }

        const correctIndexStr = getValue("correctoptionindex");
        let correctOptionId = "";
        let correctOptionIds: string[] = [];

        if (kind === "msq") {
          const indices = correctIndexStr.split(/[;,]+/).map(x => Number(x.trim()) - 1).filter(idx => !isNaN(idx));
          correctOptionIds = indices.map(idx => options[idx]?.id).filter(Boolean);
          correctOptionId = correctOptionIds[0] || "";
        } else {
          const idx = Number(correctIndexStr.trim()) - 1;
          if (!isNaN(idx) && options[idx]) {
            correctOptionId = options[idx].id;
            correctOptionIds = [correctOptionId];
          }
        }

        return {
          ...baseQuestion,
          topic,
          text,
          options,
          correctOptionId,
          correctOptionIds,
        } as MNCQuestion;
      }
      case "role": {
        const questionType = (getValue("questiontype") || "conceptual") as any;
        const category = getValue("category");
        const subCategory = getValue("subcategory");
        const text = getValue("questiontext");

        const title = getValue("scenariotitle");
        const scenarioContext = getValue("scenariocontext");
        const ticketId = getValue("ticketid");
        const priority = (getValue("priority") || "Medium") as any;
        const reportedBy = getValue("reportedby");

        const options: QuestionOption[] = [];
        for (let i = 1; i <= 6; i++) {
          const optText = getValue(`option${i}`);
          if (optText) {
            options.push({ id: `opt_${i - 1}`, text: optText });
          }
        }

        const correctIndexStr = getValue("correctoptionindex");
        let correctOptionId = "";
        let correctOptionIds: string[] = [];

        if (kind === "msq") {
          const indices = correctIndexStr.split(/[;,]+/).map(x => Number(x.trim()) - 1).filter(idx => !isNaN(idx));
          correctOptionIds = indices.map(idx => options[idx]?.id).filter(Boolean);
          correctOptionId = correctOptionIds[0] || "";
        } else {
          const idx = Number(correctIndexStr.trim()) - 1;
          if (!isNaN(idx) && options[idx]) {
            correctOptionId = options[idx].id;
            correctOptionIds = [correctOptionId];
          }
        }

        return {
          ...baseQuestion,
          questionType,
          category,
          subCategory,
          text,
          options,
          correctOptionId,
          correctOptionIds,
          title,
          scenarioContext,
          ticketId,
          priority,
          reportedBy,
        } as RoleQuestion;
      }
      case "coding": {
        const text = getValue("questiontext");
        const category = getValue("category") || "Algorithms";

        return {
          ...baseQuestion,
          category,
          text,
          kind: "mcq",
        } as CodingQuestion;
      }
      case "communication": {
        const rawType = (getValue("questiontype") || getValue("questionkind") || getValue("tasktype") || "mcq").toLowerCase();
        
        const taskType: any = "mcq";
        let kind = "mcq";
        
        if (rawType === "msq") {
          kind = "msq";
        } else if (rawType === "tf" || rawType === "true/false" || rawType === "true_false") {
          kind = "tf";
        }

        const category = getValue("category") || "General";
        const subcategory = getValue("subcategory");
        const questionText = getValue("questiontext") || getValue("question") || "";
        const explanation = getValue("explanation") || "";

        const options: QuestionOption[] = [];
        for (let i = 1; i <= 6; i++) {
          const optText = getValue(`option${i}`);
          if (optText) {
            options.push({ id: `opt_${i - 1}`, text: optText });
          }
        }

        const correctIndexStr = getValue("correctoptionindex");
        let correctOptionId = "";
        let correctOptionIds: string[] = [];

        if (kind === "msq") {
          const indices = correctIndexStr.split(/[;,]+/).map(x => Number(x.trim()) - 1).filter(idx => !isNaN(idx));
          correctOptionIds = indices.map(idx => options[idx]?.id).filter(Boolean);
          correctOptionId = correctOptionIds[0] || "";
        } else {
          const idx = Number(correctIndexStr.trim()) - 1;
          if (!isNaN(idx) && options[idx]) {
            correctOptionId = options[idx].id;
            correctOptionIds = [correctOptionId];
          }
        }

        const subQuestions: any[] = [{
          id: `sq_${baseId}_0`,
          text: questionText,
          options,
          correctOptionId,
        }];

        return {
          ...baseQuestion,
          kind,
          correctOptionId,
          correctOptionIds,
          taskType,
          category,
          subcategory,
          text: questionText,
          explanation,
          instructions: questionText,
          questions: subQuestions,
        } as any;
      }
    }
  });
}

// ─── Virtualized Question List (renders only visible items) ───────────────────
const ITEM_HEIGHT = 56; // 48px row + 8px gap
const OVERSCAN = 5;

interface VirtualizedQuestionListProps {
  filteredQuestions: AnyQuestion[];
  validationMap: Record<string, ValidationError[]>;
  activeQuestionId: string | null;
  assessmentType: AssessmentType;
  onSelectQuestion: (id: string) => void;
  onDeleteQuestion: (id: string) => void;
}

function VirtualizedQuestionList({
  filteredQuestions,
  validationMap,
  activeQuestionId,
  assessmentType,
  onSelectQuestion,
  onDeleteQuestion,
}: VirtualizedQuestionListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure container height on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    setContainerHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll active item into view when it changes
  useEffect(() => {
    if (!activeQuestionId || !containerRef.current) return;
    const idx = filteredQuestions.findIndex(q => q.id === activeQuestionId);
    if (idx === -1) return;
    const itemTop = idx * ITEM_HEIGHT;
    const itemBottom = itemTop + ITEM_HEIGHT;
    const el = containerRef.current;
    if (itemTop < el.scrollTop) {
      el.scrollTop = itemTop;
    } else if (itemBottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = itemBottom - el.clientHeight;
    }
  }, [activeQuestionId, filteredQuestions]);

  const totalHeight = filteredQuestions.length * ITEM_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(
    filteredQuestions.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  if (filteredQuestions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl h-48 text-center">
          <p className="text-xs font-bold text-slate-400">No questions found in this tab.</p>
        </div>
      </div>
    );
  }

  const visibleItems = [];
  for (let i = startIdx; i < endIdx; i++) {
    const q = filteredQuestions[i];
    const errors = validationMap[q.id] || [];
    const isValid = errors.length === 0;
    const isActive = q.id === activeQuestionId;

    let titleText = (q as any).text || (q as any).instructions || "Untitled Question";
    if (assessmentType === "communication") {
      titleText = (q as CommQuestion).prompt || (q as CommQuestion).instructions;
    }

    visibleItems.push(
      <div
        key={q.id}
        style={{
          position: "absolute",
          top: i * ITEM_HEIGHT,
          left: 0,
          right: 4,
          height: ITEM_HEIGHT - 8,
        }}
        onClick={() => onSelectQuestion(q.id)}
        className={`group relative flex items-center justify-between p-3 pl-4 rounded-xl border cursor-pointer transition-colors overflow-hidden
          ${isActive
            ? "bg-brand-green/10 border-brand-green shadow-sm"
            : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-brand-green/30 hover:bg-brand-green/[0.02]"
          }
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-green rounded-l-xl" />
        )}

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-black
            ${isActive ? "bg-brand-green text-white" : "bg-brand-green/10 text-brand-green"}
          `}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-bold truncate ${isActive ? "text-brand-green" : "text-slate-800 dark:text-white/80"}`}>
              {titleText}
            </p>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              {(q as any).category || (q as any).topic || (q as any).taskType || "General"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isValid ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-brand-green" title="Valid Row">
              <Check size={9} className="stroke-[3]" />
            </div>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-wider border border-red-500/20" title={`${errors.length} validation errors`}>
              Fix
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteQuestion(q.id); }}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            title="Discard question"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto pr-1 custom-scrollbar"
    >
      <div style={{ position: "relative", height: totalHeight, width: "100%" }}>
        {visibleItems}
      </div>
    </div>
  );
}



export default function CsvImportPanel({
  assessmentType,
  allowedQuestionKinds,
  onImport,
  onCancel
}: CsvImportPanelProps) {
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "invalid">("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Drag & Drop Upload States
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing progress state
  const [processing, setProcessing] = useState<{
    active: boolean;
    step: string;
    progress: number;
    total: number;
    unit?: "rows" | "percent";
  }>({ active: false, step: "", progress: 0, total: 0 });

  // Dynamic Validation Map (Question ID -> Validation Errors)
  const validationMap = useMemo<Record<string, ValidationError[]>>(() => {
    const map: Record<string, ValidationError[]> = {};
    questions.forEach(q => {
      map[q.id] = validateQuestionRow(q, assessmentType);
    });
    return map;
  }, [questions, assessmentType]);

  const stats = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    questions.forEach(q => {
      if (validationMap[q.id]?.length === 0) valid++;
      else invalid++;
    });
    return { total: questions.length, valid, invalid };
  }, [questions, validationMap]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const hasErrors = validationMap[q.id]?.length > 0;
      if (activeTab === "valid") return !hasErrors;
      if (activeTab === "invalid") return hasErrors;
      return true;
    });
  }, [questions, activeTab, validationMap]);

  // Set active question when filtered questions list changes
  useEffect(() => {
    if (filteredQuestions.length > 0 && !activeQuestionId) {
      setActiveQuestionId(filteredQuestions[0].id);
    } else if (filteredQuestions.length === 0) {
      setActiveQuestionId(null);
    }
  }, [filteredQuestions, activeQuestionId]);

  const handleCsvParsing = useCallback(async (text: string) => {
    setErrorMsg(null);
    setProcessing({ active: true, step: "Parsing CSV structure...", progress: 0, total: 0, unit: "rows" });

    // Yield to the UI so the overlay renders before heavy work starts
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        throw new Error("CSV file does not contain a header row or data records.");
      }

      const totalDataRows = parsed.length - 1;
      setProcessing({ active: true, step: "Mapping question fields...", progress: 0, total: totalDataRows, unit: "rows" });
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Process in chunks to keep UI responsive
      const CHUNK_SIZE = 200;
      const headerRow = parsed[0];
      const dataRows = parsed.slice(1);
      const allMapped: AnyQuestion[] = [];

      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
        const chunk = dataRows.slice(i, i + CHUNK_SIZE);
        const chunkWithHeader = [headerRow, ...chunk];
        const mapped = csvToQuestions(chunkWithHeader, assessmentType);
        allMapped.push(...mapped);

        const processed = Math.min(i + CHUNK_SIZE, dataRows.length);
        setProcessing({
          active: true,
          step: `Processing questions (${processed.toLocaleString()} / ${totalDataRows.toLocaleString()})...`,
          progress: processed,
          total: totalDataRows,
          unit: "rows",
        });

        // Yield to the browser to repaint progress
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      if (allMapped.length === 0) {
        throw new Error("No valid question records could be resolved from CSV.");
      }

      setProcessing({ active: true, step: "Running validations...", progress: totalDataRows, total: totalDataRows, unit: "rows" });
      await new Promise(resolve => requestAnimationFrame(resolve));

      setQuestions(allMapped);
      if (allMapped.length > 0) {
        setActiveQuestionId(allMapped[0].id);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed parsing CSV. Check file structure.");
    } finally {
      setProcessing({ active: false, step: "", progress: 0, total: 0 });
    }
  }, [assessmentType]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleCsvParsing(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".csv")) {
        handleFile(file);
      } else {
        alert("Invalid file format. Please upload a .csv file.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith(".csv")) {
        handleFile(file);
      } else {
        alert("Invalid file format. Please upload a .csv file.");
      }
    }
  };

  // Dynamic Template Downloader
  const downloadTemplate = () => {
    const headers = getCsvHeaders(assessmentType);
    const rows = getCsvSampleRows(assessmentType);
    
    const escapeCsvCell = (val: string) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(escapeCsvCell).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `originbi_${assessmentType}_questions_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeQuestion = useMemo<any>(() => {
    return questions.find(q => q.id === activeQuestionId) || null;
  }, [questions, activeQuestionId]);

  const updateActiveQuestion = useCallback((updates: Partial<AnyQuestion>) => {
    if (!activeQuestionId) return;
    setQuestions(prev => prev.map(q => {
      if (q.id === activeQuestionId) {
        return { ...q, ...updates } as AnyQuestion;
      }
      return q;
    }));
  }, [activeQuestionId]);

  const handleDeleteQuestion = (id: string) => {
    const nextIdx = questions.findIndex(q => q.id === id);
    const filtered = questions.filter(q => q.id !== id);
    setQuestions(filtered);
    
    if (activeQuestionId === id) {
      if (filtered.length === 0) {
        setActiveQuestionId(null);
      } else {
        const indexToSelect = Math.min(nextIdx, filtered.length - 1);
        setActiveQuestionId(filtered[indexToSelect].id);
      }
    }
  };

  const handleFinishImport = async () => {
    if (stats.invalid > 0) {
      alert("Please fix all validation errors before importing.");
      return;
    }

    const total = questions.length;

    setProcessing({
      active: true,
      step: `Preparing ${total.toLocaleString()} questions for database ingestion...`,
      progress: 0,
      total,
      unit: "rows"
    });

    try {
      // Short delay for smooth UI transition
      await new Promise(resolve => setTimeout(resolve, 300));

      await onImport(questions, (p: ChunkedImportProgress) => {
        setProcessing({
          active: true,
          step: `Importing questions... Batch ${p.chunkIndex + 1} of ${p.totalChunks} complete. Please do not close this tab.`,
          progress: p.imported,
          total: p.total,
          unit: "rows"
        });
      });

      setProcessing({
        active: true,
        step: "Refreshing assessment configuration and inventory...",
        progress: total,
        total,
        unit: "rows"
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setProcessing({ active: false, step: "", progress: 0, total: 0 });
    }
  };

  const currentErrors = useMemo(() => {
    if (!activeQuestionId) return [];
    return validationMap[activeQuestionId] || [];
  }, [activeQuestionId, validationMap]);

  const getFieldError = (fieldName: string) => {
    return currentErrors.find(err => err.field === fieldName)?.message;
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Non-Glassmorphic Application Theme Progress Overlay */}
      {processing.active && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b100d]/80 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md mx-4 border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl"
            style={{ backgroundColor: "var(--admin-bg-soft)" }}
          >
            {/* Spinner */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-[3px] border-slate-100 dark:border-white/5" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-brand-green animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-brand-green" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-center text-base font-bold text-slate-900 dark:text-white mb-1">
              Processing Questions
            </h3>
            <p className="text-center text-xs font-semibold text-slate-500 dark:text-white/40 mb-6">
              {processing.step}
            </p>

            {/* Progress Bar */}
            {processing.total > 0 && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.round((processing.progress / processing.total) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">
                    {processing.unit === "percent" ? (
                      ""
                    ) : (
                      `${processing.progress.toLocaleString()} / ${processing.total.toLocaleString()} rows`
                    )}
                  </span>
                  <span className="text-[10px] font-black text-brand-green">
                    {Math.round((processing.progress / processing.total) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Indeterminate pulse for steps without numeric progress */}
            {processing.total === 0 && (
              <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-brand-green to-emerald-400 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        // ─── UPLOAD VIEW ─────────────────────────────────────────────────────────────
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[#150089] dark:text-white">Bulk Import Questions</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-white/40">
                Upload your questions spreadsheet in CSV format for the <span className="text-brand-green font-bold">{assessmentType}</span> assessment.
              </p>
            </div>
            <button 
              onClick={downloadTemplate} 
              className="flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-brand-green/90 group shadow-sm hover:shadow"
            >
              <Download size={14} className="group-hover:scale-110 transition-transform" /> 
              Download Sample
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 h-80 bg-white/40 dark:bg-white/[0.01] backdrop-blur-sm
              ${isDragActive ? "border-brand-green bg-brand-green/5" : "border-slate-300 dark:border-white/10 hover:border-brand-green/50 hover:bg-slate-50 dark:hover:bg-white/[0.02]"}
              ${errorMsg ? "border-red-500/50 bg-red-500/5" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-4 text-brand-green">
              <FileSpreadsheet size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1.5">Drag & Drop your CSV file here</h3>
            <p className="text-xs font-semibold text-slate-400">or click to browse local files (Accepts only .csv format)</p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 animate-in shake duration-500">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-500 mb-1 leading-none">CSV Error</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={onCancel} 
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // ─── SPLIT REVIEW & LIVE EDIT VIEW ──────────────────────────────────────────
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-brand-green/[0.04] border border-brand-green/20 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-brand-green" />
                <h3 className="text-lg font-bold tracking-tight text-[#150089] dark:text-white">
                  Review & Interactive Fix
                </h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-white/40">
                Found <span className="text-brand-green font-extrabold">{stats.total} records</span>. Correct outstanding issues below in real time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setQuestions([])} 
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                Re-upload CSV
              </button>
              <button 
                onClick={handleFinishImport}
                disabled={stats.invalid > 0}
                className="px-5 py-2 rounded-lg bg-brand-green text-xs font-bold text-white hover:bg-brand-green/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Import All ({stats.valid}/{stats.total} Valid)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-240px)] min-h-[550px]">
            
            {/* ─── LEFT SIDEBAR: QUESTION LISTING (4 Cols) ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3 h-full overflow-hidden">
              {/* Tab Toggles */}
              <div className="flex bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-1 shrink-0">
                {(["all", "valid", "invalid"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold transition-all duration-300
                      ${activeTab === tab 
                        ? "bg-brand-green text-white shadow-sm" 
                        : "text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      }
                    `}
                  >
                    {tab === "all" ? "All" : tab === "valid" ? "Valid" : "Invalid"} ({tab === "all" ? stats.total : tab === "valid" ? stats.valid : stats.invalid})
                  </button>
                ))}
              </div>

              {/* Virtualized Roster list */}
              <VirtualizedQuestionList
                filteredQuestions={filteredQuestions}
                validationMap={validationMap}
                activeQuestionId={activeQuestionId}
                assessmentType={assessmentType}
                onSelectQuestion={setActiveQuestionId}
                onDeleteQuestion={handleDeleteQuestion}
              />
            </div>

            {/* ─── RIGHT PANEL: LIVE QUESTION FIELD EDITOR (8 Cols) ─── */}
            <div className="lg:col-span-8 flex flex-col border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/[0.01] backdrop-blur-md h-full">
              {activeQuestion ? (
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  {/* Alert Error Box */}
                  {currentErrors.length > 0 && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-4 shrink-0 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-red-500 mb-1.5 leading-none">
                          Validation Failures ({currentErrors.length})
                        </h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {currentErrors.map((err, i) => (
                            <li key={i} className="text-sm font-bold text-red-600 dark:text-red-400">
                              {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Scrollable Fields */}
                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="flex flex-col gap-5">
                      
                      {/* Section: Core Parameters */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-white/5">
                          <Edit3 size={13} className="text-brand-green" />
                          <h4 className="text-[10px] font-black tracking-wider text-slate-500 dark:text-white/40">Core Configuration</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Category / Topic Dropdowns/Inputs */}
                          {assessmentType === "aptitude" && (
                            <div className="w-full">
                              <CustomSelect
                                label="Aptitude Category"
                                value={(activeQuestion as AptitudeQuestion).category || "QA"}
                                onChange={(val) => updateActiveQuestion({ category: val })}
                                options={APTITUDE_CATEGORIES.map(c => ({
                                  label: APTITUDE_CATEGORY_LABELS[c] || c,
                                  value: c
                                }))}
                              />
                              {getFieldError("category") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("category")}</p>
                              )}
                            </div>
                          )}

                          {assessmentType === "mnc" && (
                            <div className="w-full">
                              <CustomSelect
                                label="MNC Prep Topic"
                                value={(activeQuestion as MNCQuestion).topic || "General"}
                                onChange={(val) => updateActiveQuestion({ topic: val })}
                                options={MNC_TOPICS.map(t => ({
                                  label: t,
                                  value: t
                                }))}
                              />
                              {getFieldError("topic") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("topic")}</p>
                              )}
                            </div>
                          )}

                          {assessmentType === "role" && (
                            <div className="w-full">
                              <CustomSelect
                                label="Role Question Type"
                                value={(activeQuestion as RoleQuestion).questionType || "conceptual"}
                                onChange={(val) => updateActiveQuestion({ questionType: val as any })}
                                options={[
                                  { label: "Conceptual", value: "conceptual" },
                                  { label: "Scenario", value: "scenario" }
                                ]}
                              />
                              {getFieldError("questionType") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("questionType")}</p>
                              )}
                            </div>
                          )}

                          {assessmentType === "communication" && (
                            <div className="w-full">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                              <input
                                type="text"
                                value={(activeQuestion as any).category || ""}
                                onChange={(e) => updateActiveQuestion({ category: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                                placeholder="e.g. Verbal Communication"
                              />
                              {getFieldError("category") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("category")}</p>
                              )}
                            </div>
                          )}

                          {/* Subcategory */}
                          {(assessmentType === "aptitude" || assessmentType === "role" || assessmentType === "communication") && (
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Subcategory</label>
                              <input
                                type="text"
                                value={(activeQuestion as any).subcategory || (activeQuestion as any).subCategory || ""}
                                onChange={(e) => updateActiveQuestion(assessmentType === "role" ? { subCategory: e.target.value } : { subcategory: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                                placeholder="e.g. REST API, Fractions..."
                              />
                              {getFieldError("subcategory") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("subcategory")}</p>
                              )}
                            </div>
                          )}

                          {/* Difficulty Selector */}
                          <div>
                            <CustomSelect
                              label="Difficulty"
                              value={activeQuestion.difficulty || "medium"}
                              onChange={(val) => {
                                const d = val as any;
                                const marks = d === "easy" ? 1 : d === "medium" ? 2 : 5;
                                updateActiveQuestion({ difficulty: d, marks });
                              }}
                              options={[
                                { label: "Easy (1 Mark)", value: "easy" },
                                { label: "Medium (2 Marks)", value: "medium" },
                                { label: "Hard (5 Marks)", value: "hard" }
                              ]}
                            />
                            {getFieldError("difficulty") && (
                              <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("difficulty")}</p>
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            <CustomSelect
                              label="Status"
                              value={activeQuestion.status || "active"}
                              onChange={(val) => updateActiveQuestion({ status: val as any })}
                              options={[
                                { label: "Active", value: "active" },
                                { label: "Inactive", value: "inactive" }
                              ]}
                            />
                            {getFieldError("status") && (
                              <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("status")}</p>
                            )}
                          </div>

                          {/* Question Format */}
                          {assessmentType !== "coding" && assessmentType !== "communication" && (
                            <div className="md:col-span-2">
                              <CustomSelect
                                className="w-full"
                                label="Question Kind"
                                value={activeQuestion.kind || "mcq"}
                                onChange={(val) => {
                                  const newKind = val as QuestionKind;
                                  let opts = activeQuestion.options || [];
                                  let correctId = activeQuestion.correctOptionId || "";
                                  let correctIds = activeQuestion.correctOptionIds || [];
                                  
                                  if (newKind === "tf") {
                                    opts = [{ id: "opt_true", text: "True" }, { id: "opt_false", text: "False" }];
                                    correctId = "opt_true";
                                    correctIds = ["opt_true"];
                                  } else if (newKind === "numerical") {
                                    opts = [];
                                    correctId = "";
                                    correctIds = [];
                                  } else if (activeQuestion.kind === "tf" || activeQuestion.kind === "numerical") {
                                    opts = [
                                      { id: "opt_0", text: "" }, { id: "opt_1", text: "" },
                                      { id: "opt_2", text: "" }, { id: "opt_3", text: "" }
                                    ];
                                    correctId = "opt_0";
                                    correctIds = ["opt_0"];
                                  }
                                  
                                  updateActiveQuestion({ kind: newKind, options: opts, correctOptionId: correctId, correctOptionIds: correctIds });
                                }}
                                options={allowedQuestionKinds.map(k => ({
                                  label: String(k).toUpperCase(),
                                  value: String(k)
                                }))}
                              />
                              {getFieldError("kind") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("kind")}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section: Scenario Specific Fields (Role Case Studies) */}
                      {assessmentType === "role" && (activeQuestion as RoleQuestion).questionType === "scenario" && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 space-y-4 animate-in fade-in duration-300">
                          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-white/5">
                            <AlertCircle size={13} className="text-brand-green" />
                            <h4 className="text-[10px] font-black tracking-wider text-slate-500 dark:text-white/40">Scenario Case Context</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Scenario Title</label>
                              <input
                                type="text"
                                value={(activeQuestion as RoleQuestion).title || ""}
                                onChange={(e) => updateActiveQuestion({ title: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                placeholder="e.g. Critical DB Failure..."
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Scenario Details/Context</label>
                              <textarea
                                value={(activeQuestion as RoleQuestion).scenarioContext || ""}
                                onChange={(e) => updateActiveQuestion({ scenarioContext: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white h-20 resize-none focus:outline-none"
                                placeholder="Describe the incident, parameters, and business impact..."
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Ticket ID</label>
                              <input
                                type="text"
                                value={(activeQuestion as RoleQuestion).ticketId || ""}
                                onChange={(e) => updateActiveQuestion({ ticketId: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                placeholder="e.g. INC-8942"
                              />
                            </div>
                            <CustomSelect
                              label="Priority"
                              value={(activeQuestion as RoleQuestion).priority || "Medium"}
                              onChange={(val) => updateActiveQuestion({ priority: val as any })}
                              options={["Low", "Medium", "High", "Critical"].map(p => ({
                                label: p,
                                value: p
                              }))}
                            />
                          </div>
                        </div>
                      )}

                      {/* Section: Question Contents */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-white/5">
                          <HelpCircle size={13} className="text-brand-green" />
                          <h4 className="text-[10px] font-black tracking-wider text-slate-500 dark:text-white/40">Question Material</h4>
                        </div>

                        {/* Main Question / Instructions textareas */}
                        {assessmentType === "communication" && false ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Direct Instructions</label>
                              <textarea
                                value={(activeQuestion as CommQuestion).instructions || ""}
                                onChange={(e) => updateActiveQuestion({ instructions: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white h-20 resize-none focus:outline-none"
                                placeholder="Explain what the candidate must do..."
                              />
                            </div>
                            
                            {(activeQuestion as CommQuestion).taskType === "reading" && (
                              <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Reading Passage</label>
                                <textarea
                                  value={(activeQuestion as CommQuestion).passage || ""}
                                  onChange={(e) => updateActiveQuestion({ passage: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white h-32 resize-none focus:outline-none font-mono text-xs"
                                  placeholder="Paste the passage body here..."
                                />
                              </div>
                            )}

                            {["speaking", "writing"].includes((activeQuestion as CommQuestion).taskType) && (
                              <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Core Prompt</label>
                                <textarea
                                  value={(activeQuestion as CommQuestion).prompt || ""}
                                  onChange={(e) => updateActiveQuestion({ prompt: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white h-24 resize-none focus:outline-none"
                                  placeholder="Draft the discussion topic or query prompt..."
                                />
                              </div>
                            )}

                            {(activeQuestion as CommQuestion).taskType === "speaking" && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Preparation Time (Sec)</label>
                                  <input
                                    type="number"
                                    value={(activeQuestion as CommQuestion).prepTimeSeconds || 0}
                                    onChange={(e) => updateActiveQuestion({ prepTimeSeconds: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Recording Limit (Sec)</label>
                                  <input
                                    type="number"
                                    value={(activeQuestion as CommQuestion).recordTimeSeconds || 0}
                                    onChange={(e) => updateActiveQuestion({ recordTimeSeconds: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}

                            {(activeQuestion as CommQuestion).taskType === "writing" && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Min Words Required</label>
                                  <input
                                    type="number"
                                    value={(activeQuestion as CommQuestion).minWords || 0}
                                    onChange={(e) => updateActiveQuestion({ minWords: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Max Words Limit</label>
                                  <input
                                    type="number"
                                    value={(activeQuestion as CommQuestion).maxWords || 0}
                                    onChange={(e) => updateActiveQuestion({ maxWords: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Standard Assessment Types Questions Text
                          <div className="space-y-4">
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Question Body Text</label>
                              <textarea
                                value={(activeQuestion as any).text || ""}
                                onChange={(e) => updateActiveQuestion({ text: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white h-24 resize-none focus:outline-none"
                                placeholder="Enter the query or problem statement..."
                              />
                              {getFieldError("text") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("text")}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Explanation (Help Reference)</label>
                              <textarea
                                value={activeQuestion.explanation || ""}
                                onChange={(e) => updateActiveQuestion({ explanation: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 text-[12px] font-bold text-slate-900 dark:text-white h-20 resize-none focus:outline-none"
                                placeholder="Explain the rationale behind the correct solution..."
                              />
                              {getFieldError("explanation") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("explanation")}</p>
                              )}
                            </div>
                            {/* Question Image Upload (Task 7) */}
                            <div className="space-y-1.5 mt-4">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Question Image (Optional)</label>
                              {activeQuestion.imageUrl ? (
                                <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-video max-h-40 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
                                  <img src={activeQuestion.imageUrl} alt="Question Asset" className="max-h-full max-w-full object-contain" />
                                  <button
                                    type="button"
                                    onClick={() => updateActiveQuestion({ imageUrl: "" })}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all shadow-md"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-white/[0.01] hover:border-slate-400 dark:hover:border-white/20 cursor-pointer transition-all">
                                  <UploadCloud className="h-6 w-6 text-brand-green mb-1.5" />
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-white/60">Choose image file</span>
                                  <span className="text-[9px] font-medium text-slate-400 mt-0.5">Supports PNG, JPG or WebP</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        const res = await uploadQuestionAsset(assessmentType, file);
                                        updateActiveQuestion({ imageUrl: res.url });
                                      } catch (err) {
                                        alert((err as Error).message || "Failed to upload image");
                                      }
                                    }} 
                                    className="hidden" 
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section: Options & Correctness */}
                      {assessmentType !== "coding" && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-brand-green" />
                              <h4 className="text-[10px] font-black tracking-wider text-slate-500 dark:text-white/40">
                                {activeQuestion.kind === "numerical" ? "Numerical Rationale" : "Options & Key"}
                              </h4>
                            </div>
                            {activeQuestion.kind !== "tf" && activeQuestion.kind !== "numerical" && assessmentType !== "communication" && (activeQuestion.options || []).length < 6 && (
                              <button
                                onClick={() => {
                                  const currentOpts = activeQuestion.options || [];
                                  updateActiveQuestion({
                                    options: [...currentOpts, { id: `opt_${Date.now()}`, text: "" }]
                                  });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green/90 text-xs font-bold transition-all shadow-sm"
                              >
                                + Add Option
                              </button>
                            )}
                          </div>

                          {activeQuestion.kind === "numerical" ? (
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Expected Numerical Value</label>
                              <input
                                type="text"
                                value={activeQuestion.correctAnswer || ""}
                                onChange={(e) => updateActiveQuestion({ correctAnswer: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 text-[12px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                placeholder="e.g. 25, 3.14..."
                              />
                              {getFieldError("correctAnswer") && (
                                <p className="text-[11px] font-bold text-red-500 mt-1">{getFieldError("correctAnswer")}</p>
                              )}
                            </div>
                          ) : assessmentType === "communication" && ["mcq", "reading", "audio"].includes((activeQuestion as CommQuestion).taskType) ? (
                            // Communication Sub-Questions listing
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Sub-Questions</span>
                                <button
                                  onClick={() => {
                                    const subqs = (activeQuestion as CommQuestion).questions || [];
                                    const sqId = `sq_${Date.now()}`;
                                    const sqOpts = [
                                      { id: `${sqId}_o0`, text: "" }, { id: `${sqId}_o1`, text: "" },
                                      { id: `${sqId}_o2`, text: "" }, { id: `${sqId}_o3`, text: "" }
                                    ];
                                    updateActiveQuestion({
                                      questions: [...subqs, { id: sqId, text: "", options: sqOpts, correctOptionId: sqOpts[0].id }]
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green/90 text-xs font-bold transition-all shadow-sm"
                                >
                                  + Add Question
                                </button>
                              </div>

                              <div className="space-y-4">
                                {((activeQuestion as CommQuestion).questions || []).map((sq, sqIdx) => (
                                  <div key={sq.id} className="rounded-xl border border-brand-green/10 bg-white dark:bg-black/10 p-3 shadow-inner space-y-3">
                                    <div className="flex items-start gap-2.5">
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-green text-[9px] font-black text-white">
                                        {sqIdx + 1}
                                      </span>
                                      <textarea
                                        value={sq.text}
                                        onChange={(e) => {
                                          const subqs = [...((activeQuestion as CommQuestion).questions || [])];
                                          subqs[sqIdx] = { ...subqs[sqIdx], text: e.target.value };
                                          updateActiveQuestion({ questions: subqs });
                                        }}
                                        className="flex-1 bg-transparent text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none resize-none"
                                        rows={1}
                                        placeholder="Sub-question inquiry text..."
                                      />
                                      <button
                                        onClick={() => {
                                          const subqs = ((activeQuestion as CommQuestion).questions || []).filter((_, i: number) => i !== sqIdx);
                                          updateActiveQuestion({ questions: subqs });
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {sq.options.map((opt, oIdx) => {
                                        const isCorrect = sq.correctOptionId === opt.id;
                                        return (
                                          <div key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isCorrect ? "bg-brand-green/5 border-brand-green/30" : "bg-transparent border-slate-200 dark:border-white/5"}`}>
                                            <button
                                              onClick={() => {
                                                const subqs = [...((activeQuestion as CommQuestion).questions || [])];
                                                subqs[sqIdx] = { ...subqs[sqIdx], correctOptionId: opt.id };
                                                updateActiveQuestion({ questions: subqs });
                                              }}
                                              className={`h-5 w-5 rounded flex items-center justify-center text-[9px] font-black ${isCorrect ? "bg-brand-green text-white" : "bg-brand-green/10 text-brand-green"}`}
                                            >
                                              {String.fromCharCode(65 + oIdx)}
                                            </button>
                                            <input
                                              type="text"
                                              value={opt.text}
                                              onChange={(e) => {
                                                const subqs = [...((activeQuestion as CommQuestion).questions || [])];
                                                const opts = [...subqs[sqIdx].options];
                                                opts[oIdx] = { ...opts[oIdx], text: e.target.value };
                                                subqs[sqIdx] = { ...subqs[sqIdx], options: opts };
                                                updateActiveQuestion({ questions: subqs });
                                              }}
                                              className="flex-1 bg-transparent text-[11px] font-bold text-slate-800 dark:text-white/80 focus:outline-none"
                                              placeholder={`Option ${oIdx + 1}`}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // Standard MCQs / MSQs / TrueFalse options
                            <div className="space-y-3">
                              {((activeQuestion.options || []) as QuestionOption[]).map((opt: QuestionOption, oIdx: number) => {
                                const isMsq = activeQuestion.kind === "msq";
                                const isCorrect = isMsq 
                                  ? (activeQuestion.correctOptionIds || []).includes(opt.id)
                                  : activeQuestion.correctOptionId === opt.id;

                                return (
                                  <div 
                                    key={opt.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300
                                      ${isCorrect 
                                        ? "bg-brand-green/5 border-brand-green/30" 
                                        : "bg-white dark:bg-white/[0.01] border-slate-200 dark:border-white/5 hover:border-brand-green/10"
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <button
                                        onClick={() => {
                                          if (isMsq) {
                                            const currentIds = activeQuestion.correctOptionIds || [];
                                            const nextIds = currentIds.includes(opt.id)
                                              ? currentIds.filter((id: string) => id !== opt.id)
                                              : [...currentIds, opt.id];
                                            updateActiveQuestion({ correctOptionIds: nextIds, correctOptionId: nextIds[0] || "" });
                                          } else {
                                            updateActiveQuestion({ correctOptionId: opt.id, correctOptionIds: [opt.id] });
                                          }
                                        }}
                                        className={`h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black transition-all
                                          ${isCorrect 
                                            ? "bg-brand-green text-white shadow-sm" 
                                            : "bg-brand-green/10 text-brand-green hover:bg-brand-green/20"
                                          }
                                        `}
                                      >
                                        {String.fromCharCode(65 + oIdx)}
                                      </button>
                                      
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => {
                                          const nextOpts = [...(activeQuestion.options || [])];
                                          nextOpts[oIdx] = { ...nextOpts[oIdx], text: e.target.value };
                                          updateActiveQuestion({ options: nextOpts });
                                        }}
                                        disabled={activeQuestion.kind === "tf"}
                                        className="flex-1 bg-transparent text-[12px] font-bold text-slate-800 dark:text-white/80 focus:outline-none disabled:opacity-60"
                                        placeholder={`Option ${oIdx + 1} value`}
                                      />
                                    </div>

                                    {activeQuestion.kind !== "tf" && (activeQuestion.options || []).length > 2 && (
                                      <button
                                        onClick={() => {
                                          const nextOpts = ((activeQuestion.options || []) as QuestionOption[]).filter((_: any, i: number) => i !== oIdx);
                                          let correctId = activeQuestion.correctOptionId || "";
                                          let correctIds = activeQuestion.correctOptionIds || [];
                                          if (correctId === opt.id) {
                                            correctId = nextOpts[0]?.id || "";
                                            correctIds = [correctId];
                                          }
                                          updateActiveQuestion({ options: nextOpts, correctOptionId: correctId, correctOptionIds: correctIds });
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                                        title="Delete option"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {(getFieldError("options") || getFieldError("correctOptionId") || getFieldError("correctOptionIds")) && (
                                <p className="text-[11px] font-bold text-red-500 mt-2">
                                  {getFieldError("options") || getFieldError("correctOptionId") || getFieldError("correctOptionIds")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <Edit3 size={32} className="opacity-40 mb-3" />
                  <p className="text-xs font-bold">Select a question from the roster to begin editing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
