'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updatePassword } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeOffIcon } from '../icons';
import Logo from '../ui/Logo';
import { completeFirstLogin } from '@/lib/api';
import { configureAmplify } from '@/lib/aws-amplify-config';

const FirstTimeResetForm: React.FC = () => {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [oldPasswordVisible, setOldPasswordVisible] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Make sure Amplify is configured
        configureAmplify();

        // Get email from session storage as user is logged in
        const storedEmail = sessionStorage.getItem('userEmail');
        if (storedEmail) {
            setEmail(storedEmail);
        } else {
            // Fallback to localStorage or just keep empty
            const localEmail = localStorage.getItem('userEmail');
            if (localEmail) setEmail(localEmail);
        }
    }, []);

    const validatePassword = (pwd: string) => {
        if (pwd.length < 8) return 'Password must be at least 8 characters long.';
        if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
        if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
        if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
        if (!/[\W_]/.test(pwd)) return 'Password must contain at least one special character.';
        return '';
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!oldPassword) {
            setError('Current password is required.');
            return;
        }

        const pwdError = validatePassword(newPassword);
        if (pwdError) {
            setError(pwdError);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (oldPassword === newPassword) {
            setError('New password cannot be the same as the old password.');
            return;
        }

        try {
            setIsSubmitting(true);

            // 1. Update Password in Cognito
            await updatePassword({ oldPassword, newPassword });

            // 2. Call Backend to update hasChangedPassword flag via our API helper
            if (email) {
                await completeFirstLogin(email).catch((err) => {
                    console.error('Failed to update first login status on backend', err);
                });
            }

            setSuccessMessage('Your password has been changed successfully.');

        } catch (err: any) {
            console.error('Change password error:', err);
            setError(err.message || 'Unable to change password. Please check your current password and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const iconColorClass = 'text-brand-green';

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(async () => {
                router.push('/explore');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, router]);

    // Success Screen
    if (successMessage && typeof document !== 'undefined') {
        return createPortal(
            <div className="fixed inset-0 z-[9999] w-full h-full bg-[#FAFAFA] dark:bg-[#090A0C] flex items-center justify-center p-4 animate-fade-in overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-green/5 dark:bg-brand-green/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
                </div>

                <div className="relative z-10 w-full max-w-[440px] bg-white/80 dark:bg-[#1A1D21]/90 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl p-8 md:p-10 flex flex-col items-center text-center space-y-8">
                    <div className="transform transition-transform hover:scale-105 duration-500">
                        <Logo className="h-10 md:h-12 w-auto" />
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-brand-green/20 rounded-full blur-xl animate-pulse-slow"></div>
                        <div className="relative w-24 h-24 bg-white dark:bg-[#24272B] rounded-full flex items-center justify-center shadow-lg ring-4 ring-brand-green/10">
                            <svg className="w-10 h-10 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    </div>
                    <div className="space-y-3 w-full">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            All Set!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed font-medium">
                            {successMessage}
                        </p>
                    </div>
                    <div className="w-full space-y-5">
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
                            Redirecting to Explore...
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
                {/* Email Display */}
                <div className="space-y-1">
                    <label className="block font-sans text-[clamp(14px,0.9vw,18px)] font-semibold text-black dark:text-white mb-2 leading-none tracking-[0px]">
                        Email ID
                    </label>
                    <div className="text-base font-semibold text-black dark:text-white px-1 tracking-wide truncate">
                        {email || 'Loading...'}
                    </div>
                </div>

                {/* Current Password Field */}
                <div>
                    <label className="block font-sans text-[clamp(14px,0.9vw,18px)] font-semibold text-black dark:text-white mb-2 leading-none tracking-[0px]">
                        Current Password
                    </label>
                    <div className="relative">
                        <input
                            type={oldPasswordVisible ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary text-black dark:text-white placeholder:text-black dark:placeholder:text-white font-sans text-[clamp(14px,0.83vw,16px)] font-normal leading-none tracking-[0px] rounded-full block w-full pr-16 transition-colors duration-300 focus:ring-brand-green focus:border-brand-green"
                            style={{ padding: 'clamp(14px,1vw,20px)', paddingRight: '4rem' }}
                            placeholder="Enter current password"
                            required
                            disabled={isSubmitting}
                        />
                        <button
                            type="button"
                            onClick={() => setOldPasswordVisible(!oldPasswordVisible)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4"
                            tabIndex={-1}
                        >
                            {oldPasswordVisible ? (
                                <EyeIcon className={`h-5 w-5 ${iconColorClass}`} />
                            ) : (
                                <EyeOffIcon className={`h-5 w-5 ${iconColorClass}`} />
                            )}
                        </button>
                    </div>
                </div>

                {/* New Password Field */}
                <div>
                    <label className="block font-sans text-[clamp(14px,0.9vw,18px)] font-semibold text-black dark:text-white mb-2 leading-none tracking-[0px]">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={passwordVisible ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                                const val = e.target.value;
                                setNewPassword(val);
                                if (val.length > 0) {
                                    const err = validatePassword(val);
                                    if (err && error && error !== 'Passwords do not match.') setError(err);
                                    else if (!err && error && error !== 'Passwords do not match.') setError('');
                                }
                            }}
                            className="bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary text-black dark:text-white placeholder:text-black dark:placeholder:text-white font-sans text-[clamp(14px,0.83vw,16px)] font-normal leading-none tracking-[0px] rounded-full block w-full pr-16 transition-colors duration-300 focus:ring-brand-green focus:border-brand-green"
                            style={{ padding: 'clamp(14px,1vw,20px)', paddingRight: '4rem' }}
                            placeholder="Min 8 chars, Upper, Lower, #, Symbol"
                            required
                            disabled={isSubmitting}
                        />
                        <button
                            type="button"
                            onClick={() => setPasswordVisible(!passwordVisible)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4"
                            tabIndex={-1}
                        >
                            {passwordVisible ? (
                                <EyeIcon className={`h-5 w-5 ${iconColorClass}`} />
                            ) : (
                                <EyeOffIcon className={`h-5 w-5 ${iconColorClass}`} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                    <label className="block font-sans text-[clamp(14px,0.9vw,18px)] font-semibold text-black dark:text-white mb-2 leading-none tracking-[0px]">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            type={confirmPasswordVisible ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                            }}
                            className="bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary text-black dark:text-white placeholder:text-black dark:placeholder:text-white font-sans text-[clamp(14px,0.83vw,16px)] font-normal leading-none tracking-[0px] rounded-full block w-full pr-16 transition-colors duration-300 focus:ring-brand-green focus:border-brand-green"
                            style={{ padding: 'clamp(14px,1vw,20px)', paddingRight: '4rem' }}
                            placeholder="Repeat new password"
                            required
                            disabled={isSubmitting}
                        />
                        <button
                            type="button"
                            onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4"
                            tabIndex={-1}
                        >
                            {confirmPasswordVisible ? (
                                <EyeIcon className={`h-5 w-5 ${iconColorClass}`} />
                            ) : (
                                <EyeOffIcon className={`h-5 w-5 ${iconColorClass}`} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 px-1 animate-fade-in text-red-500 dark:text-red-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ padding: 'clamp(14px,1vw,20px)' }}
                    className="w-full text-white bg-brand-green cursor-pointer hover:bg-brand-green/90 focus:ring-4 focus:outline-none focus:ring-brand-green/30 font-sans font-semibold rounded-full text-[clamp(16px,1vw,20px)] leading-none tracking-[0px] text-center transition-colors duration-300 disabled:bg-brand-green/50 disabled:cursor-not-allowed flex justify-center items-center mt-2"
                >
                    {isSubmitting ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Set New Password'}
                </button>
            </form>
        </React.Fragment>
    );
};

export default FirstTimeResetForm;
