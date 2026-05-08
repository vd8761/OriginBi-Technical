"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import {
    DashboardIcon,
    JobsIcon,
    ProfileIcon,
    AssessmentNewIcon,
    CounsellorIcon,
    DebriefIcon,
    RoadmapIcon,
    ExploreIcon,
    NotificationIcon,
    NotificationWithDotIcon,
    MenuIcon,
    MarkAllReadIcon,
    SettingsIcon,
    ChevronDownIcon,
    BrainIcon,
    ReportTriangleIcon,
    LogoutIcon,
} from '../icons';

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
    index?: number;
}



// Refined SaaS-style Notification Item
const NotificationItem: React.FC<{
    icon?: React.ReactNode;
    title: string;
    message: string;
    time?: string;
    isNew?: boolean;
    onClick?: () => void;
}> = ({ icon, title, message, time, isNew, onClick }) => (
    <motion.div
        onClick={onClick}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ backgroundColor: "rgba(30, 211, 106, 0.03)" }}
        className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative group border border-transparent hover:border-gray-100 dark:hover:border-white/[0.04]"
    >
        {icon && (
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-gray-400 dark:text-gray-300 border border-gray-200/50 dark:border-white/[0.06] group-hover:text-brand-green group-hover:border-brand-green/30 transition-colors">
                {icon}
            </div>
        )}
        <div className="flex-grow min-w-0 pr-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-gray-900 dark:text-white group-hover:text-brand-green transition-colors leading-none">
                    {title}
                </span>
                {time && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                        {time}
                    </span>
                )}
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {message}
            </p>
        </div>
        {isNew && (
            <span className="w-1.5 h-1.5 bg-brand-green rounded-full shrink-0 mt-2 shadow-[0_0_6px_rgba(30,211,106,0.6)]" />
        )}
    </motion.div>
);

