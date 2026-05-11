"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import { useSession } from "@/lib/contexts/SessionContext";
import {
    DashboardIcon,
    JobsIcon,
    ProfileIcon,
    NotificationIcon,
    MenuIcon,
    MarkAllReadIcon,
    SettingsIcon,
    ChevronDownIcon,
    BrainIcon,
    ReportTriangleIcon,
    LogoutIcon,
    NoNotificationsIcon,
} from '../icons';
import { capitalizeWords, getAvatarColor } from "../../lib/utils";

interface HeaderProps {
    onLogout?: () => void;
    currentView?: "dashboard" | "assessment" | "profile" | "details" | "aptitude-results" | "roadmaps" | "counsellor" | "debrief" | "explore";
    onNavigate?: (view: any) => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    isMobile?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, isMobile, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 rounded-full transition-all duration-200 cursor-pointer ${
            isMobile ? "w-full py-3.5 px-5 gap-3 text-[14px] justify-start" : "px-3 py-2 sm:px-4 sm:py-2 text-[11.5px] font-semibold tracking-tight border"
        } ${active
            ? "bg-brand-green text-white border-transparent shadow-none"
            : "bg-gray-50 border border-gray-200 text-gray-600 dark:bg-white/[0.06] dark:border-white/[0.12] dark:text-gray-300 hover:bg-gray-100 hover:text-black hover:border-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        }`}
    >
        <span className={`transition-colors ${active ? "text-white" : "text-brand-green dark:text-white"}`}>{icon}</span>
        <span className={`${isMobile ? 'inline' : 'hidden lg:inline'}`}>{label}</span>
    </button>
);

const NotificationItem: React.FC<{
    icon?: React.ReactNode;
    title: string;
    message: string;
    time?: string;
    isNew?: boolean;
    onClick?: () => void;
}> = ({ icon, title, message, time, isNew, onClick }) => (
    <div
        onClick={onClick}
        className="flex items-start justify-between p-3 px-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0"
    >
        <div className="flex items-start space-x-3 min-w-0 pr-4 w-full">
            {icon && (
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-brand-green">
                    {icon}
                </div>
            )}
            <div className="flex-grow min-w-0 flex flex-col pt-0.5">
                <div className="text-[14px] font-semibold text-gray-900 dark:text-white w-full">
                    {title}
                </div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 w-full font-medium">
                    {message}
                </div>
            </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 space-y-2 pt-1 h-full">
            {isNew ? (
                <div className="w-2 h-2 bg-brand-green rounded-full shadow-[0_0_8px_rgba(30,211,106,0.6)]"></div>
            ) : (
                <div className="w-2 h-2"></div>
            )}
            {time && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap pt-2">
                    {time}
                </span>
            )}
        </div>
    </div>
);

