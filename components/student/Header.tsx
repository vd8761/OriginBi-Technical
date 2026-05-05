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



// Refined Notification Item with UI/UX designer-level polish
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
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.015)" }}
        className="flex items-start justify-between p-5 px-4 cursor-pointer border-b border-gray-100 dark:border-white/[0.06] last:border-0 relative overflow-hidden group"
    >
        {/* Refined gradient background on hover */}
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-brand-green/[0.04] to-transparent opacity-0 group-hover:opacity-100"
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        />
        
        <div className="flex items-start space-x-4 min-w-0 pr-4 w-full relative z-10">
            {icon && (
                <motion.div 
                    className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-[14px] bg-gradient-to-br from-brand-green/[0.08] to-emerald-500/[0.04] text-brand-green border border-brand-green/[0.12]"
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    {icon}
                </motion.div>
            )}
            <div className="flex-grow min-w-0 flex flex-col pt-1.5">
                <div className="text-[14px] font-semibold text-gray-900 dark:text-white w-full tracking-tight">
                    {title}
                </div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 w-full leading-relaxed">
                    {message}
                </div>
            </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 space-y-3 pt-1.5 h-full relative z-10">
            {isNew && (
                <motion.div 
                    className="w-2 h-2 bg-brand-green rounded-full shadow-[0_0_8px_rgba(30,211,106,0.6)]"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.5, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                />
            )}
            {time && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap font-medium tracking-tight">
                    {time}
                </span>
            )}
        </div>
    </motion.div>
);

