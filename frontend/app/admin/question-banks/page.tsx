"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Bare /admin/question-banks isn't a real bank page — the bank surfaces live
// under [module]/page.tsx. Send anyone landing here to the canonical coding
// bank route on mount; matches the same redirect the [module] route does when
// slug === "coding" so older bookmarks (and a typed URL like the user's)
// resolve cleanly instead of 404ing.
export default function QuestionBanksIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/coding");
  }, [router]);
  return null;
}