// Clean pill-shaped NavItem matching reference design
const NavItem: React.FC<NavItemProps> = ({ icon, label, active, isMobile, onClick }) => (
    <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        className={`relative flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-[11.5px] font-semibold tracking-tight transition-all duration-300 border ${
            active
                ? "bg-brand-green text-white border-brand-green shadow-lg shadow-brand-green/20"
                : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/[0.06] dark:border-white/[0.12] dark:text-gray-300 hover:bg-gray-100 hover:text-black hover:border-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        } ${isMobile ? 'w-full justify-start py-3.5 px-5 gap-3 text-[14px]' : ''}`}
    >
        <span className={`transition-colors ${active ? "text-white" : "text-brand-green"}`}>{icon}</span>
        <span className={`${isMobile ? '' : 'hidden lg:inline'}`}>{label}</span>
    </motion.button>
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
    const [scrolled, setScrolled] = useState(false);
    
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notificationsMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { scrollY } = useScroll();

    // Scroll-aware header effect
    const headerOpacity = useTransform(scrollY, [0, 50], [0.95, 0.98]);
    const headerBlur = useTransform(scrollY, [0, 50], [12, 20]);
    const headerBorder = useTransform(scrollY, [0, 50], [0.08, 0.15]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            let email = '';
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('originbi:user-profile');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        setUserProfile({ name: parsed.name, email: parsed.email });
                        email = parsed.email || '';
                    } catch (e) {
                        console.error("Failed to parse user profile", e);
                    }
                }
            }

            if (email) {
                try {
                    const studentServiceUrl = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || "http://localhost:4004";
                    const res = await fetch(`${studentServiceUrl}/student/profile`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                    });
                    if (res.ok) {
                        const profileData = await res.json();
                        const freshName = profileData?.fullName || profileData?.metadata?.fullName || 'Student';
                        setUserProfile({
                            name: freshName,
                            email: email,
                        });
                        // Sync back to localStorage
                        const stored = localStorage.getItem('originbi:user-profile');
                        const parsed = stored ? JSON.parse(stored) : {};
                        localStorage.setItem('originbi:user-profile', JSON.stringify({
                            ...parsed,
                            name: freshName,
                            email: email,
                        }));
                    }
                } catch (e) {
                    console.error("Error background fetching profile in header", e);
                }
            }
        };

        loadProfile();
    }, []);

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
    const isExploreActive = currentView === 'explore';
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
                index={0}
            />
            <NavItem
                icon={<BrainIcon className="w-4 h-4" />}
                label="Explore"
                active={isExploreActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("explore")}
                index={1}
            />
            <NavItem
                icon={<JobsIcon />}
                label="Assessment"
                active={isAssessmentActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("assessment")}
                index={2}
            />
            <NavItem
                icon={<ReportTriangleIcon fillColor={(currentView === 'aptitude-results' || currentView === 'debrief') ? '#FFFFFF' : '#1ED36A'} />}
                label="My Score"
                active={currentView === 'aptitude-results' || currentView === 'debrief'}
                isMobile={isMobile}
                onClick={() => handleNavClick("aptitude-results")}
                index={3}
            />
            <NavItem
                icon={<ProfileIcon />}
                label="Profile"
                active={isProfileSettingsActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("profile")}
                index={4}
            />
        </>
    );

    return (
        <motion.header
            style={{
                opacity: headerOpacity,
                backdropFilter: `blur(${headerBlur}px)`,
            }}
            className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-600 h-[64px] sm:h-[72px] ${
                scrolled 
                    ? "bg-white/[0.98] dark:bg-[#19211C]/[0.98] shadow-xl shadow-black/[0.04] border-b border-gray-200/[0.6] dark:border-white/[0.08]" 
                    : "bg-white/[0.96] dark:bg-[#19211C]/[0.96] border-b border-gray-100/[0.8] dark:border-white/[0.06]"
            }`}
        >
            {/* Refined gradient background */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-brand-green/[0.03] via-transparent to-emerald-500/[0.02] opacity-0"
                animate={{ opacity: scrolled ? 0.4 : 0 }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            />

            <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between h-full relative z-10">
                <div className="flex items-center gap-3 lg:gap-4">
                    <motion.button
                        id="mobile-menu-btn"
                        className="md:hidden text-gray-700 dark:text-white p-2 rounded-[12px] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                        onClick={() => setMobileMenuOpen((p) => !p)}
                        whileTap={{ scale: 0.92 }}
                    >
                        <MenuIcon className="w-6 h-6" />
                    </motion.button>

                    <motion.div 
                        className="relative"
                        whileHover={{ scale: 1.015 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    >
                        <Logo className="h-5 lg:h-5.5" />
                        {/* Refined glow behind logo */}
                        <motion.div
                            className="absolute inset-0 bg-brand-green/[0.15] blur-3xl -z-10"
                            animate={{ opacity: [0.25, 0.4, 0.25] }}
                            transition={{ duration: 4, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                        />
                    </motion.div>

                    <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 ml-2 lg:ml-3">
                        {renderNavItems(false)}
                    </nav>
                </div>

                <div className="flex items-center gap-3 lg:gap-4">
                    <motion.div 
                        className="hidden sm:block"
                        whileHover={{ scale: 1.03 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    >
                        <ThemeToggle />
                    </motion.div>

                    <div className="relative" ref={notificationsMenuRef}>
                        <motion.button
                            onClick={() => setNotificationsOpen(!isNotificationsOpen)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center transition-all relative cursor-pointer shadow-sm ${
                                isNotificationsOpen
                                    ? "bg-brand-green text-white shadow-lg shadow-brand-green/[0.25]"
                                    : "bg-white border border-gray-200 text-gray-600 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:border-gray-300"
                            }`}
                        >
                            <NotificationIcon className="w-[15px] h-[15px] fill-current" />
                            {unreadCount > 0 && (
                                <motion.span 
                                    className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center ${
                                        isNotificationsOpen 
                                            ? "bg-white text-brand-green" 
                                            : "bg-brand-green text-white border-2 border-white dark:border-[#19211C]"
                                    } text-[10px] font-bold rounded-full px-1.5 shadow-md`}
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{ duration: 2.5, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                                >
                                    {unreadCount}
                                </motion.span>
                            )}
                        </motion.button>

                        <AnimatePresence>
                            {isNotificationsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[64px] sm:top-full mt-2 sm:mt-4 w-auto sm:w-[380px] bg-white/95 dark:bg-[#121915]/95 backdrop-blur-md rounded-2xl shadow-xl z-[100] border border-gray-150 dark:border-white/[0.08] overflow-hidden"
                                >
                                    <div className="p-4 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Notifications</h3>
                                            <motion.button 
                                                onClick={() => setNotificationsOpen(false)} 
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                                whileHover={{ rotate: 90 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Sub-Header Tabs */}
                                    <div className="px-4 py-2 bg-gray-50/50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center gap-2">
                                        <div className="flex gap-1.5">
                                            {["All", "Assessment", "History"].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        activeTab === tab
                                                            ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20"
                                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                    }`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setUnreadCount(0)} 
                                            className="flex items-center gap-1 text-brand-green text-xs hover:text-emerald-600 font-bold transition-colors"
                                        >
                                            <MarkAllReadIcon className="w-3.5 h-3.5" />
                                            <span>Mark all</span>
                                        </button>
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto p-2.5 space-y-1">
                                        <NotificationItem
                                            title="Assessment Report Ready"
                                            message="Your detailed aptitude report is now available for review."
                                            time="2h ago"
                                            isNew={unreadCount > 0}
                                            icon={<JobsIcon className="w-3.5 h-3.5" />}
                                        />
                                        <NotificationItem
                                            title="New Achievement Unlocked"
                                            message="You've successfully completed the first level of Technical Training."
                                            time="5h ago"
                                            isNew={unreadCount > 1}
                                            icon={<SettingsIcon className="w-3.5 h-3.5" />}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="w-px h-6 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-white/[0.08] dark:to-white/[0.04] hidden lg:block mx-2"></div>

                    <div className="relative" ref={profileMenuRef}>
                        <motion.button
                            onClick={() => setProfileOpen(!isProfileOpen)}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            className="flex items-center gap-2.5 focus:outline-none cursor-pointer p-1.5 rounded-[12px] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
                        >
                            <motion.div 
                                className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-gradient-to-br from-brand-green/[0.08] to-emerald-500/[0.04] border border-brand-green/[0.15] flex items-center justify-center overflow-hidden relative"
                                whileHover={{ rotate: 4 }}
                            >
                                <ProfileIcon className="w-4.5 h-4.5 text-brand-green" />
                                <motion.div
                                    className="absolute inset-0 bg-brand-green/[0.15]"
                                    animate={{ opacity: [0, 0.4, 0] }}
                                    transition={{ duration: 2.5, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                                />
                            </motion.div>
                            <div className="hidden lg:block text-left">
                                <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">{userProfile?.name || "Student"}</p>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-tight font-medium tracking-tight">Technical Portal</p>
                            </div>
                            <motion.div
                                animate={{ rotate: isProfileOpen ? 180 : 0 }}
                                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                            >
                                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                            </motion.div>
                        </motion.button>
 
                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -12, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -12, scale: 0.96 }}
                                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                                    className="absolute right-0 top-full mt-4 w-72 bg-white dark:bg-[#19211C] rounded-[16px] shadow-2xl shadow-black/[0.08] z-[100] border border-gray-100 dark:border-white/[0.08] overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-gray-50 to-white dark:from-white/[0.04] dark:to-transparent">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">{userProfile?.name || "Student"}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 font-medium tracking-tight">{userProfile?.email || "student@originbi.com"}</p>
                                    </div>

                                    <div className="p-2">
                                        <motion.button
                                            onClick={() => handleNavClick("profile")}
                                            whileHover={{ x: 4 }}
                                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 rounded-[10px] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all font-medium"
                                        >
                                            <SettingsIcon className="w-4 h-4 mr-3" />
                                            Settings
                                        </motion.button>
                                        <motion.button
                                            onClick={onLogout}
                                            whileHover={{ x: 4 }}
                                            className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 rounded-[10px] hover:bg-red-50 dark:hover:bg-red-900/[0.08] transition-all font-medium mt-1"
                                        >
                                            <LogoutIcon className="w-4 h-4 mr-3" />
                                            Logout
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        ref={mobileMenuRef}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
};

const XIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default Header;
