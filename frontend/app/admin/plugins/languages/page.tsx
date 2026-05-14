"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Plus } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, EmptyState, ErrorState } from "@/components/admin/ui";
import { listPlugins, type LanguageSchema, type Plugin } from "@/lib/api";

interface LanguageRow extends Plugin {
  schemaTyped: LanguageSchema | null;
}

function stateTone(state: string) {
  if (state === "enabled") return "green" as const;
  if (state === "restricted") return "amber" as const;
  return "neutral" as const;
}

function LanguagesInner() {
  useRegisterAdminPage({
    eyebrow: "System / Languages",
    title: "Programming Languages",
    subtitle: "Judge0 mappings, Monaco language IDs, runtime limits, and purchasable language plugin metadata.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Plugins", href: "/admin/plugins" },
      { label: "Languages" },
    ],
  });

  const [rows, setRows] = useState<LanguageRow[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const reload = React.useCallback(() => {
    setLoading(true);
    setError(null);
    listPlugins({ category: "language" })
      .then((data) => {
        const typed = data.plugins.map<LanguageRow>((plugin) => ({
          ...plugin,
          schemaTyped: plugin.schema ? (plugin.schema as unknown as LanguageSchema) : null,
        }));
        setRows(typed);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return (
    <div className="admin-page">
      <div className="admin-control-row">
        <Badge tone="green" dot>
          {rows.filter((r) => r.platformState === "enabled").length} enabled
        </Badge>
        <Link href="/admin/plugins/languages/new" className="admin-btn admin-btn-primary">
          <Plus size={14} /> Add Language
        </Link>
      </div>

      {error !== null ? <ErrorState title="Couldn't load languages" error={error} onRetry={reload} /> : null}

      {!error && (
        <div className="admin-grid-3">
          {rows.map((row) => (
            <Link key={row.id} href={`/admin/plugins/${row.id}`} className="admin-module-card">
              <div className="admin-control-row">
                <span
                  className="admin-module-icon"
                  style={{ background: "var(--admin-amber-soft)", color: "var(--admin-amber)" }}
                >
                  <Code2 size={20} />
                </span>
                <Badge tone={stateTone(row.platformState)} dot>
                  {row.platformState}
                </Badge>
              </div>
              <div>
                <h3 className="admin-card-title">{row.schemaTyped?.displayName ?? row.name}</h3>
                <p className="admin-card-subtitle admin-mono">{row.slug}</p>
              </div>
              <div className="admin-row" style={{ flexWrap: "wrap", gap: 6 }}>
                <Badge tone="neutral">Judge0 {row.schemaTyped?.judge0LanguageId ?? "-"}</Badge>
                <Badge tone="neutral">{row.schemaTyped?.monacoLanguageId ?? "monaco -"}</Badge>
              </div>
              <div className="admin-row" style={{ flexWrap: "wrap", gap: 6 }}>
                <Badge tone="neutral">{row.schemaTyped?.timeLimitMs ?? 3000}ms</Badge>
                <Badge tone="neutral">
                  {Math.round((row.schemaTyped?.memoryLimitKb ?? 131072) / 1024)}MB
                </Badge>
                {row.schemaTyped?.legacyItemRef && (
                  <Badge tone="green">{row.schemaTyped.legacyItemRef}</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<Code2 size={26} />}
          title="No language plugins installed"
          description="Install a language plugin from the registry to make it available in coding problems."
          action={
            <Link href="/admin/plugins/languages/new" className="admin-btn admin-btn-primary">
              <Plus size={14} /> Add Language
            </Link>
          }
        />
      )}

      {loading && !error && (
        <div className="admin-grid-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="admin-skeleton" style={{ height: 200 }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LanguagesPage() {
  return (
    <AdminGuard>
      <LanguagesInner />
    </AdminGuard>
  );
}
