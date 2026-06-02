"use client";

import React, { Suspense } from "react";
import MyScoreView from "@/components/student/MyScoreView";

export default function MyScorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f5fbf7] dark:bg-[#0f1712]">
          <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MyScoreView />
    </Suspense>
  );
}
