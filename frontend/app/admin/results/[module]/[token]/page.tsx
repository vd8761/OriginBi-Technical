"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, MinusCircle, XCircle } from "lucide-react";

import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, StatCard } from "@/components/admin/ui";
import { getAdminResultDetail } from "@/lib/api";

interface SectionRow {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  answeredCount?: number;
  totalCount?: number;
  correctCount?: number;
}

interface QuestionReview {
  questionId: string;
  displayOrder: number;
  category: string;
  type: string;
  questionText: string;
  options?: Array<{ id: string; text: string }>;
  selectedOptionId?: string | null;
  selectedAnswerText?: string | null;
  correctOptionId?: string | string[] | null;
  correctAnswerText?: string | null;
  isCorrect?: boolean | null;
  status?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ResultDetailInner() {
  const router = useRouter();
  const params = useParams<{ module: string; token: string }>();
  const moduleSlug = String(params?.module ?? "");
  const token = decodeURIComponent(String(params?.token ?? ""));

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useRegisterAdminPage({
    title: detail?.candidateName ? `${detail.candidateName} — Result` : "Assessment Result",
    breadcrumb: [
      { label: "Results", onClick: () => router.push("/admin/results") },
      { label: detail?.candidateName ?? "Attempt" },
    ],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await getAdminResultDetail(moduleSlug, token));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load this result");
    } finally {
      setLoading(false);
    }
  }, [moduleSlug, token]);

  useEffect(() => {
    if (moduleSlug && token) void load();
  }, [load, moduleSlug, token]);

  if (loading) {
    return (
      <div className="admin-page">
        <p style={{ padding: 32, color: "var(--admin-muted-fg)" }}>Loading result…</p>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="admin-page">
        <div className="admin-error">{loadError ?? "Result not found."}</div>
        <button type="button" className="admin-btn" style={{ marginTop: 16 }} onClick={() => router.push("/admin/results")}>
          <ChevronLeft size={14} /> Back to results
        </button>
      </div>
    );
  }

  const sections: SectionRow[] = detail.sections ?? [];
  const reviews: QuestionReview[] = detail.questionReviews ?? [];
  const pct = Math.round(detail.overallScorePercent ?? detail.accuracyPct ?? 0);

  return (
    <div className="admin-page">
      <button type="button" className="admin-btn" style={{ marginBottom: 16 }} onClick={() => router.push("/admin/results")}>
        <ChevronLeft size={14} /> Back to results
      </button>

      <Card style={{ marginBottom: 20, padding: 20 }}>
        <div className="admin-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, color: "var(--admin-fg)", fontSize: 18 }}>
              {detail.candidateName ?? "Candidate"}
            </h2>
            <p style={{ color: "var(--admin-muted-fg)", fontSize: 13 }}>{detail.candidateEmail}</p>
            <p style={{ color: "var(--admin-muted-fg)", fontSize: 12, marginTop: 4 }}>
              Attempt <span className="admin-mono">{detail.attemptToken ?? token}</span> · {detail.mode ?? "main"} mode
            </p>
          </div>
          <Badge tone={pct >= 90 ? "green" : "amber"}>{pct}% overall</Badge>
        </div>
      </Card>

      <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Score"
          value={`${detail.totalScore ?? 0} / ${detail.maxScore ?? 0}`}
          sub={`+${detail.positiveScore ?? 0} / −${detail.negativeScore ?? 0}`}
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard label="Correct" value={detail.correctCount ?? 0} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Wrong" value={detail.wrongCount ?? 0} icon={<XCircle size={16} />} />
        <StatCard
          label="Skipped"
          value={detail.skippedCount ?? 0}
          sub={`Time ${formatDuration(detail.timeTakenSeconds ?? 0)}`}
          icon={<MinusCircle size={16} />}
        />
      </div>

      {sections.length > 0 && (
        <>
          <h3 style={{ fontWeight: 700, color: "var(--admin-fg)", margin: "0 0 12px" }}>Section breakdown</h3>
          <div className="admin-table-wrap" style={{ marginBottom: 24 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Correct</th>
                  <th>Answered</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.name}>
                    <td style={{ color: "var(--admin-fg)", fontWeight: 600 }}>{s.name}</td>
                    <td className="admin-mono" style={{ color: "var(--admin-fg)" }}>
                      {s.score} / {s.maxScore}
                    </td>
                    <td className="admin-mono" style={{ color: "var(--admin-fg)" }}>{s.percentage}%</td>
                    <td style={{ color: "var(--admin-muted-fg)" }}>
                      {s.correctCount ?? "—"} / {s.totalCount ?? "—"}
                    </td>
                    <td style={{ color: "var(--admin-muted-fg)" }}>{s.answeredCount ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reviews.length > 0 && (
        <>
          <h3 style={{ fontWeight: 700, color: "var(--admin-fg)", margin: "0 0 12px" }}>
            Question review ({reviews.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.map((q) => (
              <Card key={`${q.questionId}-${q.displayOrder}`} style={{ padding: 16 }}>
                <div className="admin-row" style={{ justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <span style={{ color: "var(--admin-muted-fg)", fontSize: 12 }}>
                    Q{q.displayOrder} · {q.category} · {q.type}
                  </span>
                  <Badge tone={q.isCorrect === true ? "green" : q.isCorrect === false ? "red" : "neutral"}>
                    {q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : (q.status ?? "Unanswered")}
                  </Badge>
                </div>
                <p style={{ color: "var(--admin-fg)", fontWeight: 600, marginBottom: 10 }}>{q.questionText}</p>
                <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  <div style={{ color: "var(--admin-muted-fg)" }}>
                    Candidate answer:{" "}
                    <span style={{ color: "var(--admin-fg)" }}>
                      {q.selectedAnswerText ??
                        q.options?.find((o) => String(o.id) === String(q.selectedOptionId))?.text ??
                        "— not answered —"}
                    </span>
                  </div>
                  <div style={{ color: "var(--admin-muted-fg)" }}>
                    Correct answer:{" "}
                    <span style={{ color: "var(--admin-fg)" }}>{q.correctAnswerText ?? "—"}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminResultDetailPage() {
  return (
    <AdminGuard>
      <ResultDetailInner />
    </AdminGuard>
  );
}
