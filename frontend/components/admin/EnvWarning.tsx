"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/api";

/**
 * Top-of-shell amber banner shown when NEXT_PUBLIC_API_BASE is not set.
 * Without it, all `apiFetch` calls go to the Next dev origin and the Next.js
 * 404 HTML body shows up as the error message — which used to look like the
 * page itself was 404'ing. Catching the misconfiguration prevents that.
 */
export default function EnvWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!API_BASE);
  }, []);

  if (!show) return null;

  return (
    <div className="admin-env-warning" role="status">
      <AlertTriangle size={16} />
      <div>
        Backend not configured — set{" "}
        <code>NEXT_PUBLIC_API_BASE</code> in <code>frontend/.env.local</code>{" "}
        (e.g. <code>http://localhost:8088</code>) so admin requests reach the
        exam-engine instead of the Next dev server.
      </div>
    </div>
  );
}
