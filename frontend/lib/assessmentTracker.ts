"use client";

import { useState, useEffect, useCallback } from "react";
import { EXAMS, type AssessmentId } from "@/lib/exams";

export interface CompletedAssessment {
  assessmentCode: string;
  assessmentName: string;
  completedAt: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  status: "completed" | "in_progress";
}

export interface AssessmentNotification {
  id: string;
  type: "completed" | "suggestion" | "reminder";
  title: string;
  message: string;
  assessmentCode?: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

const STORAGE_KEY = "completed_assessments";
const NOTIFICATIONS_KEY = "assessment_notifications";
const PROGRESS_KEY = "assessment_progress";

export function useAssessmentTracker() {
  const [completed, setCompleted] = useState<CompletedAssessment[]>([]);
  const [notifications, setNotifications] = useState<AssessmentNotification[]>([]);
  const [inProgress, setInProgress] = useState<Record<string, { token: string; startedAt: string }>>({});

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCompleted(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse completed assessments", e);
      }
    }

    const notifs = localStorage.getItem(NOTIFICATIONS_KEY);
    if (notifs) {
      try {
        setNotifications(JSON.parse(notifs));
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }

    const prog = localStorage.getItem(PROGRESS_KEY);
    if (prog) {
      try {
        setInProgress(JSON.parse(prog));
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(inProgress));
  }, [inProgress]);

  const markAssessmentComplete = useCallback((
    assessmentCode: string, 
    result: { 
      totalScore: number; 
      correctCount: number; 
      wrongCount: number;
      timeTakenSeconds: number;
    }
  ) => {
    const exam = EXAMS.find(e => e.id === assessmentCode);
    if (!exam) return;

    const completedItem: CompletedAssessment = {
      assessmentCode,
      assessmentName: exam.title,
      completedAt: new Date().toISOString(),
      score: result.totalScore,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      totalQuestions: result.correctCount + result.wrongCount,
      timeTakenSeconds: result.timeTakenSeconds,
      status: "completed",
    };

    setCompleted(prev => {
      // Remove any existing entry for this assessment
      const filtered = prev.filter(p => p.assessmentCode !== assessmentCode);
      return [...filtered, completedItem];
    });

    // Remove from in-progress
    setInProgress(prev => {
      const { [assessmentCode]: _, ...rest } = prev;
      return rest;
    });

    // Add completion notification
    const notification: AssessmentNotification = {
      id: `complete-${assessmentCode}-${Date.now()}`,
      type: "completed",
      title: "Assessment Completed!",
      message: `You scored ${result.totalScore}% on ${exam.title}`,
      assessmentCode,
      timestamp: new Date().toISOString(),
      read: false,
      action: {
        label: "View Results",
        href: "/dashboard",
      },
    };

    setNotifications(prev => [notification, ...prev]);

    // Generate suggestion for next assessment
    generateNextSuggestion(assessmentCode);
  }, []);

  const generateNextSuggestion = useCallback((justCompletedCode: string) => {
    const completedCodes = new Set(completed.map(c => c.assessmentCode));
    completedCodes.add(justCompletedCode);

    // Find uncompleted assessments
    const uncompleted = EXAMS.filter(e => !completedCodes.has(e.id));
    
    if (uncompleted.length === 0) {
      // All completed - suggest reviewing weak areas
      const weakest = [...completed].sort((a, b) => a.score - b.score)[0];
      if (weakest && weakest.score < 70) {
        const notif: AssessmentNotification = {
          id: `suggestion-${Date.now()}`,
          type: "suggestion",
          title: "Improve Your Score",
          message: `Your ${weakest.assessmentName} score (${weakest.score}%) could be improved. Consider retaking it.`,
          assessmentCode: weakest.assessmentCode,
          timestamp: new Date().toISOString(),
          read: false,
          action: {
            label: "Practice Again",
            href: `/assessment/${weakest.assessmentCode}`,
          },
        };
        setNotifications(prev => [notif, ...prev]);
      }
      return;
    }

    // Suggest next assessment based on recommended order
    const recommendedOrder: AssessmentId[] = ["aptitude", "communication", "coding", "mnc", "role"];
    const nextAssessment = recommendedOrder.find(id => 
      uncompleted.some(e => e.id === id)
    );

    if (nextAssessment) {
      const exam = EXAMS.find(e => e.id === nextAssessment);
      if (exam) {
        const notif: AssessmentNotification = {
          id: `suggestion-${Date.now()}`,
          type: "suggestion",
          title: "Next Recommended Assessment",
          message: `Complete ${exam.title} to continue building your profile`,
          assessmentCode: nextAssessment,
          timestamp: new Date().toISOString(),
          read: false,
          action: {
            label: "Start Now",
            href: `/assessment/${nextAssessment}`,
          },
        };
        setNotifications(prev => [notif, ...prev]);
      }
    }
  }, [completed]);

  const startAssessment = useCallback((assessmentCode: string, token: string) => {
    setInProgress(prev => ({
      ...prev,
      [assessmentCode]: { token, startedAt: new Date().toISOString() },
    }));
  }, []);

  const getAssessmentStatus = useCallback((assessmentCode: string) => {
    const completedItem = completed.find(c => c.assessmentCode === assessmentCode);
    if (completedItem) return { status: "completed" as const, data: completedItem };
    
    const inProg = inProgress[assessmentCode];
    if (inProg) return { status: "in_progress" as const, data: inProg };
    
    return { status: "not_started" as const, data: null };
  }, [completed, inProgress]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const getNextRecommended = useCallback(() => {
    const completedCodes = new Set(completed.map(c => c.assessmentCode));
    const inProgressCodes = new Set(Object.keys(inProgress));
    
    const recommendedOrder: AssessmentId[] = ["aptitude", "communication", "coding", "mnc", "role"];
    
    return recommendedOrder.find(id => 
      !completedCodes.has(id) && !inProgressCodes.has(id)
    );
  }, [completed, inProgress]);

  const getOverallProgress = useCallback(() => {
    const total = EXAMS.length;
    const completedCount = completed.length;
    const inProgressCount = Object.keys(inProgress).length;
    
    return {
      total,
      completed: completedCount,
      inProgress: inProgressCount,
      remaining: total - completedCount - inProgressCount,
      percentage: Math.round((completedCount / total) * 100),
    };
  }, [completed, inProgress]);

  return {
    completed,
    notifications,
    inProgress,
    markAssessmentComplete,
    startAssessment,
    getAssessmentStatus,
    markNotificationRead,
    clearAllNotifications,
    getUnreadCount,
    getNextRecommended,
    getOverallProgress,
  };
}
