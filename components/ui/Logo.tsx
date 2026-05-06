'use client';

import React from 'react';
const Logo: React.FC<{ className?: string }> = ({ className = "h-9" }) => {
  return (
    <>
      {/* Light Theme Logo (Hidden in Dark Mode) */}
      <img
        src="/Origin-BI-Logo-01.png"
        alt="OriginBI Logo"
        className={`select-none dark:hidden block ${className}`}
        draggable={false}
      />
      {/* Dark Theme Logo (Visible in Dark Mode) */}
      <img
        src="/Origin-BI-white-logo.png"
        alt="OriginBI Logo"
        className={`select-none hidden dark:block ${className}`}
        draggable={false}
      />
    </>
  );
};

export default Logo;
