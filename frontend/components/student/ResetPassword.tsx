"use client";

import React, { Suspense } from "react";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import ResetPasswordForm from "./ResetPasswordForm";
import TechIcons from "../auth/TechIcons";
import { DotPattern } from "../ui/dot-pattern";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion } from "motion/react";

const ResetPasswordContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-[#FAFAFA] dark:bg-brand-dark-primary transition-colors duration-300">
      {/* ═══ DOT PATTERN BACKGROUND ═══ */}
      <DotPattern
        width={22}
        height={22}
        cx={1}
        cy={1}
        cr={1.2}
        className="text-brand-green/20 dark:text-brand-green/15"
        style={{
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* ═══ SUBTLE GRADIENT OVERLAYS ═══ */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-brand-green/[0.04] rounded-full blur-[120px] dark:bg-brand-green/[0.03]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-emerald-400/[0.04] rounded-full blur-[100px] dark:bg-emerald-400/[0.02]" />
      </div>

      {/* ═══ FLOATING TECH ICONS ═══ */}
      <TechIcons />

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="relative z-10 w-full min-h-[100dvh] flex flex-col items-center px-4 sm:px-6 py-12 pt-[clamp(80px,12vh,160px)]">
        {/* Header Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4">
          <div className="w-[clamp(90px,7vw,130px)]">
            <Logo className="w-full h-auto object-contain" />
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </header>

        {/* Central Card */}
        <div className="w-full max-w-[480px]">
          <div className="text-center mb-8">
            <h1 className="font-sans font-bold text-black dark:text-white tracking-tight leading-tight text-[clamp(24px,3vw,36px)]">
              Choose New <span className="text-brand-green">Password</span>
            </h1>
            <p className="font-sans text-black/60 dark:text-white/60 font-normal tracking-normal leading-relaxed mt-2 text-[clamp(13px,1vw,15px)]">
              Enter the 6-digit OTP code received and set a new password
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white/80 dark:bg-[#111814]/80 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)] rounded-3xl p-6 sm:p-8 transition-all duration-300"
          >
            <ResetPasswordForm />
          </motion.div>

          {/* Footer */}
          <footer className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between text-[clamp(11px,0.8vw,13px)] font-medium text-black dark:text-white gap-3">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-brand-green transition-colors underline underline-offset-2 text-black/60 dark:text-white/60">
                Privacy Policy
              </a>
              <span className="border-r border-black/20 dark:border-white/20 h-3 hidden sm:block" />
              <a href="#" className="hover:text-brand-green transition-colors underline underline-offset-2 text-black/60 dark:text-white/60">
                Terms & Conditions
              </a>
            </div>
            <span className="text-black/60 dark:text-white/60">&copy; OriginBI {new Date().getFullYear()}</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

const ResetPassword: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-brand-dark-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPassword;
