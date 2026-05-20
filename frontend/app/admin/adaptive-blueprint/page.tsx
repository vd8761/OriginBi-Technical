"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The standalone Adaptive Blueprint page has been removed.
 * Blueprint is now fully automatic — computed from the question bank.
 * Adaptive settings live in the Assessment Settings page under the "Adaptive" tab.
 *
 * Redirect to the assessment settings page.
 */
export default function AdaptiveBlueprintRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/questions/settings?module=aptitude");
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent mx-auto" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Redirecting to Assessment Settings…
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Adaptive Blueprint is now automatic. Configure it in the{" "}
          <strong className="text-brand-green">Adaptive</strong> tab of Assessment Settings.
        </p>
      </div>
    </div>
  );
}
