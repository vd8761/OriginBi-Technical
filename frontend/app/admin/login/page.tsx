"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { configureAmplify } from "@/lib/aws-amplify-config";
import { setAdminTokens, loginUser } from "@/lib/api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/contexts/ThemeContext";
import {
  EmailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { ShieldAlert } from "lucide-react";

configureAmplify();

/* ── Helpers ── */

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (
      msg.includes("not part of group 'ADMIN'") ||
      msg.includes("Access denied. User is not part of group") ||
      msg.includes("Access denied. You do not have permission")
    ) {
      return "Access denied. You do not have permission to access the admin portal.";
    }
    return msg;
  }
  return "Invalid administrative credentials. Please verify your entries.";
}

function getSafeRedirect(param: string | null): string {
  if (param && param.startsWith("/admin") && !param.startsWith("/admin/login")) {
    return param;
  }
  return "/admin";
}

/* ── Branding Pattern (left column) ── */

function BrandingPattern({ isDark }: { isDark: boolean }) {
  const logoSrc = isDark ? "/Origin-BI-white-logo.png" : "/Origin-BI-Logo-01.png";
  const barCount = 16;

  return (
    <div className="admin-login-branding">
      {/* Vertical bar pattern */}
      <div className="admin-login-pattern">
        {Array.from({ length: barCount }, (_, i) => (
          <div
            key={i}
            className="admin-login-pattern-bar"
            style={{
              background: `linear-gradient(180deg,
                rgba(30, 211, 106, ${isDark ? 0.01 + (i % 6) * 0.015 : 0.03 + (i % 6) * 0.02}) 0%,
                rgba(30, 211, 106, ${isDark ? 0.05 + (i % 4) * 0.025 : 0.08 + (i % 4) * 0.03}) 50%,
                rgba(30, 211, 106, 0) 100%)`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="admin-login-branding-logo">
        <Image src={logoSrc} alt="OriginBI Logo" width={140} height={46} />
      </div>

      {/* Tagline */}
      <div className="admin-login-branding-tagline">
        <h2>
          OriginBi<br />Technical Assessment
        </h2>
        <p>
          The comprehensive platform for evaluating<br />and scaling technical talent.
        </p>
      </div>

      {/* Bottom glow */}
      <div className="admin-login-branding-glow" />
    </div>
  );
}

/* ── Login Form ── */

function AdminLoginForm() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const safeNext = getSafeRedirect(searchParams.get("next"));
  const isDark = mounted ? theme === "dark" : false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* Auto-redirect if already authenticated */
  useEffect(() => {
    const adminSession = localStorage.getItem("originbi:admin-session");
    const idToken = localStorage.getItem("originbi:admin-id-token");
    if (adminSession === "true" && idToken) {
      router.push(safeNext);
    }
  }, [router, safeNext]);

  /* Form submission */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await loginUser(email, password, { group: "ADMIN" });
      const tokens = session.tokens;

      if (!tokens?.accessToken || !tokens.idToken) {
        throw new Error("Auth service did not return a complete token set.");
      }

      const idTokenJwt = tokens.idToken;
      const accessTokenJwt = tokens.accessToken;
      const refreshTokenJwt = tokens.refreshToken || "";

      // The admin/me endpoint lives on the assessment service (port 5000),
      // proxied via Next.js /api/* → http://localhost:5000/api/*.
      const proxyUrl = `/api/admin/me`;

      const res = await fetch(proxyUrl, {
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
        setError(backendMessage);
        return;
      }

      const data = await res.json();
      const backendUser = data.user || {};
      const backendRegistration = session.registration;

      const isAdmin =
        backendUser.isAdmin === true ||
        ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(String(backendUser.role || "").toUpperCase());

      if (!isAdmin) {
        setError("You are not allowed to access this portal with these credentials.");
        return;
      }

      /* Persist tokens across all required storage keys */
      setAdminTokens({
        accessToken: accessTokenJwt,
        idToken: idTokenJwt,
        refreshToken: refreshTokenJwt || undefined,
      });

      // NOTE: Do NOT write to the student token namespace (originbi:access-token /
      // originbi:id-token). SessionContext.loadSession() watches those keys and
      // will call logout() — which clears originbi:admin-session — if it finds a
      // token there without a matching student profile, causing an immediate
      // redirect back to the login page.

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
    <>
      {/* Autofill override for themed inputs */}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px ${isDark ? "#1a1d1b" : "#f0f2f1"} inset !important;
          -webkit-text-fill-color: var(--foreground) !important;
        }
        ::selection {
          background: rgba(30, 211, 106, 0.3);
          color: inherit;
        }
      `}</style>

      <div className="admin-login-card" data-theme={mounted ? (isDark ? "dark" : "light") : "light"}>
        {/* Left column — Branding (desktop only) */}
        <BrandingPattern isDark={isDark} />

        {/* Right column — Form */}
        <div className="admin-login-form-column">
          <div className="admin-login-theme-toggle">
            <ThemeToggle />
          </div>

          <header className="admin-login-header">
            <h1>Login</h1>
            <p>Welcome back. Please authenticate to continue.</p>
          </header>

          <form onSubmit={handleSubmit} className="admin-login-form">
            {/* Email field */}
            <div className="admin-login-field">
              <label htmlFor="admin-email">Email</label>
              <div className="admin-login-input-group">
                <EmailIcon className="w-5 h-5 text-[var(--admin-green)]" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@originbi.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-login-input-group">
                <LockIcon className="w-5 h-5 text-[var(--admin-green)]" />
                <input
                  id="admin-password"
                  type={passwordVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="admin-login-eye-btn"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible
                    ? <EyeIcon className="w-5 h-5" />
                    : <EyeOffIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="admin-login-error">
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="admin-login-submit"
            >
              {success ? (
                "Authorized"
              ) : isSubmitting ? (
                "Authenticating..."
              ) : (
                <>Login <ArrowRightIcon className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/* ── Page export ── */

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
