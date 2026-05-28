"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/api";

/**
 * Top-of-shell amber banner shown when the admin shell cannot reach the
 * exam-engine.
 *
 * The previous check warned when NEXT_PUBLIC_EXAM_ENGINE_URL was empty, but that's
 * actually the *canonical* config: `API_BASE === ""` makes apiFetch issue
 * relative URLs (e.g. `/v1/...`) which Next.js then rewrites server-side to
 * the exam-engine via the `rewrites()` block in `next.config.ts`. Warning on
 * empty was a false positive.
 *
 * Instead, do the real check: hit an admin endpoint that the rewrites already
 * handle and accept either a 2xx/3xx (everything fine) or a 401 (auth
 * required but the proxy + backend are reachable). Anything else — network
 * error, opaque Next 404 HTML, 5xx — means the wiring is broken and we
 * surface the banner.
 *
 * We deliberately ping a "real" path rather than `/healthz`: exam-engine
 * serves /healthz at the root, not under `/v1/`, and the Next.js rewrites
 * only cover `/v1/*`.
 */
export default function EnvWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = API_BASE || "";
    const url = `${base}/v1/admin/plugins?context=admin`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    fetch(url, {
      method: "GET",
      credentials: base === "" ? "same-origin" : "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (cancelled) return;
        // Treat any 2xx/3xx as proxy/backend reachable. 401 also fine — it
        // means we hit a real backend that just demands auth.
        setShow(!(res.ok || res.status === 401));
      })
      .catch(() => {
        if (cancelled) return;
        setShow(true);
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="admin-env-warning" role="status">
      <AlertTriangle size={16} />
      <div>
        Backend unreachable — admin requests to{" "}
        <code>/v1/admin/plugins</code> failed. Confirm the exam-engine is
        running and, if <code>NEXT_PUBLIC_EXAM_ENGINE_URL</code> is set, that its
        CORS allowlist permits this origin. For a single-host deploy, leave{" "}
        <code>NEXT_PUBLIC_EXAM_ENGINE_URL</code> unset so requests are proxied
        same-origin via <code>next.config.ts</code> rewrites.
      </div>
    </div>
  );
}
