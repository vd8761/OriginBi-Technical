"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Plus } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { listPlugins, type LanguageSchema, type Plugin } from "@/lib/api";

interface LanguageRow extends Plugin {
  schemaTyped: LanguageSchema | null;
}

function stateClass(state: string) {
  if (state === "enabled") return "admin-badge-green";
  if (state === "restricted") return "admin-badge-amber";
  return "";
}

function LanguagesInner() {
  const [rows, setRows] = useState<LanguageRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listPlugins({ category: "language" })
      .then((data) => {
        const typed = data.plugins.map<LanguageRow>((plugin) => ({
          ...plugin,
          schemaTyped: plugin.schema ? (plugin.schema as unknown as LanguageSchema) : null,
        }));
        setRows(typed);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Language lookup failed."));
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">Plugins / Languages</p>
          <h2 className="admin-page-title">Programming Languages</h2>
          <p className="admin-page-copy">
            Judge0 mappings, Monaco language IDs, runtime limits, and purchasable language plugin metadata.
          </p>
        </div>
        <Link href="/admin/plugins/languages/new" className="admin-btn admin-btn-primary">
          <Plus size={14} /> Add Language
        </Link>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-grid-3">
        {rows.map((row) => (
          <Link key={row.id} href={`/admin/plugins/${row.id}`} className="admin-module-card">
            <div className="admin-control-row">
              <span className="admin-module-icon" style={{ background: "rgba(255,183,3,0.14)", color: "var(--admin-amber)" }}>
                <Code2 size={20} />
              </span>
              <span className={`admin-badge ${stateClass(row.platformState)}`}>
                <span className="admin-dot" />
                {row.platformState}
              </span>
            </div>
            <div>
              <h3 className="admin-card-title">{row.schemaTyped?.displayName ?? row.name}</h3>
              <p className="admin-card-subtitle admin-mono">{row.slug}</p>
            </div>
            <div className="admin-row">
              <span className="admin-badge">Judge0 {row.schemaTyped?.judge0LanguageId ?? "-"}</span>
              <span className="admin-badge">{row.schemaTyped?.monacoLanguageId ?? "monaco -"}</span>
            </div>
            <div className="admin-row">
              <span className="admin-badge">{row.schemaTyped?.timeLimitMs ?? 3000}ms</span>
              <span className="admin-badge">
                {Math.round((row.schemaTyped?.memoryLimitKb ?? 131072) / 1024)}MB
              </span>
              {row.schemaTyped?.legacyItemRef && (
                <span className="admin-badge admin-badge-green">{row.schemaTyped.legacyItemRef}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {rows.length === 0 && !error && (
        <div className="admin-card admin-card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Code2 size={32} color="var(--admin-fg-4)" />
          <h3 className="admin-card-title" style={{ marginTop: 14 }}>No language plugins installed</h3>
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
