"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BreadcrumbSegment } from "./ui";

interface AdminPageMeta {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbSegment[];
  actions?: ReactNode;
  hideSearch?: boolean;
}

interface AdminPageContextValue {
  meta: AdminPageMeta;
  setMeta: (next: AdminPageMeta) => void;
}

const AdminPageContext = createContext<AdminPageContextValue | null>(null);

export function AdminPageProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<AdminPageMeta>({});
  const value = useMemo(() => ({ meta, setMeta }), [meta]);
  return <AdminPageContext.Provider value={value}>{children}</AdminPageContext.Provider>;
}

export function useAdminPageMeta() {
  const ctx = useContext(AdminPageContext);
  if (!ctx) {
    throw new Error("useAdminPageMeta must be used within AdminPageProvider");
  }
  return ctx;
}

/**
 * Page hook: declare the topbar metadata for the current route.
 * Pass a stable object (or memoize) — re-runs on every change.
 */
export function useRegisterAdminPage(meta: AdminPageMeta) {
  const ctx = useContext(AdminPageContext);
  const setMeta = ctx?.setMeta;
  const serialized = JSON.stringify({
    eyebrow: meta.eyebrow,
    title: meta.title,
    subtitle: meta.subtitle,
    breadcrumb: meta.breadcrumb?.map(b => ({ label: b.label, href: b.href })),
  });
  const stableSetMeta = useCallback(
    (next: AdminPageMeta) => setMeta?.(next),
    [setMeta],
  );
  useEffect(() => {
    stableSetMeta(meta);
    return () => stableSetMeta({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, stableSetMeta]);
}
