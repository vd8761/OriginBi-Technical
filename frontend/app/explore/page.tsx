"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ExploreView from "@/components/student/ExploreView";
import Header from "@/components/student/Header";
import { EXAMS, EXAM_DETAILS } from "@/lib/exams";
import { useSession } from "@/lib/contexts/SessionContext";

export default function ExplorePage() {
  const router = useRouter();
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      try {
        const apiBase = (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) || "";
        const response = await fetch(`${apiBase}/api/assessment/admin/assessments`);
        if (!response.ok) return;
        const json = await response.json();
        if (json && json.data && active) {
          setAssessmentsList(json.data);
        }
      } catch (err) {
        console.warn("Failed to fetch database assessments in explore view:", err);
      }
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, []);

  const dynamicExams = useMemo(() => {
    const mapped = EXAMS.map((exam) => {
      const dbModule = exam.id === "communication" ? "grammar" : exam.id;
      const dbExam = assessmentsList.find(
        (a) => a.module_type === dbModule || a.assessment_code === exam.id
      );
      if (dbExam) {
        let tags = exam.tags;
        if (dbExam.categories) {
          let parsed: any[] = [];
          if (Array.isArray(dbExam.categories)) {
            parsed = dbExam.categories;
          } else if (typeof dbExam.categories === "string") {
            try {
              parsed = JSON.parse(dbExam.categories);
            } catch {
              parsed = [];
            }
          }
          if (parsed.length > 0) {
            tags = parsed.map((c: any) => {
              if (typeof c === "string") return c;
              return c.name || c.id || "";
            }).filter(Boolean);
          }
        }
        return {
          ...exam,
          assessmentId: dbExam.assessment_id,
          assessmentCode: dbExam.assessment_code || exam.id,
          title: dbExam.assessment_name || exam.title,
          duration: `${dbExam.total_time_minutes || 60} min`,
          questions: (dbExam.question_limit > 0 ? dbExam.question_limit : (dbExam.main_questions_count > 0 ? dbExam.main_questions_count : dbExam.total_questions)) || exam.questions,
          trialQuestionsCount: dbExam.trial_questions_count || 0,
          mainQuestionsCount: dbExam.main_questions_count || 0,
          questionLimit: dbExam.question_limit || 0,
          price: dbExam.amount !== undefined && dbExam.amount !== null ? Number(dbExam.amount) : exam.price,
          trialAttemptsLimit: dbExam.trial_attempts_limit !== undefined && dbExam.trial_attempts_limit !== null ? Number(dbExam.trial_attempts_limit) : 5,
          mainAttemptsLimit: dbExam.main_attempts_limit !== undefined && dbExam.main_attempts_limit !== null ? Number(dbExam.main_attempts_limit) : 2,
          tags: tags,
          enabledQuestionTypes: dbExam.enabled_question_types,
        };
      }
      return exam;
    });

    return mapped;
  }, [assessmentsList]);

  const handleNavigateToDetails = (exam: any) => {
    router.push(`/explore/${exam.id}`);
  };

  const { logout } = useSession();
  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleNavigate = (view: string) => {
    if (view === "explore") {
      return;
    }
    router.push(`/${view}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-brand-dark-primary">
      <Header
        currentView="explore"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 pt-[88px] sm:pt-[96px]">
        <ExploreView
          assessments={dynamicExams as any}
          examDetails={EXAM_DETAILS as any}
          onNavigateToDetails={handleNavigateToDetails}
        />
      </main>
    </div>
  );
}
