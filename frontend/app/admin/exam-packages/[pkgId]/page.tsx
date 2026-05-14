"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";
import { getExamPackage, type AdminExamPackage } from "@/lib/api";

function PackageDetailInner({ pkgId }: { pkgId: string }) {
  const [pkg, setPkg] = useState<AdminExamPackage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getExamPackage(pkgId)
      .then(setPkg)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Package lookup failed."),
      );
  }, [pkgId]);

  if (error)
    return (
      <main className="px-6 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      </main>
    );
  if (!pkg)
    return <main className="px-6 py-8 text-sm text-slate-500">Loading…</main>;

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <p className="text-xs text-slate-400">
          <Link href="/admin/exam-packages" className="hover:text-emerald-600">
            ← Exam Packages
          </Link>
        </p>
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-5 dark:border-white/10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Catalog · Package
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{pkg.title}</h1>
          <p className="font-mono text-sm text-slate-500">{pkg.slug}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Row label="Status" value={pkg.status} />
          <Row label="Time" value={`${Math.round(pkg.totalTimeSeconds / 60)} min`} />
          <Row label="Max score" value={String(pkg.maxScore)} />
          <Row label="Created" value={new Date(pkg.createdAt).toLocaleString()} />
        </div>

        {pkg.description && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description</h3>
            <p className="text-sm">{pkg.description}</p>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Settings (raw)</h3>
          <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(pkg.settings, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 dark:border-white/[0.05] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

export default function PackageDetailPage({
  params,
}: {
  params: Promise<{ pkgId: string }>;
}) {
  const { pkgId } = use(params);
  return (
    <AdminGuard>
      <PackageDetailInner pkgId={pkgId} />
    </AdminGuard>
  );
}
