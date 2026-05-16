"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { configureAmplify } from "@/lib/aws-amplify-config";
import { setAdminTokens } from "@/lib/api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { 
  EmailIcon, 
  LockIcon, 
  EyeIcon, 
  EyeOffIcon, 
  ArrowRightIcon 
} from "@/components/icons";
import { ShieldAlert } from "lucide-react";

configureAmplify();
import { loginUser } from "@/lib/api";

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Invalid administrative credentials. Please verify your entries.";
}

function AdminLoginForm() {
  const router = useRouter();
  const { theme } = useTheme();
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
      const session = await loginUser(email, password, { group: "ADMIN" });
      const tokens = session.tokens;
      
      if (!tokens?.accessToken || !tokens.idToken) {
        throw new Error("Auth service did not return a complete token set.");
      }

      const idTokenJwt = tokens.idToken;
      const accessTokenJwt = tokens.accessToken;
      const refreshTokenJwt = tokens.refreshToken || "";

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

      setAdminTokens({
        accessToken: accessTokenJwt,
        idToken: idTokenJwt,
        refreshToken: refreshTokenJwt || undefined,
      });

      localStorage.setItem("originbi:id-token", idTokenJwt);
      localStorage.setItem("originbi:access-token", accessTokenJwt);
      if (refreshTokenJwt) localStorage.setItem("originbi:refresh-token", refreshTokenJwt);
      
      localStorage.setItem("originbi_id_token", idTokenJwt);
      localStorage.setItem("accessToken", accessTokenJwt);
      sessionStorage.setItem("idToken", idTokenJwt);
      sessionStorage.setItem("accessToken", accessTokenJwt);
      
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

  const isDark = theme === "dark";

  return (
    <>
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
      <div 
        className="flex flex-col md:flex-row w-full max-w-md md:max-w-[960px] min-h-[auto] md:min-h-[560px] p-1 md:p-3"
        style={{ 
          background: "var(--card)", 
          borderRadius: "32px", 
          overflow: "hidden",
          boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
          border: "1px solid var(--border)",
          position: "relative",
        }}>
        {/* Left Column - Branding/Visual (CSS Pattern) */}
        <div 
          className="hidden md:flex flex-1 flex-col justify-start relative overflow-hidden rounded-[24px] p-8 lg:p-[50px]"
          style={{ 
            background: isDark ? "#0a0c0b" : "#f1f5f3", 
          }}>
          
          {/* Vertical Bar CSS Pattern */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            display: "flex", 
            gap: "1px",
            opacity: isDark ? 0.8 : 0.65
          }}>
             {[...Array(16)].map((_, i) => (
               <div key={i} style={{ 
                 flex: 1, 
                 height: "100%", 
                 background: `linear-gradient(180deg, 
                   rgba(30, 211, 106, ${isDark ? 0.01 + (i % 6) * 0.015 : 0.03 + (i % 6) * 0.02}) 0%, 
                   rgba(30, 211, 106, ${isDark ? 0.05 + (i % 4) * 0.025 : 0.08 + (i % 4) * 0.03}) 50%, 
                   rgba(30, 211, 106, 0) 100%)`,
                 borderRight: isDark ? "1px solid rgba(255,255,255,0.02)" : "1px solid rgba(30, 211, 106, 0.12)"
               }} />
             ))}
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
             <Image 
                src={isDark ? "/Origin-BI-white-logo.png" : "/Origin-BI-Logo-01.png"} 
                alt="OriginBI Logo" 
                width={140} 
                height={46} 
                style={{ opacity: 1 }}
             />
          </div>

          {/* Branding Wording at Bottom */}
          <div style={{ 
            marginTop: "auto", 
            position: "relative", 
            zIndex: 2,
            paddingTop: "40px"
          }}>
            <h2 style={{ 
              fontSize: "24px", 
              fontWeight: 600, 
              color: isDark ? "white" : "var(--foreground)", 
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              marginBottom: "12px"
            }}>
              OriginBi<br />Technical Assessment
            </h2>
            <p style={{ 
              fontSize: "14px", 
              color: isDark ? "white" : "var(--foreground)", 
              fontWeight: 400,
              letterSpacing: "0.02em",
              opacity: 0.7 
            }}>
              The comprehensive platform for evaluating<br />and scaling technical talent.
            </p>
          </div>

          {/* Subtle glow at the bottom */}
          <div style={{ 
            position: "absolute", 
            bottom: "-20%", 
            left: "0", 
            right: "0", 
            height: "40%", 
            background: isDark 
              ? "radial-gradient(ellipse at center, rgba(30, 211, 106, 0.15) 0%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(30, 211, 106, 0.1) 0%, transparent 70%)",
            zIndex: 1
          }} />
        </div>

        {/* Right Column - Form */}
        <div 
          className="flex-1 p-4 md:p-10 lg:p-[50px]"
          style={{ 
            background: "var(--card)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative"
          }}>
          {/* Theme Toggle inside the card container */}
          <div style={{ position: "absolute", top: "24px", right: "24px", zIndex: 10 }}>
            <ThemeToggle />
          </div>

          <div style={{ marginBottom: "48px" }}>
            <h1 style={{ fontSize: "40px", fontWeight: 800, color: "var(--foreground)", marginBottom: "8px", letterSpacing: "-0.03em" }}>Login</h1>
            <p style={{ color: "var(--foreground)", fontSize: "16px" }}>Welcome back. Please authenticate to continue.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Email
              </label>
              <div style={{ 
                width: "100%", 
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", 
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                minHeight: "56px"
              }}>
                <EmailIcon className="w-5 h-5 text-[var(--admin-green)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@originbi.com"
                  style={{ 
                    fontSize: "15px", 
                    color: "var(--foreground)", 
                    background: "none", 
                    border: "none", 
                    width: "100%",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Password
              </label>
              <div style={{ 
                width: "100%", 
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", 
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                minHeight: "56px"
              }}>
                <LockIcon className="w-5 h-5 text-[var(--admin-green)]" />
                <input
                  type={passwordVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  style={{ 
                    fontSize: "15px", 
                    color: "var(--foreground)", 
                    background: "none", 
                    border: "none", 
                    width: "100%",
                    outline: "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((value) => !value)}
                  style={{ padding: "6px", color: "var(--admin-green)", border: "none", background: "none", cursor: "pointer" }}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible ? <EyeIcon className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: "14px", 
                borderRadius: "10px", 
                fontSize: "14px", 
                display: "flex", 
                alignItems: "center", 
                background: "rgba(237, 47, 52, 0.1)", 
                color: "#ed2f34",
                border: "1px solid rgba(237, 47, 52, 0.2)"
              }}>
                <ShieldAlert size={18} style={{ marginRight: "10px", flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting || success} 
              style={{ 
                width: "100%", 
                minHeight: "56px", 
                marginTop: "12px",
                fontSize: "16px",
                fontWeight: 600,
                background: "var(--admin-green)",
                color: "white",
                border: "1px solid transparent",
                borderRadius: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s ease"
              }}
            >
              {success ? (
                <>Authorized</>
              ) : isSubmitting ? (
                "Authenticating..."
              ) : (
                <>
                  Login <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
