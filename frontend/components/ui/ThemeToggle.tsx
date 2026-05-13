'use client';

import React from 'react';
import { LightModeIcon, DarkModeIcon } from '../icons';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface ThemeToggleProps {
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  theme: propTheme, 
  toggleTheme: propToggleTheme 
}) => {
  const [mounted, setMounted] = React.useState(false);
  const themeContext = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  const theme = propTheme || themeContext.theme;
  const toggleTheme = propToggleTheme || themeContext.toggleTheme;

  if (!mounted) {
    return <div className="w-16 h-8" />; // Placeholder with same dimensions
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center w-16 h-8 rounded-full bg-brand-light-tertiary dark:bg-brand-dark-tertiary cursor-pointer border border-[#19211C]/10 dark:border-white/10 shadow-[inset:1px_2px_4px_0px_rgba(25,33,28,0.15)] dark:shadow-[inset:1px_2px_4px_0px_rgba(25,33,28,0.5)]"
      aria-label="Toggle theme"
    >
      {/* Background icons */}
      <div className="flex justify-between w-full px-2 text-gray-500 dark:text-gray-400">
        <LightModeIcon className="w-4 h-4" />
        <DarkModeIcon className="w-4 h-4 text-[#150089] dark:text-gray-400" />
      </div>

      {/* Switch thumb */}
      <div
        className={`absolute top-1 left-1 flex items-center justify-center w-6 h-6 bg-brand-green rounded-full transform transition-transform duration-300 ease-in-out ${theme === 'dark' ? 'translate-x-8' : 'translate-x-0'} shadow-[0_1px_3px_rgba(25,33,28,0.2)] dark:shadow-[0_2px_4px_rgba(25,33,28,0.5)]`}
      >
        {theme === 'dark' ? (
          <DarkModeIcon className="w-3.5 h-3.5 text-white" />
        ) : (
          <LightModeIcon className="w-4 h-4 text-white" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
