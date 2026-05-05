"use client";

import React from "react";
import { redirect } from "next/navigation";
import ExploreDetailView from "@/components/student/ExploreDetailView";
import { EXAMS, EXAM_DETAILS, type AssessmentId } from "@/lib/exams";

const VALID_IDS: AssessmentId[] = ["aptitude", "communication", "coding", "mnc", "role"];

export default function ExploreDetailClient({ id }: { id: string }) {
    if (!VALID_IDS.includes(id as AssessmentId)) {
        redirect("/dashboard");
    }

    const exam = EXAMS.find((e) => e.id === id);
    const detail = EXAM_DETAILS[id as AssessmentId];

    if (!exam || !detail) {
        redirect("/dashboard");
    }

    return <ExploreDetailView exam={exam} detail={detail} />;
}
