import { AnyQuestion, AssessmentType, QuestionMode } from "./types";

function getKey(assessmentType: AssessmentType, mode: QuestionMode): string {
  return `admin_${assessmentType}_questions_${mode}`;
}

export function loadQuestions(assessmentType: AssessmentType, mode: QuestionMode): AnyQuestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey(assessmentType, mode));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuestions(assessmentType: AssessmentType, mode: QuestionMode, questions: AnyQuestion[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKey(assessmentType, mode), JSON.stringify(questions));
}

export function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
