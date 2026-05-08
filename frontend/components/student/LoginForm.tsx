'use client';

import React, { useState, FormEvent, FocusEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeOffIcon } from '../icons';
import { useSession } from '@/lib/contexts/SessionContext';
// import { signIn, fetchAuthSession, signOut } from 'aws-amplify/auth';
// import { configureAmplify } from '../../lib/aws-amplify-config.js';

// configureAmplify(); // ensure Amplify is configured

interface LoginFormProps {
  onLoginSuccess?: (userName?: string) => void;
  buttonClass?: string;
  portalMode?: 'student' | 'corporate' | 'admin';
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  buttonClass: _buttonClass,
  portalMode: _portalMode,
}) => {
  const router = useRouter();
  const { login } = useSession();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const validateEmail = (email: string) => {
    if (!email) return 'Email ID is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required.';
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setGeneralError('');

    if (touched[name as keyof typeof touched]) {
      if (name === 'email') {
        setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
      }
      if (name === 'password') {
        setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
      }
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (name === 'email' && value) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    } else if (name === 'email' && !value) {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
    if (name === 'password') {
      setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({ email: '', password: '' });

    const emailErr = validateEmail(values.email);
    const passErr = validatePassword(values.password);

    if (emailErr || passErr) {
      setErrors({ email: emailErr, password: passErr });
      return;
    }

    setIsSubmitting(true);

    try {
      const authServiceUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4002';
      const studentServiceUrl = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:4004';

      // 1. Authenticate with Auth Service (Cognito Login)
      const loginRes = await fetch(`${authServiceUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json().catch(() => null);
        throw new Error(errData?.message || 'Invalid email or password.');
      }

      const loginData = await loginRes.json();
      const accessToken = loginData.AuthenticationResult?.AccessToken || "";
      const idToken = loginData.AuthenticationResult?.IdToken || "";

      // 2. Retrieve Student Profile to get the correct display name
      let displayName = '';
      try {
        const profileRes = await fetch(`${studentServiceUrl}/student/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: values.email }),
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          displayName = profileData?.fullName || profileData?.metadata?.fullName || '';
        }
      } catch (profileErr) {
        console.error('Failed to fetch user profile, falling back to email name', profileErr);
      }

      // Fallback name if profile fetch has no name or fails
      if (!displayName) {
        const emailPart = values.email.split('@')[0];
        displayName = emailPart
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }

      // 3. Update session reactively (which will also save to localStorage)
      login(accessToken, idToken, {
        name: displayName,
        email: values.email,
        joinedAt: new Date().toISOString(),
      });

      if (onLoginSuccess) {
        onLoginSuccess(displayName);
      }

    } catch (error: any) {
      setGeneralError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmailInvalid = touched.email && !!errors.email;
  const isPasswordInvalid = touched.password && !!errors.password;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>

      {generalError && (
        <div className="flex items-center gap-2 px-1 animate-fade-in text-red-500 dark:text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">{generalError}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block font-sans text-[clamp(14px,0.9vw,18px)] font-semibold text-slate-500 dark:text-white mb-2 leading-none tracking-[0px]"
        >
          Email ID
        </label>
        <input
          type="email"
          name="email"
          id="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className={`bg-brand-light-secondary dark:bg-brand-dark-tertiary border text-slate-800 dark:text-brand-text-primary placeholder:text-slate-400 dark:placeholder:text-brand-text-secondary font-sans text-[clamp(14px,0.83vw,16px)] font-normal leading-none tracking-[0px] rounded-full block w-full transition-colors duration-300 ${isEmailInvalid
            ? "border-red-500 focus:ring-red-500 focus:border-red-500"
            : "border-brand-light-tertiary dark:border-brand-dark-tertiary focus:ring-brand-green focus:border-brand-green"
            }`}
          style={{ padding: 'clamp(14px,1vw,20px)' }}
          placeholder="example@domain.com"
          disabled={isSubmitting}
          aria-invalid={isEmailInvalid}
        />
        {isEmailInvalid && (
          <div className="flex items-center gap-2 px-1 animate-fade-in text-red-500 dark:text-red-400 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{errors.email}</span>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block font-sans text-[14px] font-semibold text-slate-500 dark:text-white mb-2 leading-none tracking-[0px]"
        >
          Password
        </label>
        <div className="relative">
          <input
            type={passwordVisible ? "text" : "password"}
            name="password"
            id="password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password"
            className={`bg-brand-light-secondary dark:bg-brand-dark-tertiary border text-slate-800 dark:text-brand-text-primary placeholder:text-slate-400 dark:placeholder:text-brand-text-secondary font-sans text-[clamp(14px,0.83vw,16px)] font-normal leading-none tracking-[0px] rounded-full block w-full pr-16 transition-colors duration-300 ${isPasswordInvalid
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-brand-light-tertiary dark:border-brand-dark-tertiary focus:ring-brand-green focus:border-brand-green"
              }`}
            style={{ padding: 'clamp(14px,1vw,20px)', paddingRight: '4rem' }}
            disabled={isSubmitting}
            aria-invalid={isPasswordInvalid}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 cursor-pointer flex items-center pr-4 text-brand-text-light-secondary hover:text-brand-text-light-primary dark:text-brand-text-secondary dark:hover:text-white transition-colors duration-300"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            {passwordVisible ? (
              <EyeIcon className="h-5 w-5 text-brand-green" />
            ) : (
              <EyeOffIcon className="h-5 w-5 text-brand-green" />
            )}
          </button>
        </div>
        {isPasswordInvalid && (
          <div className="flex items-center gap-2 px-1 animate-fade-in text-red-500 dark:text-red-400 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{errors.password}</span>
          </div>
        )}

        <div className="flex justify-end mt-3">
          <Link
            href="/student/forgot-password"
            className="text-sm text-slate-500 dark:text-brand-text-secondary hover:text-brand-green transition-colors font-semibold"
          >
            Forgot Password?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ padding: 'clamp(14px,1vw,20px)' }}
        className="w-full mt-4 text-white bg-brand-green cursor-pointer hover:bg-brand-green/90 font-sans font-semibold rounded-full text-[clamp(16px,1vw,20px)] leading-none tracking-[0px] text-center transition-colors duration-300 disabled:bg-brand-green/50 disabled:cursor-not-allowed flex justify-center items-center" aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : 'Login'}
      </button>

    </form>
  );
};

export default LoginForm;
