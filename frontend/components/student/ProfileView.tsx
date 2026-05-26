'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    ArrowRightWithoutLineIcon, 
    PhoneIcon, 
    EmailIcon, 
    LockIcon, 
    EyeIcon, 
    EyeOffIcon, 
    XIcon,
    LinkedInIcon
} from '../icons';
import { capitalizeWords, getAvatarColor, getInitials } from '../../lib/utils';
import { useSession } from '@/lib/contexts/SessionContext';

interface UserProfile {
    name: string;
    email: string;
    mobile_number?: string;
    programCode?: string;
}

interface ProfileViewProps {
    onNavigate?: (view: "dashboard" | "assessment" | "profile" | "details" | "counsellor" | "roadmaps") => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
    const { user: sessionUser, updateProfile, isLoading: isSessionLoading } = useSession();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (isSessionLoading) return;

            const email = sessionUser?.email;
            const name = sessionUser?.name || 'Student';
            const mobile = sessionUser?.mobile_number || 'Not provided';
            const programCode = sessionUser?.programCode || 'COLLEGE_STUDENT';

            const cachedProfile: UserProfile = {
                name,
                email: email || 'student@originbi.com',
                mobile_number: mobile,
                programCode,
            };

            setUser(cachedProfile);
            setIsLoading(false);

            // Fetch fresh profile from API in background to ensure accurate information
            if (email) {
                try {
                    const res = await fetch(`/student-api/student/profile`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                    });
                    if (res.ok) {
                        const profileData = await res.json();
                        const freshProfile: UserProfile = {
                            name: profileData?.fullName || profileData?.metadata?.fullName || cachedProfile.name,
                            email: email,
                            mobile_number: profileData?.mobileNumber || profileData?.metadata?.mobileNumber || cachedProfile.mobile_number,
                            programCode: profileData?.programCode || cachedProfile.programCode,
                        };
                        setUser(freshProfile);

                        // Sync back to SessionContext reactively
                        updateProfile({
                            name: freshProfile.name,
                            mobile_number: freshProfile.mobile_number,
                            programCode: freshProfile.programCode,
                        });
                    }
                } catch (err) {
                    console.error("Failed background fetch of fresh student profile", err);
                }
            }
        };

        fetchUserProfile();
    }, [sessionUser?.email, isSessionLoading]);

    if (isLoading || isSessionLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in pb-20">
            {/* Breadcrumbs */}
            <div className="flex items-center text-xs text-black dark:text-white mb-6 font-normal flex-wrap">
                <span 
                    onClick={() => onNavigate?.('dashboard')} 
                    className="cursor-pointer hover:underline text-gray-500 dark:text-gray-400"
                >
                    Dashboard
                </span>
                <span className="mx-2 text-gray-400 dark:text-gray-600">
                    <ArrowRightWithoutLineIcon className="w-3 h-3 text-black dark:text-white" />
                </span>
                <span className="text-brand-green font-semibold">Profile</span>
            </div>

            {/* Page Title */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#150089] dark:text-white">My Profile and Settings</h1>
            </div>

            {/* Profile Details Card */}
            <div className="bg-white dark:bg-white/[0.08] rounded-2xl p-6 lg:p-8 shadow-md dark:shadow-none border border-gray-200 dark:border-white/[0.08] mb-8 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                    {/* Avatar */}
                    <div
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold flex-shrink-0 shadow-lg"
                        style={{ backgroundColor: `#${getAvatarColor(user?.name || 'S')}` }}
                    >
                        {getInitials(user?.name)}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 w-full justify-center sm:justify-start">
                            <h2 className="text-xl sm:text-2xl font-bold text-[#19211C] dark:text-white">
                                {capitalizeWords(user?.name) || 'Student'}
                            </h2>
                        </div>

                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-y-3 gap-x-6 sm:gap-x-10 mt-2">
                            <div className="flex items-center gap-2.5">
                                <PhoneIcon className="w-4 h-4 text-brand-green" />
                                <span className="text-sm sm:text-[15px] font-medium text-gray-700 dark:text-white">{user?.mobile_number || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <EmailIcon className="w-[18px] h-[18px] text-brand-green" />
                                <span className="text-sm sm:text-[15px] font-medium text-gray-700 dark:text-white truncate max-w-[200px] sm:max-w-none">{user?.email || ''}</span>
                            </div>
                        </div>

                        {/* Change Password Button - Mobile version */}
                        <div className="mt-8 sm:hidden w-full">
                            <button
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand-green/10 hover:bg-brand-green/20 text-brand-green rounded-xl transition-all text-sm font-bold border border-brand-green/20"
                            >
                                <LockIcon className="w-4 h-4" />
                                <span>Change Password</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Change Password Button - Desktop version */}
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="hidden sm:flex absolute top-8 right-8 items-center gap-2 px-5 py-2.5 bg-brand-green/10 hover:bg-brand-green/20 text-brand-green rounded-xl transition-all text-sm font-bold border border-brand-green/20 group"
                    >
                        <LockIcon className="w-4 h-4" />
                        <span>Change Password</span>
                    </button>
                </div>
            </div>

            {/* LinkedIn Share Card */}
            <div className="bg-[#0077B5] rounded-2xl p-4 lg:p-5 shadow-lg border border-white/10 relative overflow-hidden group transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center text-[#0077B5] shadow-lg flex-shrink-0">
                            <LinkedInIcon className="w-6 h-6" />
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-lg font-bold text-white mb-0.5">Add Certificate to LinkedIn</h3>
                            <p className="text-white/80 text-[13px] font-medium leading-tight">Showcase your verified assessment certificate to your professional network and boost your career profile.</p>
                        </div>
                    </div>
                    <button className="px-6 py-2.5 bg-white text-[#0077B5] rounded-lg font-bold text-[13px] shadow-xl hover:bg-gray-100 transition-all active:scale-95 whitespace-nowrap">
                        Add to Profile
                    </button>
                </div>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </div>
    );
};

