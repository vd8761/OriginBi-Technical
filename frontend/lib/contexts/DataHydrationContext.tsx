"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { 
  getActiveEmail, 
  getPurchasedAssessments, 
  getLatestSubmittedResult,
  listAssignments,
  HAS_TECH_API 
} from "@/lib/api";
import { EXAMS, type AssessmentId } from "@/lib/exams";
import type { AssessmentResult } from "@/lib/progress";

interface DataHydrationContextType {
  isSyncing: boolean;
  isInitialized: boolean;
  purchases: Set<string>;
  completions: Set<string>;
  results: Record<string, AssessmentResult>;
  refresh: () => Promise<void>;
}

const DataHydrationContext = createContext<DataHydrationContextType | undefined>(undefined);

const PAID_KEY = "originbi:paid-assessments";
const COMPLETED_KEY = "originbi:completed-assessments";
const RESULTS_KEY = "originbi:assessment-results";

export function DataHydrationProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, AssessmentResult>>({});

  const readFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    
    try {
      const p = localStorage.getItem(PAID_KEY);
      if (p) setPurchases(new Set(JSON.parse(p)));

      const c = localStorage.getItem(COMPLETED_KEY);
      if (c) setCompletions(new Set(JSON.parse(c)));

      const r = localStorage.getItem(RESULTS_KEY);
      if (r) setResults(JSON.parse(r));
    } catch (err) {
      console.error("[DataHydration] Storage read error:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!HAS_TECH_API) return;
    const email = getActiveEmail();
    if (!email) return;

    setIsSyncing(true);
    try {
      // 1. Sync Purchases (Tech API + Exam Engine)
      const [{ purchased }, { assignments }] = await Promise.all([
        getPurchasedAssessments(email),
        listAssignments()
      ]);
      const nextPurchases = new Set(purchased);
      (assignments ?? []).forEach(a => {
        if (a.assignmentRef && (a.status === 'active' || a.status === 'completed' || a.completed)) {
          nextPurchases.add(a.assignmentRef);
        }
      });

      setPurchases(nextPurchases);
      localStorage.setItem(PAID_KEY, JSON.stringify(Array.from(nextPurchases)));
      window.dispatchEvent(new CustomEvent("originbi:paid-changed"));

      // 2. Sync Results
      // We fetch results for all core modules to catch trial completions 
      // and handle cases where purchase sync might be slightly delayed.
      const modules: AssessmentId[] = ["aptitude", "communication", "mnc", "role", "coding"];
      const nextResults: Record<string, AssessmentResult> = { ...results };
      const nextCompletions = new Set(completions);
      let resultsChanged = false;
      let completionsChanged = false;

      await Promise.all(
        modules.map(async (module) => {
          try {
            const submission = await getLatestSubmittedResult(module, email);
            const { mapSubmissionToAssessmentResult } = await import("@/lib/assessmentResultMapper");
            const result = mapSubmissionToAssessmentResult({
              assessmentId: module,
              submission: submission as any,
            });

            nextResults[module] = result;
            resultsChanged = true;
            
            if (!nextCompletions.has(module)) {
              nextCompletions.add(module);
              completionsChanged = true;
            }
          } catch (err: any) {
            // Silence expected 404s
            if (err?.status !== 404 && err?.status !== 400) {
              console.warn(`[DataHydration] ${module} result sync error:`, err?.message || err);
            }
          }
        })
      );

      if (resultsChanged) {
        setResults(nextResults);
        localStorage.setItem(RESULTS_KEY, JSON.stringify(nextResults));
        window.dispatchEvent(new CustomEvent("originbi:results-changed"));
      }

      if (completionsChanged) {
        setCompletions(nextCompletions);
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(nextCompletions)));
        window.dispatchEvent(new CustomEvent("originbi:completed-changed"));
      }

    } catch (err) {
      console.error("[DataHydration] Sync failed:", err);
    } finally {
      setIsSyncing(false);
      setIsInitialized(true);
    }
  }, [results, completions]);

  // Initial load from storage + backend sync
  useEffect(() => {
    readFromStorage();
    
    // Brief delay to ensure session is ready
    const id = setTimeout(() => {
      void refresh();
    }, 100);

    return () => clearTimeout(id);
  }, []); // Only once on mount

  // Listen for session ready events
  useEffect(() => {
    const handleSession = () => void refresh();
    window.addEventListener("originbi:session-ready", handleSession);
    return () => window.removeEventListener("originbi:session-ready", handleSession);
  }, [refresh]);

  const value = useMemo(() => ({
    isSyncing,
    isInitialized,
    purchases,
    completions,
    results,
    refresh
  }), [isSyncing, isInitialized, purchases, completions, results, refresh]);

  return (
    <DataHydrationContext.Provider value={value}>
      {children}
    </DataHydrationContext.Provider>
  );
}

export function useDataHydration() {
  const context = useContext(DataHydrationContext);
  if (context === undefined) {
    throw new Error("useDataHydration must be used within a DataHydrationProvider");
  }
  return context;
}
