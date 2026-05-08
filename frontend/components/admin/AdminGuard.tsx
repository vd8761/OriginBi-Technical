"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const adminSession = localStorage.getItem("originbi:admin-session");
    if (adminSession === "true") {
      setIsAuthorized(true);
    } else {
      router.push("/admin/login");
    }
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-brand-dark-primary gap-4">
        <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500 dark:text-brand-text-secondary uppercase tracking-widest animate-pulse">
          Verifying authorization...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
