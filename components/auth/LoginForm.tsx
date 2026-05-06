"use client";

import React, { useState, FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const validateEmail = (email: string) => {
    if (!email) return "Email ID is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required.";
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      {generalError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 animate-fade-in text-sm font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {generalError}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-foreground/70 dark:text-foreground/90">
          Email ID
        </label>
        <input
          type="email"
          id="email"
          placeholder="example@domain.com"
          className={`w-full px-5 py-4 rounded-full bg-secondary border transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.email ? "border-red-500" : "border-foreground/10 focus:border-primary"
          }`}
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1 px-2">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-foreground/70 dark:text-foreground/90">
          Password
        </label>
        <div className="relative">
          <input
            type={passwordVisible ? "text" : "password"}
            id="password"
            placeholder="Enter your password"
            className={`w-full px-5 py-4 pr-14 rounded-full bg-secondary border transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
              errors.password ? "border-red-500" : "border-foreground/10 focus:border-primary"
            }`}
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors"
          >
            {passwordVisible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1 px-2">{errors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 mt-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          "Login"
        )}
      </button>

      <div className="text-center mt-2">
        <a href="#" className="text-sm font-medium text-primary hover:underline">
          Forgot Password?
        </a>
      </div>
    </form>
  );
};

export default LoginForm;
