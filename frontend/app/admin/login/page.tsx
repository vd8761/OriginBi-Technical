"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldAlert, CheckCircle } from "lucide-react";
import { signIn, fetchAuthSession, signOut } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/aws-amplify-config";

configureAmplify();

export default function AdminLoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If already logged in, redirect to questions
  useEffect(() => {
    const adminSession = localStorage.getItem("originbi:admin-session");
    if (adminSession === "true") {
      router.push("/admin/questions");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 0. Ensure no old session is hanging around
      try {
        await signOut();
      } catch (err) {}

      // 1. Sign in with Cognito
      const signInResult = await signIn({
        username: email,
        password: password,
      });

      if (!signInResult.isSignedIn) {
        setError("Your account login needs an additional step. Please contact the administrator.");
        return;
      }

      // 2. Get tokens & groups
      const session = await fetchAuthSession();
      const tokens = session.tokens;

      if (!tokens || !tokens.idToken) {
        setError("Login session could not be created. Please try again.");
        return;
      }

      const idTokenJwt = tokens.idToken.toString();

      const idGroups = (tokens.idToken.payload['cognito:groups'] as string[]) || [];
      const accessGroups = (tokens.accessToken?.payload['cognito:groups'] as string[]) || [];
      const groups = [...new Set([...idGroups, ...accessGroups])];

      // 3. Verify Admin Access
      if (!groups.includes('ADMIN')) {
        await signOut();
        setError("You are not allowed to access this portal with these credentials.");
        return;
      }

      // 4. Verify with backend
      const apiBase = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "http://localhost:4001";
      const res = await fetch(`${apiBase}/admin/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${idTokenJwt}` },
      });

      if (!res.ok) {
        let backendMessage = "Unable to verify your access.";
        try {
          const data = await res.json();
          if (data && typeof data.message === "string") backendMessage = data.message;
        } catch (err) {}
        await signOut();
        setError(backendMessage);
        return;
      }

      const data = await res.json();
      const backendUser = data.user || {};
      const metadata = backendUser.metadata || {};

      // 5. Store standard OriginBI session tokens
      localStorage.setItem("originbi_id_token", idTokenJwt);
      sessionStorage.setItem("idToken", idTokenJwt);
      sessionStorage.setItem("accessToken", idTokenJwt);
      
      localStorage.setItem("user", JSON.stringify({
        id: backendUser.id || 0,
        name: metadata.fullName || backendUser.email?.split('@')[0] || "Admin",
        email: backendUser.email || email,
        role: backendUser.role || "ADMIN",
      }));

      // Keep legacy token to immediately redirect inside originbi-technical
      localStorage.setItem("originbi:admin-session", "true");

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/questions");
      }, 800);

    } catch (err: any) {
      console.error("Cognito signIn or backend error:", err);
      const msg = err?.message || "Invalid administrative credentials. Please verify your entries.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#FAFAFA] dark:bg-brand-dark-primary transition-colors duration-500 font-sans flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Grids */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30 dark:opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-brand-green/[0.08] rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/[0.05] rounded-full blur-[100px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 bg-white/10 dark:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-gray-200/20 dark:border-transparent">
        <div className="w-28">
          <Logo className="w-full h-auto" />
        </div>
        <ThemeToggle />
      </header>

      {/* Login Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 dark:bg-[#111814]/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 shadow-2xl rounded-3xl p-8 sm:p-10">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Admin Portal</h1>
            <p className="text-xs text-slate-500 dark:text-brand-text-secondary mt-1 uppercase tracking-widest font-semibold">OriginBI Technical Hub</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-brand-text-secondary">Administrative Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@touchmarkdes.com"
                  className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-brand-text-secondary">Portal Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30">
                  <Lock size={16} />
                </span>
                <input
                  type={passwordVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-11 pr-11 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-brand-green transition-colors"
                >
                  {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Notification */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-semibold leading-relaxed"
                >
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="w-full relative flex items-center justify-center py-3.5 px-4 bg-brand-green hover:bg-brand-green/95 disabled:bg-brand-green/70 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand-green/25 hover:shadow-xl hover:shadow-brand-green/30 transition-all cursor-pointer active:scale-[0.98]"
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  />
                ) : success ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    <span>Authorized</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <span>Authenticate</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
