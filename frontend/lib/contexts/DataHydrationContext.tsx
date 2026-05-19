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
    const token = typeof window !== "undefined" ? localStorage.getItem("originbi:access-token") : null;
    if (!email || !token) {
      setIsInitialized(true);
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Sync Purchases (Tech API + Exam Engine)
      // Handle network errors gracefully
      let purchased: string[] = [];
      let assignments: any[] = [];
      
      try {
        const purchaseResult = await getPurchasedAssessments(email);
        purchased = purchaseResult.purchased || [];
      } catch (err: any) {
        console.warn("[DataHydration] Purchases sync failed (network error?):", err?.message || err);
        // Continue with empty purchases, don't fail entire sync
      }

      try {
        const assignmentResult = await listAssignments();
        assignments = assignmentResult.assignments || [];
      } catch (err: any) {
        console.warn("[DataHydration] Assignments sync failed (network error?):", err?.message || err);
        // Continue with empty assignments, don't fail entire sync
      }

      const nextPurchases = new Set(
        purchased.filter((code) => !String(code).startsWith("coding:")),
      );
      (assignments ?? []).forEach(a => {
        if (a.assignmentRef && (a.status === 'active' || a.status === 'completed' || a.completed)) {
          nextPurchases.add(a.assignmentRef);
        }
      });

      setPurchases(nextPurchases);
      localStorage.setItem(PAID_KEY, JSON.stringify(Array.from(nextPurchases)));
      window.dispatchEvent(new CustomEvent("originbi:paid-changed"));

      // 2. Sync Results - use functional updates to avoid closure dependency on results/completions
      const modules: AssessmentId[] = ["aptitude", "communication", "mnc", "role", "coding"];

      const fetchResults = await Promise.all(
        modules.map(async (module) => {
          try {
            const submission = await getLatestSubmittedResult(module, email);
            if (!submission) {
              // No submission history yet, skip mapping
              return;
            }

            const { mapSubmissionToAssessmentResult } = await import("@/lib/assessmentResultMapper");
            const result = mapSubmissionToAssessmentResult({
              assessmentId: module,
              submission: submission as any,
            });
            return { module, result } as const;
          } catch (err: any) {
            // Silence expected 404s and network errors
            if (err?.status !== 404 && err?.status !== 400) {
              const isNetworkError = err?.message === 'Failed to fetch' || err?.name === 'TypeError';
              if (!isNetworkError) {
                console.warn(`[DataHydration] ${module} result sync error:`, err?.message || err);
              }
            }
            return null;
          }
        })
      );

      const validResults = fetchResults.filter(Boolean) as { module: string; result: AssessmentResult }[];

      if (validResults.length > 0) {
        setResults(prev => {
          const next = { ...prev };
          for (const { module, result } of validResults) {
            next[module] = result;
          }
          localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
          return next;
        });

        setCompletions(prev => {
          const next = new Set(prev);
          for (const { module } of validResults) {
            next.add(module);
          }
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(next)));
          return next;
        });

        window.dispatchEvent(new CustomEvent("originbi:results-changed"));
        window.dispatchEvent(new CustomEvent("originbi:completed-changed"));
      }

    } catch (err) {
      console.error("[DataHydration] Sync failed:", err);
    } finally {
      setIsSyncing(false);
      setIsInitialized(true);
    }
  }, []);

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
