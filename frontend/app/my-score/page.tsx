"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/student/Header";
import { useSession } from "@/lib/contexts/SessionContext";
import { AwardIcon } from "@/components/icons";

export default function MyScorePage() {
  const router = useRouter();
  const { logout } = useSession();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleNavigate = (view: string) => {
    router.push(`/${view}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-brand-dark-primary flex flex-col">
      <Header
        currentView="my-score"
        onNavigate={handleNavigate as any}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-xs">
            <AwardIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-black dark:text-white tracking-tight">
            Coming Soon!
          </h1>
        </div>
      </main>
    </div>
  );
}
