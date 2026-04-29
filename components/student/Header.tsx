"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import {
    DashboardIcon,
    JobsIcon,
    ProfileIcon,
    SettingsIcon,
    LogoutIcon,
    MenuIcon,
    ChevronDownIcon,
} from '../icons';

interface HeaderProps {
    onLogout?: () => void;
    currentView?: "dashboard" | "assessment" | "profile" | "details";
    onNavigate?: (view: "dashboard" | "assessment" | "profile" | "details") => void;
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
    return (
        <div className="relative group">
            <button
                onClick={onClick}
                className={`flex items-center gap-2 rounded-full transition-all duration-200 w-full ${
                    isMobile ? "py-3.5 px-4" : "h-9 px-3.5"
                } cursor-pointer ${
                    active
                        ? "bg-[#1ED36A] text-white"
                        : "bg-gray-50 border border-gray-200 text-[#19211C] hover:bg-gray-100 hover:text-black hover:border-gray-300 dark:bg-white/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
            >
                <div className={`${active ? "text-white" : "text-[#1ED36A] dark:text-brand-green"}`}>
                    {icon}
                </div>
                <span className={`font-medium ${isMobile ? "text-sm ml-2" : "text-[10.5px] xl:text-[11.5px]"} whitespace-nowrap hidden lg:inline`}>
                    {label}
                </span>
                {isMobile && <span className="font-medium text-sm ml-2">{label}</span>}
            </button>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({
    onLogout,
    currentView,
    onNavigate,
}) => {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const user = {
        name: "Candidate",
        email: "candidate@originbi.com"
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
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

    const handleNavClick = (view: "dashboard" | "assessment" | "profile" | "details") => {
        onNavigate?.(view);
        setMobileMenuOpen(false);
    };

    const isDashboardActive = currentView === 'dashboard';
    const isAssessmentActive = currentView === 'assessment';
    const isProfileActive = currentView === 'profile';

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
                icon={<JobsIcon />}
                label="Assessment"
                active={isAssessmentActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("assessment")}
            />
            <NavItem
                icon={<ProfileIcon />}
                label="Profile"
                active={isProfileActive}
                isMobile={isMobile}
                onClick={() => handleNavClick("profile")}
            />
        </>
    );

    return (
        <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 dark:bg-[#19211C]/95 backdrop-blur-xl border-b border-[#E0E0E0] dark:border-white/[0.08] transition-colors duration-500">
            <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-2.5 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        id="mobile-menu-btn"
                        className="md:hidden text-gray-700 dark:text-white p-1 cursor-pointer"
                        onClick={() => setMobileMenuOpen((p) => !p)}
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="flex items-center">
                        <img src="/Origin-BI-Logo-01.png" alt="OriginBI Logo" className="h-5 lg:h-5.5 2xl:h-6 w-auto dark:hidden" />
                        <img src="/Origin-BI-white-logo.png" alt="OriginBI Logo" className="h-5 lg:h-5.5 2xl:h-6 w-auto hidden dark:block" />
                    </div>

                    <nav className="hidden md:flex items-center space-x-1.5 ml-4">
                        {renderNavItems(false)}
                    </nav>
                </div>

                <div className="flex items-center gap-2 relative z-[200]">
                    <div className="hidden sm:block scale-90">
                        <ThemeToggle />
                    </div>

                    <div className="w-px h-5 bg-gray-200 dark:bg-white/10 hidden lg:block mx-1"></div>

                    {/* User Profile Section */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setProfileOpen((prev) => !prev)}
                            className="flex items-center gap-2.5 focus:outline-none text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center text-brand-green font-bold text-xs">
                                {user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="hidden xl:block text-left">
                                <p className="font-semibold text-[13px] leading-tight text-black dark:text-white">
                                    {user.name}
                                </p>
                                <p className="text-[10px] text-black dark:text-white leading-tight">
                                    {user.email}
                                </p>
                            </div>
                            <ChevronDownIcon
                                className={`w-3.5 h-3.5 text-black dark:text-white transition-transform hidden sm:block ${
                                    isProfileOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-brand-light-secondary dark:bg-brand-dark-secondary rounded-xl shadow-2xl z-[100] border border-brand-light-tertiary dark:border-brand-dark-tertiary/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-3 border-b border-brand-light-tertiary dark:border-brand-dark-tertiary bg-gray-50/50 dark:bg-white/5">
                                    <p className="text-sm font-semibold text-black dark:text-white truncate">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-black dark:text-white truncate mt-0.5">
                                        {user.email}
                                    </p>
                                </div>

                                <div className="p-2">
                                    <button
                                        onClick={() => handleNavClick("profile")}
                                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-brand-text-light-primary dark:text-white rounded-lg hover:bg-brand-light-tertiary dark:hover:bg-brand-dark-tertiary transition-colors cursor-pointer"
                                    >
                                        <SettingsIcon className="w-4 h-4 mr-3 text-brand-green" />
                                        <span>Settings</span>
                                    </button>
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                                    >
                                        <LogoutIcon className="w-4 h-4 mr-3" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div
                    ref={mobileMenuRef}
                    className="md:hidden absolute top-full left-0 w-full bg-brand-light-secondary dark:bg-[#19211C] shadow-xl z-40 border-t border-brand-light-tertiary dark:border-white/[0.08] animate-in slide-in-from-top duration-300"
                >
                    <nav className="flex flex-col p-4 space-y-2">
                        {renderNavItems(true)}
                        <div className="border-t border-brand-light-tertiary dark:border-brand-dark-tertiary my-2 pt-4 flex items-center justify-between px-2">
                            <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Appearance</span>
                            <ThemeToggle />
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
