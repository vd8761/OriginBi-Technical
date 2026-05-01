"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import { Brain } from 'lucide-react';
import {
    DashboardIcon,
    JobsIcon,
    ProfileIcon,
    SettingsIcon,
    LogoutIcon,
    MenuIcon,
    ChevronDownIcon,
    NotificationIcon,
    NotificationWithDotIcon,
    RoadmapIcon,
    VideosIcon,
    MarkAllReadIcon,
    NoNotificationsIcon,
    ReportTriangleIcon,
} from '../icons';

interface HeaderProps {
    onLogout?: () => void;
    currentView?: "dashboard" | "assessment" | "profile" | "details" | "aptitude-results" | "roadmaps" | "counsellor" | "debrief";
    onNavigate?: (view: any) => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    isMobile?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
    icon,
    label,
    active,
    isMobile,
    onClick,
}) => {
    const showDesktopText = "hidden lg:inline";
    const spacingClass = isMobile ? "gap-3" : "justify-center gap-2";

    return (
        <div className="relative group">
            <button
                onClick={onClick}
                className={`flex items-center ${spacingClass} rounded-full transition-all duration-200 w-full ${isMobile ? "py-3.5" : "lg:h-8.5 xl:h-9 2xl:h-10"} cursor-pointer ${active
                    ? "bg-[#1ED36A] text-white shadow-none border border-transparent px-2 xl:px-3 2xl:px-3.5"
                    : "bg-gray-100 border border-gray-100 text-slate-600 hover:bg-white hover:border-[#1ED36A]/30 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 px-2 xl:px-3 2xl:px-3.5"
                    }`}
            >
                <div className={`${active ? "text-white" : "text-[#1ED36A] dark:text-white"}`}>
                    {icon}
                </div>
                <span
                    className={`font-medium ${isMobile ? "text-sm ml-2" : "text-[10.5px] xl:text-[11.5px] 2xl:text-[11.5px]"} whitespace-nowrap ${isMobile ? "inline" : showDesktopText}`}
                >
                    {label}
                </span>
            </button>
            <div
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max px-2 py-1 bg-black/80 dark:bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${isMobile ? "hidden" : "block 2xl:hidden"}`}
            >
                {label}
            </div>
        </div>
    );
};



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
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-[#1ED36A]">
                    {icon}
                </div>
            )}
            <div className="flex-grow min-w-0 flex flex-col pt-0.5">
                <div className="text-[14px] font-semibold text-gray-900 dark:text-white w-full">
                    {title}
                </div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 w-full">
                    {message}
                </div>
            </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 space-y-2 pt-1 h-full">
            {isNew ? (
                <div className="w-2 h-2 bg-[#1ED36A] rounded-full shadow-[0_0_8px_rgba(30,211,106,0.6)]"></div>
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
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("All");
    
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notificationsMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();

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
    const isRoadmapsActive = currentView === 'roadmaps';
    const isCounsellorActive = currentView === 'counsellor';
    const isDebriefActive = currentView === 'debrief';
    const isProfileSettingsActive = currentView === 'profile';

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
                icon={<Brain className="w-4 h-4" />}
                label="Explore"
                active={isCounsellorActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("counsellor")}
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
            <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between h-full">
                <div className="flex items-center gap-2 lg:gap-4">
                    <button
                        id="mobile-menu-btn"
                        className="md:hidden text-gray-700 dark:text-white p-1 cursor-pointer"
                        onClick={() => setMobileMenuOpen((p) => !p)}
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>

                    <Logo className="h-5 lg:h-6" />

                    <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 ml-3">
                        {renderNavItems(false)}
                    </nav>
                </div>

                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="hidden sm:block scale-90">
                        <ThemeToggle />
                    </div>

                    <div className="relative" ref={notificationsMenuRef}>
                        <button
                            onClick={() => setNotificationsOpen(!isNotificationsOpen)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${isNotificationsOpen
                                ? "bg-[#1ED36A] text-white"
                                : "bg-gray-50 border border-gray-200 text-[#150089] hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                                }`}
                        >
                            <NotificationIcon className="w-[15px] h-[15px] fill-current" />
                            {unreadCount > 0 && (
                                <span className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center ${isNotificationsOpen ? "bg-white text-[#1ED36A]" : "bg-[#1ED36A] text-white border-white dark:border-[#19211C]"} border-2 text-[9px] font-bold rounded-full px-1`}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {isNotificationsOpen && (
                            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[64px] sm:top-full mt-2 sm:mt-6 w-auto sm:w-[480px] md:w-[540px] bg-white dark:bg-[#19211C] rounded-2xl shadow-2xl z-[100] border border-gray-100 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-5 pb-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                        <button onClick={() => setNotificationsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                            <XIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="h-px bg-gray-100 dark:bg-white/5 mb-4" />
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            {["All", "Assessment", "History"].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={`px-4 py-1 rounded-full text-[13px] transition-colors ${activeTab === tab
                                                        ? "bg-[#1ED36A] text-white font-semibold"
                                                        : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-medium"
                                                        }`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => setUnreadCount(0)} className="flex items-center gap-1.5 text-[#1ED36A] text-[13px] hover:text-green-600 font-medium">
                                            <MarkAllReadIcon className="relative w-4 h-4" />
                                            Mark all read
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-[320px] overflow-y-auto px-2 pb-4">
                                    <div className="mb-2">
                                        <h4 className="text-[14px] text-gray-500 dark:text-gray-400 mb-2 px-3 font-medium uppercase tracking-wider">Recent</h4>
                                        <NotificationItem
                                            title="Assessment Report Ready"
                                            message="Your detailed aptitude report is now available for review."
                                            time="2 hours ago"
                                            isNew={true}
                                            icon={<JobsIcon className="w-4 h-4" />}
                                        />
                                        <NotificationItem
                                            title="New Achievement Unlocked"
                                            message="You've successfully completed the first level of Technical Training."
                                            time="5 hours ago"
                                            isNew={true}
                                            icon={<SettingsIcon className="w-4 h-4" />}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-gray-200 dark:bg-white/10 hidden lg:block mx-1"></div>

                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 focus:outline-none cursor-pointer"
                        >
                            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#1ED36A]/10 border border-[#1ED36A]/20 flex items-center justify-center overflow-hidden">
                                <ProfileIcon className="w-4 h-4 text-[#1ED36A]" />
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">Student</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">Technical Portal</p>
                            </div>
                            <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#19211C] rounded-xl shadow-2xl z-[100] border border-gray-100 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Student Name</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">student@originbi.com</p>
                                </div>

                                <div className="p-2">
                                    <button
                                        onClick={() => handleNavClick("profile")}
                                        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <SettingsIcon className="w-4 h-4 mr-3" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mt-1"
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
                    className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#19211C] shadow-xl z-40 border-t border-gray-100 dark:border-white/10 animate-in fade-in slide-in-from-top-4 duration-300"
                >
                    <nav className="flex flex-col p-4 space-y-2">
                        {renderNavItems(true)}
                        <div className="border-t border-gray-100 dark:border-white/10 my-2 pt-4">
                            <div className="flex justify-between items-center px-3">
                                <span className="text-sm font-medium text-gray-500">Theme</span>
                                <ThemeToggle />
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

const XIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default Header;
