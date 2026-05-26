"use client";

import React, { useEffect, useState, useMemo } from "react";
import { redirect } from "next/navigation";
import ExploreDetailView from "@/components/student/ExploreDetailView";
import { EXAMS, EXAM_DETAILS, type AssessmentId } from "@/lib/exams";
import { getDisplayedQuestionCount } from "@/lib/assessmentQuestionCount";

const VALID_IDS: AssessmentId[] = ["aptitude", "communication", "coding", "mnc", "role"];
const LEGACY_TECH_API_URL = (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, ""));

export default function ExploreDetailClient({ id }: { id: string }) {
    if (!VALID_IDS.includes(id as AssessmentId)) {
        redirect("/");
    }

    const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchAll = async () => {
            try {
                const apiBase = LEGACY_TECH_API_URL || "";
                const response = await fetch(`${apiBase}/api/assessment/admin/assessments`);
                if (!response.ok) return;
                const json = await response.json();
                if (json && json.data && active) {
                    setAssessmentsList(json.data);
                }
            } catch (err) {
                console.warn("Failed to fetch database assessments in explore detail view:", err);
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };
        fetchAll();
        return () => {
            active = false;
        };
    }, []);

    const dynamicExam = useMemo(() => {
        const exam = EXAMS.find((e) => e.id === id);
        if (!exam) return null;

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
                questions: getDisplayedQuestionCount(dbExam, exam.questions),
                price: dbExam.amount !== undefined && dbExam.amount !== null ? Number(dbExam.amount) : exam.price,
                trialAttemptsLimit: dbExam.trial_attempts_limit !== undefined && dbExam.trial_attempts_limit !== null ? Number(dbExam.trial_attempts_limit) : 5,
                mainAttemptsLimit: dbExam.main_attempts_limit !== undefined && dbExam.main_attempts_limit !== null ? Number(dbExam.main_attempts_limit) : 2,
                tags: tags,
            };
        }
        return exam;
    }, [assessmentsList, id]);

    const detail = EXAM_DETAILS[id as AssessmentId];

    if (!dynamicExam || !detail) {
        redirect("/");
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5fbf7] dark:bg-[#0f1712]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#1ED36A] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading details...</p>
                </div>
            </div>
        );
    }

    return <ExploreDetailView exam={dynamicExam as any} detail={detail} />;
}
