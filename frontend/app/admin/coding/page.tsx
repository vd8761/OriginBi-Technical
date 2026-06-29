"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";

export default function CodingListPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/questions?module=coding");
  }, [router]);

  return (
    <AdminGuard>
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#f59e0b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Redirecting to the unified questions bank...
        </p>
      </div>
    </AdminGuard>
  );
}
