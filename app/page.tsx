"use client";

import React, { useState } from "react";
import Login from "@/components/student/Login";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>("Student");

  const handleLoginSuccess = (name?: string) => {
    if (name) setUserName(name);
    setIsLoggedIn(true);
  };

  return (
    <main className="min-h-screen">
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AssessmentPortal userName={userName} />
      )}
    </main>
  );
}
