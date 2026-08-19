"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Search,
  XCircle,
} from "lucide-react";

import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Avatar, Badge, PillTabs, StatCard } from "@/components/admin/ui";
import {
  listAdminResults,
  type AdminResultRow,
  type AdminResultsResponse,
} from "@/lib/api";

type ModuleFilter = "all" | "aptitude" | "grammar" | "mnc" | "role";
type OutcomeFilter = "all" | "passed" | "failed";

const PAGE_SIZE = 50;

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResultsInner() {
  const router = useRouter();
  // Seeded when arriving from the users roster's "View results" link.
  const initialQuery = useSearchParams().get("q") ?? "";

  useRegisterAdminPage({
    title: "Assessment Results",
    breadcrumb: [{ label: "Results" }],
  });

  const [data, setData] = useState<AdminResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listAdminResults({
        q: debouncedSearch || undefined,
        module: moduleFilter === "all" ? undefined : moduleFilter,
        outcome: outcome === "all" ? undefined : outcome,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setData(res);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, moduleFilter, outcome, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: AdminResultRow[] = data?.results ?? [];
  const counts = data?.counts;

  const moduleTabs = useMemo(
    () => [
      { value: "all" as const, label: "All Modules", count: counts?.total },
      { value: "aptitude" as const, label: "Aptitude", count: counts?.byModule?.aptitude },
      { value: "grammar" as const, label: "Communication", count: counts?.byModule?.grammar },
      { value: "mnc" as const, label: "MNC", count: counts?.byModule?.mnc },
      { value: "role" as const, label: "Role", count: counts?.byModule?.role },
    ],
    [counts],
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="admin-page">
      <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Submitted attempts"
          value={counts?.total ?? "—"}
          icon={<ClipboardList size={16} />}
        />
        <StatCard
          label="Passed"
          value={counts?.passed ?? "—"}
          sub={`Pass mark ${data?.passPercent ?? 90}%`}
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard
          label="Not passed"
          value={counts?.failed ?? "—"}
          icon={<XCircle size={16} />}
          iconBg="var(--admin-red-soft, #fee2e2)"
          iconColor="var(--admin-red, #dc2626)"
        />
        <StatCard
          label="Modules covered"
          value={Object.keys(counts?.byModule ?? {}).length || "—"}
          icon={<Award size={16} />}
        />
      </div>

      <div className="admin-toolbar admin-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div className="admin-row" style={{ gap: 12, flexWrap: "wrap" }}>
          <PillTabs
            tabs={moduleTabs}
            value={moduleFilter}
            onChange={(next) => {
              setModuleFilter(next);
              setPage(0);
            }}
          />
          <select
            value={outcome}
            onChange={(event) => {
              setOutcome(event.target.value as OutcomeFilter);
              setPage(0);
            }}
            className="admin-select"
          >
            <option value="all">All outcomes</option>
            <option value="passed">Passed only</option>
            <option value="failed">Not passed</option>
          </select>
          <label className="admin-search" style={{ width: 280 }}>
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate name or email..."
              style={{ outline: "none", boxShadow: "none" }}
            />
          </label>
        </div>
      </div>

      {loadError && (
        <div className="admin-error" style={{ marginBottom: 12 }}>
          {loadError}
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Assessment</th>
              <th>Module</th>
              <th>Mode</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Outcome</th>
              <th>Time taken</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
                  Loading results…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
                  No submitted attempts match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={`${r.module}-${r.attemptToken}`}
                  onClick={() => router.push(`/admin/results/${r.module}/${encodeURIComponent(r.attemptToken)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="admin-row" style={{ gap: 12 }}>
                      <Avatar name={r.candidateName} email={r.candidateEmail} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{r.candidateName}</div>
                        <div style={{ color: "var(--admin-muted-fg)", fontSize: 12 }}>{r.candidateEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--admin-fg)" }}>{r.assessmentName}</td>
                  <td>
                    <Badge tone="blue">{r.moduleLabel}</Badge>
                  </td>
                  <td style={{ color: "var(--admin-muted-fg)", textTransform: "capitalize" }}>{r.mode}</td>
                  <td className="admin-mono" style={{ color: "var(--admin-fg)" }}>
                    {r.totalScore} / {r.maxScore}
                  </td>
                  <td className="admin-mono" style={{ color: "var(--admin-fg)", fontWeight: 700 }}>
                    {r.percentage}%
                  </td>
                  <td>
                    <Badge tone={r.passed ? "green" : "amber"}>
                      {r.passed ? "Passed" : "Not passed"}
                    </Badge>
                  </td>
                  <td style={{ color: "var(--admin-muted-fg)" }}>{formatDuration(r.timeTakenSeconds)}</td>
                  <td style={{ color: "var(--admin-muted-fg)" }}>{formatDate(r.submittedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-row" style={{ justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="admin-btn"
          >
            Previous
          </button>
          <span style={{ color: "var(--admin-muted-fg)", fontSize: 13 }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="admin-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminResultsPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<div className="admin-page" style={{ padding: 32 }}>Loading results…</div>}>
        <ResultsInner />
      </Suspense>
    </AdminGuard>
  );
}
