import React from "react";

interface IconProps {
    className?: string;
    size?: number;
}

export const SidebarOpenIcon: React.FC<IconProps> = ({ className = "", size = 20 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 4V20" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H15V4Z" fill="currentColor"/>
        <path d="M11 9L8 12L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const SidebarCloseIcon: React.FC<IconProps> = ({ className = "", size = 20 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 4V20" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H15V4Z" fill="currentColor"/>
        <path d="M8 9L11 12L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const SidebarMobileIcon: React.FC<IconProps> = ({ className = "", size = 20 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 4V20" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H15V4Z" fill="currentColor"/>
        <path d="M11 9L8 12L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
