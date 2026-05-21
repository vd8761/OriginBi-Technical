"use client";

import Script from "next/script";

/**
 * Inline theme-init script injected before page hydration.
 * Uses next/script with strategy="beforeInteractive" so it runs
 * before React hydrates — prevents flash of wrong theme.
 */
export function ThemeScript() {
  return (
    <Script
      id="theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem('theme');if(s==='dark'){document.documentElement.classList.add('dark')}else if(s==='light'){document.documentElement.classList.remove('dark')}else{if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}}catch(e){}})();`,
      }}
    />
  );
}
