"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";
import { getUserEntitlements, type AdminUserEntitlement } from "@/lib/api";

function UserEntitlementsInner({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AdminUserEntitlement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserEntitlements(userId)
      .then((d) => {
        setRows(d.entitlements);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lookup failed.");
        setLoading(false);
      });
  }, [userId]);

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <p className="text-xs text-slate-400">
          <Link href="/admin" className="hover:text-emerald-600">
            ← Admin
          </Link>
        </p>
        <header className="border-b border-slate-200 pb-5 dark:border-white/10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Support · User entitlements
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">User #{userId}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Languages this user can use across coding assessments, with the source of the entitlement.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-2 text-left">Language</th>
                  <th className="px-4 py-2 text-left">Slug</th>
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-left">Provenance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-t border-slate-100 dark:border-white/10">
                    <td className="px-4 py-3 font-bold">{r.displayName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.slug}</td>
                    <td className="px-4 py-3">
                      <SourceBadge source={r.source} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.itemRef ? <span className="font-mono">{r.itemRef}</span> : null}
                      {r.orgId ? <span className="font-mono">org={r.orgId}</span> : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      No entitlements for this user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cls =
    source === "purchase"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : source === "org"
        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
      {source}
    </span>
  );
}

export default function UserEntitlementsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return (
    <AdminGuard>
      <UserEntitlementsInner userId={userId} />
    </AdminGuard>
  );
}
