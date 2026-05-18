"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { STUDENT_API_BASE } from "@/lib/api";

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const validateEmail = (email: string) => {
    if (!email) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Initiate Reset via Student Backend proxy
      const initiateRes = await fetch(`${STUDENT_API_BASE}/forgot-password/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!initiateRes.ok) {
        const data = await initiateRes.json().catch(() => ({}));
        throw new Error(data.message || "Unable to initiate password reset.");
      }

      // 2. Success
      setSuccessMessage("Verification code sent! Please check your email inbox for the OTP.");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(err.message || "An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      {/* Email Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-black dark:text-white ml-1"
        >
          Email ID
        </label>
        <input
          type="email"
          id="email"
          value={email}
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${error
              ? "border-red-400 ring-1 ring-red-200"
              : "border-brand-light-tertiary dark:border-brand-dark-tertiary focus:ring-brand-green focus:border-brand-green"
            } rounded-full px-5 text-sm font-normal text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none transition-all`}
          placeholder="example@domain.com"
          required
          disabled={isSubmitting || !!successMessage}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200 text-red-500 dark:text-red-400 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Success Message & Proceed Call-to-action */}
      {successMessage && (
        <div className="space-y-5 text-center animate-in fade-in duration-300">
          <div className="p-4 bg-emerald-500/10 text-brand-green text-sm font-semibold rounded-2xl border border-brand-green/20">
            {successMessage}
          </div>
          <Link
            href={`/student/reset-password?email=${encodeURIComponent(email)}`}
            className="w-full h-12 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-full shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm group"
          >
            <span>Proceed to Reset Password</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </Link>
        </div>
      )}

      {!successMessage && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-full shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-sm disabled:bg-brand-green/50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Send Reset Code"
          )}
        </button>
      )}

      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-sm font-semibold text-black/60 dark:text-white/60 hover:text-brand-green dark:hover:text-brand-green transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
