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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthorized(true);
    } else {
      router.push("/admin/login");
    }
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="admin-card admin-card-pad" style={{ display: "grid", minHeight: 360, placeItems: "center" }}>
        <div style={{ display: "grid", placeItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "999px",
              border: "4px solid rgba(30,211,106,0.16)",
              borderTopColor: "var(--admin-green)",
              animation: "coding-spin 0.8s linear infinite",
            }}
          />
          <p className="admin-page-eyebrow">
          Verifying authorization...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
