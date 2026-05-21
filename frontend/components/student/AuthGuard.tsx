"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/contexts/SessionContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isLoggedIn, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      const search = searchParams?.toString();
      const nextQuery = search ? `${pathname}?${search}` : pathname;
      router.replace(`/?next=${encodeURIComponent(nextQuery)}`);
    }
  }, [isLoggedIn, isLoading, pathname, searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-brand-dark-primary transition-colors duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-pulse">
            Verifying your session...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-brand-dark-primary transition-colors duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
