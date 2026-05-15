"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react";
import { signIn, fetchAuthSession, signOut } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/aws-amplify-config";
import { setAdminTokens } from "@/lib/api";

configureAmplify();

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Invalid administrative credentials. Please verify your entries.";
}

function AdminLoginForm() {
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
    const idToken = localStorage.getItem("originbi:admin-id-token");
    if (adminSession === "true" && idToken) {
      router.push(safeNext);
    }
  }, [router, safeNext]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      try {
        await signOut();
      } catch {
        // Ignore stale Cognito sessions.
      }

      const signInResult = await signIn({ username: email, password });
      if (!signInResult.isSignedIn) {
        setError("Your account login needs an additional step. Please contact the administrator.");
        return;
      }

      const session = await fetchAuthSession();
      const tokens = session.tokens;
      if (!tokens?.accessToken) {
        setError("Login session could not be created. Please try again.");
        return;
      }

      const idTokenJwt = tokens.idToken?.toString() || "";
      const idGroups = (tokens.idToken?.payload["cognito:groups"] as string[]) || [];
      const accessGroups = (tokens.accessToken?.payload["cognito:groups"] as string[]) || [];
      const groups = [...new Set([...idGroups, ...accessGroups])];

      if (!groups.includes("ADMIN")) {
        await signOut();
        setError("You are not allowed to access this portal with these credentials.");
        return;
      }

      // Auth/admin endpoints live on the NestJS assessment-service. Prefer
      // the legacy ADMIN_API_BASE_URL if someone set it, otherwise fall back
      // to the documented NEXT_PUBLIC_AUTH_SERVICE_URL.
      const apiBase = (
        process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ||
        process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ||
        ""
      ).replace(/\/$/, "");
      if (!apiBase) {
        throw new Error(
          "Auth service URL not configured. Set NEXT_PUBLIC_AUTH_SERVICE_URL in frontend/.env.local.",
        );
      }

      const res = await fetch(`${apiBase}/admin/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idTokenJwt}`,
          "X-User-Context": JSON.stringify({ email }),
        },
      });

      if (!res.ok) {
        let backendMessage = "Unable to verify your administrative access.";
        try {
          const data = await res.json();
          if (data && typeof data.message === "string") backendMessage = data.message;
        } catch {
          // Keep fallback message.
        }
        await signOut();
        setError(backendMessage);
        return;
      }

      const data = await res.json();
      const backendUser = data.user || {};
      const metadata = backendUser.metadata || {};

      const accessTokenJwt = tokens.accessToken?.toString() || idTokenJwt;
      const refreshTokenJwt =
        (session.tokens && (session.tokens as { refreshToken?: { toString(): string } }).refreshToken?.toString()) || "";
      // Keep admin auth in its own namespace so the student SessionProvider
      // on `/` never mistakes an admin login for a candidate session.
      setAdminTokens({
        accessToken: accessTokenJwt,
        idToken: idTokenJwt,
        refreshToken: refreshTokenJwt || undefined,
      });
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
          name: metadata.fullName || backendUser.email?.split("@")[0] || "Admin",
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