// Refined animated underline with organic easing
const AnimatedUnderline = ({ active }: { active: boolean }) => (
    <motion.div
        className="absolute -bottom-0.5 left-1/2 h-[2px] bg-gradient-to-r from-brand-green via-emerald-400 to-brand-green rounded-full"
        initial={false}
        animate={{
            width: active ? "65%" : "0%",
            x: active ? "-50%" : "-50%",
            opacity: active ? 1 : 0,
        }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    />
);

// Sophisticated glow effect with subtle animation
const GlowOrb = ({ active }: { active: boolean }) => (
    <motion.div
        className="absolute inset-0 rounded-[16px] blur-3xl"
        style={{ background: "linear-gradient(135deg, rgba(30,211,106,0.25) 0%, rgba(16,185,129,0.08) 100%)" }}
        initial={false}
        animate={{
            opacity: active ? 0.3 : 0,
            scale: active ? 1.25 : 0.85,
        }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    />
);

// Premium NavItem with UI/UX designer-level polish
const NavItem: React.FC<NavItemProps> = ({
    icon,
    label,
    active,
    isMobile,
    onClick,
    index = 0,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div 
            className="relative"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
            <GlowOrb active={!!active} />
            <motion.button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative flex items-center gap-3 px-6 py-3.5 rounded-[16px] text-[13px] font-semibold tracking-tight transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
                    active
                        ? "text-brand-green bg-gradient-to-br from-brand-green/[0.08] to-emerald-500/[0.04]"
                        : "text-gray-600 dark:text-gray-300 hover:text-brand-green"
                } ${isMobile ? 'w-full justify-start py-4' : ''}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Refined gradient background on hover */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-brand-green/[0.12] via-brand-green/[0.04] to-transparent rounded-[16px]"
                    initial={false}
                    animate={{
                        opacity: isHovered && !active ? 1 : 0,
                        x: isHovered ? 0 : -40,
                    }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                />

                {/* Subtle shimmer effect */}
                {isHovered && !active && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent rounded-[16px]"
                        initial={{ x: -100 }}
                        animate={{ x: 100 }}
                        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    />
                )}

                {/* Icon with refined animation */}
                <motion.span 
                    className={`relative z-10 ${active ? "text-brand-green" : "text-gray-500 dark:text-gray-400"}`}
                    animate={{
                        scale: isHovered ? 1.08 : 1,
                        rotate: isHovered ? [0, -4, 4, 0] : 0,
                    }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 250, damping: 20 }}
                >
                    {icon}
                </motion.span>

                {/* Label with refined typography */}
                <motion.span 
                    className={`relative z-10 hidden lg:inline ${isMobile ? '!inline' : ''} ${active ? "font-bold tracking-tight" : ""}`}
                    animate={{
                        letterSpacing: isHovered ? "0.015em" : "0em",
                    }}
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                >
                    {label}
                </motion.span>

                {/* Animated underline for desktop */}
                {!isMobile && <AnimatedUnderline active={!!active} />}

                {/* Refined active indicator */}
                {active && (
                    <motion.span 
                        className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-brand-green shadow-[0_0_10px_rgba(30,211,106,0.7)]"
                        layoutId="activeIndicator"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                    />
                )}
            </motion.button>
        </motion.div>
    );
};

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
            className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-600 h-[76px] sm:h-[84px] ${
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

            <div className="w-full max-w-[2000px] mx-auto px-5 sm:px-7 lg:px-9 py-3 flex items-center justify-between h-full relative z-10">
                <div className="flex items-center gap-4 lg:gap-6">
                    <motion.button
                        id="mobile-menu-btn"
                        className="md:hidden text-gray-700 dark:text-white p-2.5 rounded-[12px] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
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
                        <Logo className="h-6 lg:h-7" />
                        {/* Refined glow behind logo */}
                        <motion.div
                            className="absolute inset-0 bg-brand-green/[0.15] blur-3xl -z-10"
                            animate={{ opacity: [0.25, 0.4, 0.25] }}
                            transition={{ duration: 4, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                        />
                    </motion.div>

                    <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 ml-5">
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
                            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all relative cursor-pointer shadow-sm ${
                                isNotificationsOpen
                                    ? "bg-gradient-to-br from-brand-green to-emerald-500 text-white shadow-lg shadow-brand-green/[0.25]"
                                    : "bg-gray-50 dark:bg-white/[0.04] border border-gray-200/[0.8] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                            }`}
                        >
                            <NotificationIcon className="w-[17px] h-[17px] fill-current" />
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
                                    initial={{ opacity: 0, y: -12, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -12, scale: 0.96 }}
                                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                                    className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[76px] sm:top-full mt-4 sm:mt-5 w-auto sm:w-[520px] md:w-[580px] bg-white dark:bg-[#19211C] rounded-[20px] shadow-2xl shadow-black/[0.08] z-[100] border border-gray-100 dark:border-white/[0.08] overflow-hidden"
                                >
                                    <div className="p-7 pb-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Notifications</h3>
                                            <motion.button 
                                                onClick={() => setNotificationsOpen(false)} 
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1.5 rounded-[10px] hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                                whileHover={{ rotate: 90 }}
                                                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                                            >
                                                <XIcon className="w-5 h-5" />
                                            </motion.button>
                                        </div>
                                        <div className="h-px bg-gradient-to-r from-gray-100 to-transparent dark:from-white/[0.06] dark:to-transparent mb-6" />
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-2">
                                                {["All", "Assessment", "History"].map((tab) => (
                                                    <motion.button
                                                        key={tab}
                                                        onClick={() => setActiveTab(tab)}
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        className={`px-5 py-2 rounded-[12px] text-[13px] transition-all font-semibold tracking-tight ${
                                                            activeTab === tab
                                                                ? "bg-gradient-to-r from-brand-green to-emerald-500 text-white shadow-lg shadow-brand-green/[0.25]"
                                                                : "bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
                                                        }`}
                                                    >
                                                        {tab}
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <motion.button 
                                                onClick={() => setUnreadCount(0)} 
                                                className="flex items-center gap-2 text-brand-green text-[13px] hover:text-emerald-600 font-semibold tracking-tight"
                                                whileHover={{ scale: 1.03 }}
                                            >
                                                <MarkAllReadIcon className="relative w-4 h-4" />
                                                Mark all read
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div className="max-h-[360px] overflow-y-auto px-4 pb-6">
                                        <div className="mb-2">
                                            <h4 className="text-[12px] text-gray-500 dark:text-gray-400 mb-4 px-4 font-bold uppercase tracking-widest">Recent</h4>
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
                            className="flex items-center gap-3 focus:outline-none cursor-pointer p-2 rounded-[12px] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
                        >
                            <motion.div 
                                className="w-9 h-9 lg:w-10 lg:h-10 rounded-[14px] bg-gradient-to-br from-brand-green/[0.08] to-emerald-500/[0.04] border border-brand-green/[0.15] flex items-center justify-center overflow-hidden relative"
                                whileHover={{ rotate: 4 }}
                            >
                                <ProfileIcon className="w-5 h-5 text-brand-green" />
                                <motion.div
                                    className="absolute inset-0 bg-brand-green/[0.15]"
                                    animate={{ opacity: [0, 0.4, 0] }}
                                    transition={{ duration: 2.5, ease: [0.32, 0.72, 0, 1], repeat: Infinity }}
                                />
                            </motion.div>
                            <div className="hidden lg:block text-left">
                                <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">Student</p>
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
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">Student Name</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 font-medium tracking-tight">student@originbi.com</p>
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
