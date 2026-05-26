"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const adminSession = localStorage.getItem("originbi:admin-session");
    const idToken = localStorage.getItem("originbi:admin-id-token");
    const accessToken = localStorage.getItem("originbi:admin-access-token");
    // Both signals must be present: the explicit admin gate AND a usable
    // Cognito token. Otherwise every request will 401 and the user is
    // stuck staring at error states with no way back to login.
    if (adminSession === "true" && (idToken || accessToken)) {
      setIsAuthorized(true);
    } else {
      // Drop the stale flag so other gates (e.g. AdminNav data fetches)
      // also stop pretending we have a session.
      localStorage.removeItem("originbi:admin-session");
      const next = pathname && !pathname.startsWith("/admin/login")
        ? `?next=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/admin/login${next}`);
    }
  }, [router, pathname]);

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[9999] flex bg-[#f5f7f6] dark:bg-[#0f1411] select-none pointer-events-none">
        {/* Left Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 h-full border-r border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0b100d] p-6 space-y-8 animate-pulse">
          {/* Logo Brand area */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/5" />
            <div className="w-24 h-4 rounded bg-slate-200 dark:bg-white/5" />
          </div>
          
          {/* Section 1: Workspace */}
          <div className="space-y-4">
            <div className="w-16 h-3 rounded bg-slate-200 dark:bg-white/5" />
            <div className="space-y-3 pl-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/5" />
                  <div className="w-28 h-3.5 rounded bg-slate-200 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: System */}
          <div className="space-y-4">
            <div className="w-14 h-3 rounded bg-slate-200 dark:bg-white/5" />
            <div className="space-y-3 pl-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/5" />
                  <div className="w-24 h-3.5 rounded bg-slate-200 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom user profile skeleton */}
          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5" />
            <div className="space-y-2">
              <div className="w-20 h-3 rounded bg-slate-200 dark:bg-white/5" />
              <div className="w-14 h-2 rounded bg-slate-200 dark:bg-white/5" />
            </div>
          </div>
        </div>

        {/* Right Main Content Skeleton */}
        <div className="flex-1 h-full flex flex-col p-6 md:p-8 space-y-8 animate-pulse overflow-hidden">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/50 dark:border-white/5">
            <div className="space-y-3">
              <div className="w-20 h-3 rounded bg-slate-200 dark:bg-white/5" />
              <div className="w-48 h-6 rounded bg-slate-200 dark:bg-white/5" />
            </div>
            <div className="w-40 h-10 rounded-xl bg-slate-200 dark:bg-white/5" />
          </div>

          {/* Page Body Skeleton - mock dashboard / table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-[20px] bg-white dark:bg-[#19211c] border border-slate-200/50 dark:border-white/5 p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-16 h-3 rounded bg-slate-200 dark:bg-white/5" />
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/5" />
                </div>
                <div className="w-24 h-6 rounded bg-slate-200 dark:bg-white/5" />
              </div>
            ))}
          </div>

          {/* Large mock main list/card panel */}
          <div className="flex-1 rounded-[24px] bg-white dark:bg-[#19211c] border border-slate-200/50 dark:border-white/5 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div className="w-32 h-4 rounded bg-slate-200 dark:bg-white/5" />
              <div className="w-44 h-8 rounded bg-slate-200 dark:bg-white/5" />
            </div>
            
            {/* Mock Table/List items */}
            <div className="space-y-4 pt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/5" />
                    <div className="space-y-2">
                      <div className="w-32 h-3.5 rounded bg-slate-200 dark:bg-white/5" />
                      <div className="w-20 h-2.5 rounded bg-slate-200 dark:bg-white/5" />
                    </div>
                  </div>
                  <div className="w-16 h-6 rounded-full bg-slate-200 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
