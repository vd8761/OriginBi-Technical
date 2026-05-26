"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { confirmResetPassword } from "aws-amplify/auth";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "../icons";
import Logo from "../ui/Logo";
import { configureAmplify } from "@/lib/aws-amplify-config";

const ResetPasswordForm: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Make sure Amplify is configured for Cognito calls
    configureAmplify();

    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/[\W_]/.test(pwd)) return "Password must contain at least one special character.";
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email) {
      setError("Email address is required.");
      return;
    }
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await confirmResetPassword({
        username: email,
        confirmationCode: otp,
        newPassword: newPassword,
      });
      setSuccessMessage("Your password has been updated successfully.");
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "Unable to reset password. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, router]);

  // Success screen overlay
  if (successMessage && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] w-full h-full bg-[#FAFAFA] dark:bg-brand-dark-primary flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-green/5 dark:bg-brand-green/10 rounded-full blur-[100px]" />
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-[440px] bg-white/90 dark:bg-[#111814]/90 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center space-y-6">
          <Logo className="h-10 w-auto" />

          {/* Success circle icon */}
          <div className="relative w-20 h-20 bg-brand-green/10 dark:bg-brand-green/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Password Updated!
            </h2>
            <p className="text-black/60 dark:text-white/60 text-sm font-medium leading-relaxed">
              {successMessage} You can now log in using your new credentials.
            </p>
          </div>

          <div className="w-full space-y-4 pt-2">
            <Link
              href="/"
              className="w-full h-12 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-full shadow-md transition-all active:scale-[0.98] flex items-center justify-center text-sm"
            >
              Go to Login
            </Link>

            <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
              Redirecting in 5s
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      {/* Email Display (Static Text) */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60 ml-1">
          Email ID
        </label>
        <div className="text-base font-bold text-black dark:text-white px-1 tracking-wide truncate">
          {email}
        </div>
      </div>

      {/* OTP Field - 6 Digit Split Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60 ml-1">
          Verification Code (OTP)
        </label>
        <div className="flex justify-between gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength={1}
              autoFocus={index === 0}
              value={otp[index] || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (!val && !e.target.value) {
                  const newOtp = otp.split("");
                  newOtp[index] = "";
                  setOtp(newOtp.join(""));
                  return;
                }
                if (val) {
                  const newOtp = otp.split("");
                  newOtp[index] = val;
                  setOtp(newOtp.join(""));
                  if (index < 5) {
                    const nextInput = document.getElementById(`otp-${index + 1}`);
                    nextInput?.focus();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace") {
                  if (!otp[index] && index > 0) {
                    const prevInput = document.getElementById(`otp-${index - 1}`);
                    prevInput?.focus();
                  }
                  const newOtp = otp.split("");
                  newOtp[index] = "";
                  setOtp(newOtp.join(""));
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                if (pastedData) {
                  setOtp(pastedData);
                  const focusIndex = Math.min(pastedData.length, 5);
                  document.getElementById(`otp-${focusIndex}`)?.focus();
                }
              }}
              className="w-full aspect-square bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary text-black dark:text-white text-lg font-bold rounded-2xl text-center outline-none focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-all"
              required
              disabled={isSubmitting}
            />
          ))}
        </div>
      </div>

      {/* New Password Field */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60 ml-1">
          New Password
        </label>
        <div className="relative">
          <input
            type={passwordVisible ? "text" : "password"}
            value={newPassword}
            onChange={(e) => {
              const val = e.target.value;
              setNewPassword(val);
              // Real-time validation
              if (val.length > 0) {
                if (val.length < 8) setError("Password must be at least 8 characters long.");
                else if (!/[A-Z]/.test(val)) setError("Password must contain at least one uppercase letter.");
                else if (!/[a-z]/.test(val)) setError("Password must contain at least one lowercase letter.");
                else if (!/[0-9]/.test(val)) setError("Password must contain at least one number.");
                else if (!/[\W_]/.test(val)) setError("Password must contain at least one special character.");
                else setError(""); // Clear if valid
              } else {
                setError("");
              }
            }}
            className="w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary text-black dark:text-white text-sm font-normal rounded-full px-5 pr-12 outline-none focus:ring-brand-green focus:border-brand-green transition-colors"
            placeholder="Min 8 characters, upper, lower, digit, symbol"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-green hover:text-brand-green/80 transition-colors"
            tabIndex={-1}
          >
            {passwordVisible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60 ml-1">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            type={confirmPasswordVisible ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              const val = e.target.value;
              setConfirmPassword(val);
              if (val && newPassword && val !== newPassword) {
                setError("Passwords do not match.");
              } else if (val && newPassword && val === newPassword) {
                const pwdError = validatePassword(newPassword);
                setError(pwdError);
              }
            }}
            className="w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary text-black dark:text-white text-sm font-normal rounded-full px-5 pr-12 outline-none focus:ring-brand-green focus:border-brand-green transition-colors"
            placeholder="Repeat new password"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-green hover:text-brand-green/80 transition-colors"
            tabIndex={-1}
          >
            {confirmPasswordVisible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200 text-red-500 dark:text-red-400 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 mt-2 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-full shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:bg-brand-green/50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          "Reset Password"
        )}
      </button>

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

export default ResetPasswordForm;
