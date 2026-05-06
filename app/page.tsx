"use client";

import React, { useState } from "react";
import Login from "@/components/student/Login";
import AssessmentPortal from "@/components/student/AssessmentPortal";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <main className="min-h-screen">
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AssessmentPortal />
      )}
    </main>
  );
}
