"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Login from "@/components/student/Login";
import AssessmentPortal from "@/components/student/AssessmentPortal";
import Header from "@/components/student/Header";
import { motion, AnimatePresence } from "framer-motion";
import { getSession, logoutUser } from "@/lib/api";

type AssessmentView = "dashboard" | "assessment" | "profile" | "details" | "explore";

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
function HomeContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>("Student");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [showCompletionToast, setShowCompletionToast] = useState<string | null>(null);
  const [initialView, setInitialView] = useState<AssessmentView | undefined>(undefined);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    getSession()
      .then((session) => {
        if (session) {
          setUserName(session.registration?.fullName || session.user.email);
          setIsLoggedIn(true);
          
          // If already logged in and at root, redirect to destination
          const next = searchParams.get("next");
          if (next) {
            router.replace(next);
          } else {
            router.replace("/dashboard");
          }
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
      })
      .finally(() => setBootstrapping(false));
  }, []);

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
      const id = window.setTimeout(() => setShowCompletionToast(completed), 0);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      return () => window.clearTimeout(id);
    }
  }, [searchParams]);

  const handleLoginSuccess = (name?: string) => {
    if (name) setUserName(name);
    setIsLoggedIn(true);
    const next = searchParams.get("next");
    if (next?.startsWith("/")) {
      router.replace(next);
    } else {
      router.replace("/dashboard");
    }
  };

  const handleLogout = async () => {
    await logoutUser().catch(() => undefined);
    setIsLoggedIn(false);
    setUserName("Student");
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isRedirecting = isLoggedIn && searchParams.get("next");

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
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : isRedirecting ? (
        <div className="relative min-h-screen w-full overflow-hidden bg-brand-light-secondary dark:bg-brand-dark-primary font-sans transition-colors duration-500">
          {/* App Background Grid */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] assessment-grid" />
            <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] assessment-scan mix-blend-multiply dark:mix-blend-screen" />
          </div>

          <Header 
            onLogout={handleLogout} 
            currentView={searchParams.get("next")?.includes("explore") ? "explore" : "dashboard"} 
          />

          <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <div className="flex flex-col items-center gap-6 p-10 rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-2xl animate-scale-in">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-brand-green/10 rounded-full animate-ping" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-text-light-primary dark:text-brand-text-primary mb-2">
                  Preparing your session
                </h2>
                <p className="text-sm font-medium text-brand-text-light-secondary dark:text-brand-text-secondary animate-pulse">
                  Taking you to <span className="text-brand-green font-bold">{searchParams.get("next")?.split('/')[1] || 'your destination'}</span>...
                </p>
              </div>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 py-8 text-center z-10">
            <p className="text-sm text-brand-text-light-secondary/70 dark:text-brand-text-secondary">
              &copy; {new Date().getFullYear()} Origin BI | Powered by Beyond Intelligence
            </p>
          </footer>
        </div>
      ) : (
        <AssessmentPortal userName={userName} onLogout={handleLogout} initialView={initialView} />
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