const Header: React.FC<HeaderProps> = ({
    onLogout,
    currentView,
    onNavigate,
}) => {
    const { user, logout, updateProfile } = useSession();
    const router = useRouter();
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("All");
    
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notificationsMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.email) return;

            try {
                const studentServiceUrl = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || "http://localhost:4004";
                const res = await fetch(`${studentServiceUrl}/student/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email }),
                });
                if (res.ok) {
                    const profileData = await res.json();
                    const freshName = profileData?.fullName || profileData?.metadata?.fullName || user.name;
                    updateProfile({
                        name: freshName,
                    });
                }
            } catch (e) {
                console.error("Error background fetching profile in header", e);
            }
        };

        loadProfile();
    }, [user?.email]);

    // Mock unread count
    const [unreadCount, setUnreadCount] = useState(3);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
            if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
            if (isMobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                const target = event.target as Element;
                if (!target.closest("#mobile-menu-btn")) {
                    setMobileMenuOpen(false);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMobileMenuOpen]);

    const handleNavClick = (view: string) => {
        onNavigate?.(view);
        setMobileMenuOpen(false);
    };

    const isDashboardActive = currentView === 'dashboard';
    const isAssessmentActive = currentView === 'assessment';
    const isProfileSettingsActive = currentView === 'profile';
    const isExploreActive = currentView === 'explore';

    const renderNavItems = (isMobile: boolean) => (
        <>
            <NavItem
                icon={<DashboardIcon />}
                label="Dashboard"
                active={isDashboardActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("dashboard")}
            />
            <NavItem
                icon={<BrainIcon className="w-4 h-4" />}
                label="Explore"
                active={isExploreActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("explore")}
            />
            <NavItem
                icon={<JobsIcon />}
                label="Assessment"
                active={isAssessmentActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("assessment")}
            />
            <NavItem
                icon={<ReportTriangleIcon fillColor={(currentView === 'aptitude-results' || currentView === 'debrief') ? '#FFFFFF' : '#1ED36A'} />}
                label="My Score"
                active={currentView === 'aptitude-results' || currentView === 'debrief'}
                isMobile={isMobile}
                onClick={() => handleNavClick("aptitude-results")}
            />
            <NavItem
                icon={<ProfileIcon />}
                label="Profile"
                active={isProfileSettingsActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("profile")}
            />
        </>
    );

    return (
        <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 dark:bg-[#19211C]/95 backdrop-blur-xl border-b border-[#E0E0E0] dark:border-white/[0.08] shadow-none h-[64px] sm:h-[72px]">
            <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between h-full relative z-10">
                <div className="flex items-center gap-3 lg:gap-4">
                    <button
                        id="mobile-menu-btn"
                        className="md:hidden text-gray-700 dark:text-white p-2 rounded-[12px] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                        onClick={() => setMobileMenuOpen((p) => !p)}
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>

                    <div className="relative">
                        <Logo className="h-5 lg:h-5.5" />
                    </div>

                    <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 ml-2 lg:ml-3">
                        {renderNavItems(false)}
                    </nav>
                </div>

                <div className="flex items-center gap-3 lg:gap-4">
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>

                    <div className="relative" ref={notificationsMenuRef}>
                        <button
                            onClick={() => setNotificationsOpen(!isNotificationsOpen)}
                            className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                                isNotificationsOpen
                                    ? "bg-brand-green text-white border-transparent"
                                    : "bg-white border border-gray-200 text-gray-600 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:border-gray-300"
                            }`}
                        >
                            <NotificationIcon className="w-[15px] h-[15px] fill-current" />
                            {unreadCount > 0 && (
                                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center ${
                                    isNotificationsOpen 
                                        ? "bg-white text-brand-green border-transparent" 
                                        : "bg-brand-green text-white border-white dark:border-[#19211C]"
                                } border-2 text-[10px] font-bold rounded-full px-1 shadow-sm`}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {isNotificationsOpen && (
                            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[64px] sm:top-full mt-2 sm:mt-6 w-auto sm:w-[480px] md:w-[540px] notification-glass-card p-0 z-[100] animate-slide-down overflow-hidden text-gray-900 dark:text-white cursor-default">
                                <div className="p-5 pb-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[17px] font-semibold tracking-wide text-gray-900 dark:text-white">
                                            Notifications
                                        </h3>
                                        <button
                                            onClick={() => setNotificationsOpen(false)}
                                            className="w-[27px] h-[27px] bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5 text-brand-green"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="h-px bg-gray-200 dark:bg-white/10 mb-4" />

                                    <div className="flex justify-between items-center flex-wrap gap-y-3 gap-x-6">
                                        <div className="flex flex-wrap gap-2">
                                            {["All", "Assessment", "History"].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveTab(tab);
                                                    }}
                                                    className={`px-4 py-1 rounded-full text-[13px] transition-colors ${activeTab === tab
                                                        ? "bg-brand-green text-white font-semibold"
                                                        : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-medium"
                                                        }`}
                                                >
                                                    {tab === "All" && unreadCount > 0
                                                        ? `All (${unreadCount})`
                                                        : tab}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUnreadCount(0);
                                            }}
                                            className="flex items-center gap-1.5 text-brand-green text-[13px] hover:text-green-400 transition-colors bg-transparent border-none flex-shrink-0 ml-auto"
                                        >
                                            <MarkAllReadIcon />
                                            <span className="font-medium tracking-wide">
                                                Mark all read
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto px-2 pb-4 custom-scrollbar">
                                    {unreadCount > 0 ? (
                                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                                            <NotificationItem
                                                title="Assessment Report Ready"
                                                message="Your detailed aptitude report is now available for review."
                                                time="2h ago"
                                                isNew={unreadCount > 0}
                                                icon={<JobsIcon className="w-4 h-4 text-brand-green" />}
                                                onClick={() => { if (unreadCount > 0) setUnreadCount(prev => Math.max(0, prev - 1)); }}
                                            />
                                            <NotificationItem
                                                title="New Achievement Unlocked"
                                                message="You've successfully completed the first level of Technical Training."
                                                time="5h ago"
                                                isNew={unreadCount > 1}
                                                icon={<SettingsIcon className="w-4 h-4 text-brand-green" />}
                                                onClick={() => { if (unreadCount > 1) setUnreadCount(prev => Math.max(0, prev - 1)); }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-8 pb-12 flex flex-col items-center justify-center text-center">
                                            <NoNotificationsIcon className="w-[100px] h-auto mb-4 text-[#19211C] dark:text-white" />
                                            <p className="text-gray-900 dark:text-white font-medium text-[15px]">
                                                No Notifications Yet
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-white/[0.08] dark:to-white/[0.04] hidden lg:block mx-2"></div>

                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2.5 focus:outline-none cursor-pointer p-1.5 rounded-[12px] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
                        >
                            {!user ? (
                                <div className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse flex-shrink-0"></div>
                            ) : (
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Student')}&background=${getAvatarColor(user.name || 'Student')}&color=fff&length=2`}
                                    alt="User Avatar"
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 dark:border-white/10"
                                />
                            )}
                            <div className="hidden lg:block text-left mr-1">
                                {!user ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></span>
                                        <span className="h-2.5 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></span>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                                            {capitalizeWords(user.name) || "Student"}
                                        </p>
                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-tight font-medium tracking-tight">
                                            {user.email || "student@originbi.com"}
                                        </p>
                                    </>
                                )}
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform hidden sm:block ${isProfileOpen ? "rotate-180" : ""}`} />
                        </button>
 
                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-4 w-72 bg-white dark:bg-[#19211C] rounded-[16px] shadow-2xl shadow-black/[0.08] z-[100] border border-gray-100 dark:border-white/[0.08] overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-gray-50 to-white dark:from-white/[0.04] dark:to-transparent">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">{user?.name || "Student"}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 font-medium tracking-tight">{user?.email || "student@originbi.com"}</p>
                                    </div>
 
                                    <div className="p-2">
                                        <button
                                            onClick={() => handleNavClick("profile")}
                                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 rounded-[10px] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all font-medium cursor-pointer"
                                        >
                                            <SettingsIcon className="w-4 h-4 mr-3" />
                                            Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                logout();
                                                if (onLogout) onLogout();
                                                router.push("/");
                                            }}
                                            className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 rounded-[10px] hover:bg-red-50 dark:hover:bg-red-900/[0.08] transition-all font-medium mt-1 cursor-pointer"
                                        >
                                            <LogoutIcon className="w-4 h-4 mr-3" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div
                    ref={mobileMenuRef}
                    className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#19211C] shadow-2xl shadow-black/[0.08] z-40 border-t border-gray-100 dark:border-white/[0.08]"
                >
                    <nav className="flex flex-col p-6 space-y-2">
                        {renderNavItems(true)}
                        <div className="border-t border-gray-100 dark:border-white/[0.08] my-4 pt-6">
                            <div className="flex justify-between items-center px-4">
                                <span className="text-sm font-bold text-gray-500 tracking-tight">Theme</span>
                                <ThemeToggle />
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
