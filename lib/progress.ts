"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssessmentId } from "./exams";

/* ────────────────────────────
   User Profile (name, etc.)
   ──────────────────────────── */

const PROFILE_KEY = "originbi:user-profile";

export interface UserProfile {
  name: string;
  email?: string;
  joinedAt: string;
}

const readProfile = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(() => readProfile());

  const setName = useCallback((name: string, email?: string) => {
    const next: UserProfile = {
      name: name.trim() || "Student",
      email,
      joinedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setProfile(next);
  }, []);

  const clearProfile = useCallback(() => {
    window.localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
  }, []);

  return { profile, setName, clearProfile };
}

/* ────────────────────────────
   Assessment Results
   ──────────────────────────── */

const RESULTS_KEY = "originbi:assessment-results";

export interface SectionResult {
  name: string;
  score: number; // 0-100
  weight: string;
}

export interface AssessmentResult {
  assessmentId: AssessmentId;
  completedAt: string;
  overallScore: number; // 0-100
  accuracy: number;
  timeTaken: string; // e.g. "48 min"
  sections: SectionResult[];
  insights: { type: "strength" | "improvement" | "time"; text: string }[];
  archetypeSnapshot?: string; // e.g. "Analytical Thinker"
}

const readResults = (): Record<string, AssessmentResult> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const writeResults = (data: Record<string, AssessmentResult>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("originbi:results-changed"));
};

export function useAssessmentResults() {
  const [results, setResults] = useState<Record<string, AssessmentResult>>(() => readResults());

  useEffect(() => {
    const sync = () => setResults(readResults());
    window.addEventListener("storage", sync);
    window.addEventListener("originbi:results-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("originbi:results-changed", sync);
    };
  }, []);

  const saveResult = useCallback((result: AssessmentResult) => {
    const next = readResults();
    next[result.assessmentId] = result;
    writeResults(next);
    setResults(next);
  }, []);

  const isCompleted = useCallback(
    (id: AssessmentId) => !!results[id],
    [results]
  );

  const getResult = useCallback(
    (id: AssessmentId) => results[id] || null,
    [results]
  );

  const completedIds = useCallback(
    () => Object.keys(results) as AssessmentId[],
    [results]
  );

  const clearResult = useCallback((id: AssessmentId) => {
    const next = readResults();
    delete next[id];
    writeResults(next);
    setResults(next);
  }, []);

  return { results, saveResult, isCompleted, getResult, completedIds, clearResult };
}

/* ────────────────────────────
   Career Identity Deriver
   ──────────────────────────── */

export interface CareerIdentity {
  archetype: string;
  subtitle: string;
  level: string;
  xp: number;
  xpToNext: number;
  badges: string[];
  quote: string;
}

const ARCHETYPES: Record<string, CareerIdentity> = {
  "analytical-thinker": {
    archetype: "Analytical Thinker",
    subtitle: "Driven by logic and data patterns",
    level: "Core Path: Aptitude+",
    xp: 850,
    xpToNext: 2000,
    badges: ["Aptitude Clear", "Logic Elite"],
    quote: "Strong numerical reasoning suggests high potential in data-driven roles.",
  },
  "business-communicator": {
    archetype: "Business Communicator",
    subtitle: "Articulate and empathetic leader",
    level: "Core Path: Communication+",
    xp: 1200,
    xpToNext: 2400,
    badges: ["Aptitude Clear", "Comm Clear", "Team Bridge"],
    quote: "Your clarity in expression positions you for client-facing and leadership tracks.",
  },
  "technical-problem-solver": {
    archetype: "Technical Problem Solver",
    subtitle: "Code-first builder with solid foundations",
    level: "Technical Path: Builder",
    xp: 1600,
    xpToNext: 3200,
    badges: ["Aptitude Clear", "Code Ready", "Debug Master"],
    quote: "Strong interplay between logic and syntax predicts success in engineering roles.",
  },
  "systems-architect": {
    archetype: "Systems Architect",
    subtitle: "Big-picture technologist",
    level: "Technical Path: Advanced",
    xp: 2100,
    xpToNext: 4000,
    badges: ["Aptitude Clear", "Comm Clear", "DSA Strong", "System Thinker"],
    quote: "Breadth across core and technical assessments signals architecture potential.",
  },
  "creative-leader": {
    archetype: "Creative Leader",
    subtitle: "Visionary with execution discipline",
    level: "Career Path: Emerging Leader",
    xp: 2800,
    xpToNext: 5000,
    badges: ["Aptitude Clear", "Comm Clear", "Code Ready", "Role Fit"],
    quote: "Your profile spans quant, communication, and judgement — rare full-spectrum readiness.",
  },
  "full-spectrum-professional": {
    archetype: "Full Spectrum Professional",
    subtitle: "Industry-ready across all dimensions",
    level: "Career Path: Expert",
    xp: 3600,
    xpToNext: 6000,
    badges: ["Aptitude Clear", "Comm Clear", "Code Ready", "MNC Ready", "Role Fit"],
    quote: "You demonstrate elite readiness across every track Origin BI measures.",
  },
};

export function deriveCareerIdentity(completedIds: AssessmentId[]): CareerIdentity {
  const set = new Set(completedIds);
  const hasApt = set.has("aptitude");
  const hasComm = set.has("communication");
  const hasCode = set.has("coding");
  const hasMnc = set.has("mnc");
  const hasRole = set.has("role");

  if (hasApt && hasComm && hasCode && hasMnc && hasRole) return ARCHETYPES["full-spectrum-professional"];
  if (hasApt && hasComm && hasCode && hasRole) return ARCHETYPES["creative-leader"];
  if (hasApt && hasComm && hasCode) return ARCHETYPES["systems-architect"];
  if (hasApt && hasCode) return ARCHETYPES["technical-problem-solver"];
  if (hasApt && hasComm) return ARCHETYPES["business-communicator"];
  if (hasApt) return ARCHETYPES["analytical-thinker"];

  return {
    archetype: "Explorer",
    subtitle: "Begin your journey",
    level: "Newcomer",
    xp: 0,
    xpToNext: 1000,
    badges: ["Origin Rookie"],
    quote: "Every expert was once a beginner. Start with Aptitude to unlock your career identity.",
  };
}
