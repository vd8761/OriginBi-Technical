"use client";

import React, { useState } from "react";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import LoginForm from "./LoginForm";
import SignupForm from "../auth/SignupForm";
import TechIcons from "../auth/TechIcons";
import { DotPattern } from "../ui/dot-pattern";
import { useTheme } from "@/lib/contexts/ThemeContext";

import { AnimatePresence, motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (userName?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

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

      {/* ═══ MAIN CONTENT — TOP-ANCHORED FOR DOWNWARD GROWTH ═══ */}
      <div className="relative z-10 w-full min-h-[100dvh] flex flex-col items-center px-4 sm:px-6 py-12 pt-[clamp(80px,12vh,160px)]">
        {/* Header Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4">
          <div className="w-[clamp(90px,7vw,130px)]">
            <Logo className="w-full h-auto object-contain" />
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </header>

        {/* Central Auth Card */}
        <div className="w-full max-w-[480px]">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 className="font-sans font-bold text-brand-text-light-primary dark:text-brand-text-primary tracking-tight leading-tight text-[clamp(24px,3vw,36px)]">
              {activeTab === "login" ? (
                <>
                  Welcome <span className="text-brand-green">Back</span>
                </>
              ) : (
                <>
                  Start your <span className="text-brand-green">Journey</span>
                </>
              )}
            </h1>
            <p className="font-sans text-brand-text-light-secondary dark:text-brand-text-secondary font-normal tracking-normal leading-relaxed mt-2 text-[clamp(13px,1vw,15px)]">
              {activeTab === "login"
                ? "Login to access your technical assessments"
                : "Create your account to begin your assessment"
              }
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="relative w-full bg-brand-light-tertiary/60 dark:bg-brand-dark-tertiary rounded-full p-1 flex h-12 mb-8 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 text-sm font-semibold uppercase tracking-wider rounded-full transition-all duration-300 cursor-pointer z-10 ${
                activeTab === "login"
                  ? "bg-brand-green text-white"
                  : "text-slate-500 dark:text-brand-text-secondary hover:text-brand-green"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className={`flex-1 text-sm font-semibold uppercase tracking-wider rounded-full transition-all duration-300 cursor-pointer z-10 ${
                activeTab === "signup"
                  ? "bg-brand-green text-white"
                  : "text-slate-500 dark:text-brand-text-secondary hover:text-brand-green"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Card */}
          <motion.div 
            layout
            initial={false}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white/80 dark:bg-[#111814]/80 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)] rounded-3xl p-6 sm:p-8 transition-all duration-300"
          >
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "login" ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <LoginForm onLoginSuccess={(name) => onLoginSuccess(name)} />
                  <div className="text-center mt-6 pt-4 border-t border-brand-light-tertiary/50 dark:border-white/5">
                    <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("signup")}
                        className="text-brand-green font-semibold hover:underline transition-all cursor-pointer"
                      >
                        Sign Up
                      </button>
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-form"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <SignupForm />
                  <div className="text-center mt-6 pt-4 border-t border-brand-light-tertiary/50 dark:border-white/5">
                    <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="text-brand-green font-bold hover:underline transition-all cursor-pointer"
                      >
                        Login
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <footer className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between text-[clamp(11px,0.8vw,13px)] font-medium text-brand-text-light-secondary dark:text-brand-text-secondary gap-3">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-brand-green transition-colors underline underline-offset-2">
                Privacy Policy
              </a>
              <span className="border-r border-brand-light-tertiary dark:border-white/20 h-3 hidden sm:block" />
              <a href="#" className="hover:text-brand-green transition-colors underline underline-offset-2">
                Terms & Conditions
              </a>
            </div>
            <span>&copy; OriginBI {new Date().getFullYear()}</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
