"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react";
import { loginUser } from "@/lib/api";

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Invalid administrative credentials. Please verify your entries.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/admin") && !nextParam.startsWith("/admin/login")
    ? nextParam
    : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const adminSession = localStorage.getItem("originbi:admin-session");
    const idToken = localStorage.getItem("originbi:id-token");
    if (adminSession === "true" && idToken) {
      router.push(safeNext);
    }
  }, [router, safeNext]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await loginUser(email, password, { group: "ADMIN" });
      const tokens = session.tokens;
      const backendUser = session.user || {};
      const backendRegistration = session.registration;
      const isAdmin =
        backendUser.isAdmin === true ||
        ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(String(backendUser.role || "").toUpperCase());

      if (!tokens?.accessToken || !tokens.idToken || !isAdmin) {
        localStorage.removeItem("originbi:admin-session");
        localStorage.removeItem("originbi:access-token");
        localStorage.removeItem("originbi:id-token");
        localStorage.removeItem("originbi:refresh-token");
        setError("You are not allowed to access this portal with these credentials.");
        return;
      }

      // Token keys MUST match what lib/api.ts reads (ACCESS_TOKEN_KEY /
      // ID_TOKEN_KEY) and what AdminGuard checks. Previously these were
      // written under legacy underscore/bare names, so apiFetch sent no
      // Authorization header → every request 401'd → guard bounced back to
      // login → loop. Keep the legacy keys around too in case anything else
      // still reads them, but the colon-dash keys are the source of truth.
      const accessTokenJwt = tokens.accessToken;
      const idTokenJwt = tokens.idToken;
      const refreshTokenJwt = tokens.refreshToken || "";
      localStorage.setItem("originbi:id-token", idTokenJwt);
      localStorage.setItem("originbi:access-token", accessTokenJwt);
      if (refreshTokenJwt) localStorage.setItem("originbi:refresh-token", refreshTokenJwt);
      // Legacy keys — kept for any older code paths that haven't migrated.
      localStorage.setItem("originbi_id_token", idTokenJwt);
      localStorage.setItem("accessToken", accessTokenJwt);
      sessionStorage.setItem("idToken", idTokenJwt);
      sessionStorage.setItem("accessToken", accessTokenJwt);
      // Cookie used by the older proxy setup.
      document.cookie = `obi.accessToken=${accessTokenJwt}; path=/; samesite=lax; max-age=${60 * 60 * 24 * 7}`;
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: backendUser.id || 0,
          name: backendRegistration?.fullName || backendUser.email?.split("@")[0] || "Admin",
          email: backendUser.email || email,
          role: "ADMIN",
        }),
      );
      localStorage.setItem("originbi:admin-session", "true");

      setSuccess(true);
      setTimeout(() => router.push(safeNext), 700);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <section className="admin-grid-2" style={{ alignItems: "stretch" }}>
        <div className="admin-card admin-card-pad" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 420 }}>
          <div>
            <p className="admin-page-eyebrow">Secure Access</p>
            <h2 className="admin-page-title">Admin Portal</h2>
            <p className="admin-page-copy">
              Sign in with an Origin BI administrator account to manage question banks, assessments, plugins, and candidate support.
            </p>
          </div>
          <div className="admin-grid-2">
            <div className="admin-card admin-card-pad">
              <p className="admin-stat-label">Question Banks</p>
              <p className="admin-stat-value">5</p>
              <p className="admin-stat-sub">Coding, aptitude, MNC, role, communication</p>
            </div>
            <div className="admin-card admin-card-pad">
              <p className="admin-stat-label">Controls</p>
              <p className="admin-stat-value">24</p>
              <p className="admin-stat-sub">Plugin and exam settings</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-card admin-card-pad admin-stack" style={{ minHeight: 420 }}>
          <div style={{ textAlign: "center" }}>
            <span className="admin-module-icon" style={{ margin: "0 auto 14px", background: "rgba(30,211,106,0.14)", color: "var(--admin-green)" }}>
              <Lock size={20} />
            </span>
            <h1 className="admin-card-title" style={{ fontSize: 22 }}>Authenticate</h1>
            <p className="admin-card-subtitle">Origin BI Technical Hub</p>
          </div>

          <label className="admin-form-label">
            Administrative Email
            <span className="admin-search" style={{ width: "100%" }}>
              <Mail size={15} />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@touchmarkdes.com"
              />
            </span>
          </label>

          <label className="admin-form-label">
            Portal Password
            <span className="admin-search" style={{ width: "100%" }}>
              <Lock size={15} />
              <input
                type={passwordVisible ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((value) => !value)}
                className="admin-btn admin-btn-ghost"
                style={{ minHeight: 28, padding: 6 }}
                aria-label={passwordVisible ? "Hide password" : "Show password"}
              >
                {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>

          {error && (
            <div className="admin-error">
              <ShieldAlert size={15} style={{ verticalAlign: "middle", marginRight: 8 }} />
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting || success} className="admin-btn admin-btn-primary" style={{ width: "100%", minHeight: 46 }}>
            {success ? (
              <>
                <CheckCircle size={16} /> Authorized
              </>
            ) : isSubmitting ? (
              "Authenticating..."
            ) : (
              <>
                Authenticate <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
