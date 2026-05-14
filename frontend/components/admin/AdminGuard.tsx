"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const adminSession = localStorage.getItem("originbi:admin-session");
    const idToken = localStorage.getItem("originbi:id-token");
    const accessToken = localStorage.getItem("originbi:access-token");
    // Both signals must be present: the explicit admin gate AND a usable
    // Cognito token. Otherwise every request will 401 and the user is
    // stuck staring at error states with no way back to login.
    if (adminSession === "true" && (idToken || accessToken)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div
        className="admin-card admin-card-pad"
        style={{ display: "grid", minHeight: 360, placeItems: "center" }}
      >
        <div style={{ display: "grid", placeItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "999px",
              border: "4px solid rgba(30,211,106,0.16)",
              borderTopColor: "var(--admin-green)",
              animation: "admin-spin 0.8s linear infinite",
            }}
          />
          <p className="admin-page-eyebrow">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