function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showSecurityChecks, setShowSecurityChecks] = useState(false);
    const [currentPasswordError, setCurrentPasswordError] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const id = window.setTimeout(() => {
                setIsSuccess(false);
                setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                setCurrentPasswordError(false);
                setShowSecurityChecks(false);
            }, 0);
            return () => window.clearTimeout(id);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const validatePassword = (password: string) => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPasswordError(false);
        
        if (formData.newPassword !== formData.confirmPassword) return;

        const checks = validatePassword(formData.newPassword);
        if (!checks.length || !checks.uppercase || !checks.lowercase || !checks.number || !checks.special) return;

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setIsSuccess(true);
        }, 1500);
    };

    const modalContent = (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-start justify-center p-4 pt-24 sm:items-center sm:pt-4">
                <div className="bg-white dark:bg-[#19211C] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#150089] dark:text-white flex items-center gap-2">
                        <LockIcon className="w-5 h-5 text-brand-green" />
                        {isSuccess ? "Success!" : "Change Password"}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {isSuccess ? (
                    <div className="p-10 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/50">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white">Password Updated!</h4>
                            <p className="text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto text-sm font-medium">
                                Your password has been changed successfully.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-brand-green/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Back to Profile
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-white uppercase tracking-widest">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showOldPassword ? "text" : "password"}
                                    required
                                    value={formData.oldPassword}
                                    onChange={(e) => {
                                        setFormData({ ...formData, oldPassword: e.target.value });
                                        setCurrentPasswordError(false);
                                    }}
                                    className={`w-full px-4 py-3.5 rounded-xl border bg-transparent dark:text-white focus:outline-none focus:ring-2 transition-all pr-12 font-medium ${
                                        currentPasswordError 
                                            ? 'border-red-500 focus:ring-red-500/50' 
                                            : 'border-gray-200 dark:border-white/10 focus:ring-brand-green/50'
                                    }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-green hover:opacity-80 transition-opacity"
                                >
                                    {showOldPassword ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-white uppercase tracking-widest">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    required
                                    value={formData.newPassword}
                                    onChange={(e) => {
                                        setFormData({ ...formData, newPassword: e.target.value });
                                        if (e.target.value.length > 0) setShowSecurityChecks(true);
                                    }}
                                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50 transition-all pr-12 font-medium"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-green hover:opacity-80 transition-opacity"
                                >
                                    {showNewPassword ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-white uppercase tracking-widest">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50 transition-all pr-12 font-medium"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-green hover:opacity-80 transition-opacity"
                                >
                                    {showConfirmPassword ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {showSecurityChecks && (
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Security Requirements</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {[
                                    { label: '8+ Characters', met: formData.newPassword.length >= 8 },
                                    { label: 'Uppercase', met: /[A-Z]/.test(formData.newPassword) },
                                    { label: 'Lowercase', met: /[a-z]/.test(formData.newPassword) },
                                    { label: 'Number', met: /[0-9]/.test(formData.newPassword) },
                                    { label: 'Special Char', met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) },
                                    { label: 'Passwords Match', met: formData.newPassword === formData.confirmPassword && formData.newPassword !== '' },
                                ].map((req, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${req.met ? 'bg-brand-green' : 'bg-gray-300 dark:bg-white/10'}`}>
                                            {req.met && <div className="w-1.5 h-1.5 border-r border-b border-white rotate-45 -mt-0.5"></div>}
                                        </div>
                                        <span className={`text-[11px] font-bold ${req.met ? 'text-brand-green' : 'text-gray-500'}`}>{req.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3.5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !(
                                    formData.oldPassword.length > 0 &&
                                    formData.newPassword.length >= 8 &&
                                    /[A-Z]/.test(formData.newPassword) &&
                                    /[a-z]/.test(formData.newPassword) &&
                                    /[0-9]/.test(formData.newPassword) &&
                                    /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) &&
                                    formData.newPassword === formData.confirmPassword
                                )}
                                className="flex-[2] bg-brand-green hover:bg-[#1bb85c] disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    "Update Password"
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
}

export default ProfileView;
