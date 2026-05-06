import { type AssessmentId } from "@/lib/exams";
import ExploreDetailClient from "./ExploreDetailClient";

const VALID_IDS: AssessmentId[] = ["aptitude", "communication", "coding", "mnc", "role"];

export function generateStaticParams() {
    return VALID_IDS.map((id) => ({ id }));
}

export default async function ExploreDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <ExploreDetailClient id={id} />;
}
