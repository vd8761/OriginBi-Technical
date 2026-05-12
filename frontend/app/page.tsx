"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Login from "@/components/student/Login";
import AssessmentPortal from "@/components/student/AssessmentPortal";
import { motion, AnimatePresence } from "framer-motion";

// Completion Toast Component
const CompletionToast = ({ assessment, onClose }: { assessment: string; onClose: () => void }) => {
  const assessmentNames: Record<string, string> = {
    aptitude: "Aptitude Assessment",
    communication: "Communication Assessment",
    coding: "Coding Assessment",
    mnc: "MNC Based Questions",
    role: "Role Based Questions",
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: -50, x: "-50%" }}
      className="fixed top-6 left-1/2 z-[100] px-6 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white shadow-2xl shadow-brand-green/30 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="font-bold">Assessment Completed!</p>
        <p className="text-sm text-white/80">Your {assessmentNames[assessment] || assessment} results are now available in your dashboard.</p>
      </div>
      <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
};

// Inner component that uses search params
import { useSession } from "@/lib/contexts/SessionContext";
import { useRouter } from "next/navigation";

type AssessmentView = "dashboard" | "assessment" | "profile" | "details" | "explore";

function HomeContent() {
  const { isLoggedIn, user, isLoading } = useSession();
  const [showCompletionToast, setShowCompletionToast] = useState<string | null>(null);
  const [initialView, setInitialView] = useState<AssessmentView | undefined>(undefined);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check for view parameter
    const viewParam = searchParams.get("view");
    const validViews: AssessmentView[] = ["dashboard", "assessment", "profile", "details", "explore"];
    if (viewParam && validViews.includes(viewParam as AssessmentView)) {
      setInitialView(viewParam as AssessmentView);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    
    // Check for completion parameter
    const completed = searchParams.get("completed");
    if (completed) {
      setShowCompletionToast(completed);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.replace("/explore");
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-brand-dark-primary gap-4">
        <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500 dark:text-brand-text-secondary uppercase tracking-widest animate-pulse">Loading experience...</p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showCompletionToast && (
          <CompletionToast 
            assessment={showCompletionToast} 
            onClose={() => setShowCompletionToast(null)} 
          />
        )}
      </AnimatePresence>
      
      {!isLoggedIn ? (
        <Login onLoginSuccess={() => router.replace("/explore")} />
      ) : (
        <AssessmentPortal userName={user?.name} />
      )}
    </>
  );
}

// Main export with Suspense wrapper
export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <HomeContent />
      </Suspense>
    </main>
  );
}
