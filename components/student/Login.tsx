'use client';

import React from 'react';
import Logo from '../ui/Logo';
import LoginForm from './LoginForm';
import Testimonial from './Testimonial';
import ThemeToggle from '../ui/ThemeToggle';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-[#FAFAFA] dark:bg-brand-dark-primary transition-colors duration-300">
      {/* GLOBAL BACKGROUND LAYERS (Full Screen) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Light Theme Background */}
        <div className="absolute inset-0 bg-[url('/Background_Light_Theme.svg')] bg-cover bg-center bg-no-repeat opacity-100 dark:hidden" />
        {/* Dark Theme Background */}
        <div className="absolute inset-0 bg-[url('/Background_Dark_Theme.svg')] bg-cover bg-center bg-no-repeat opacity-100 hidden dark:block" />

        {/* Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-green/5 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-normal" />
      </div>

      {/* CONTENT CONTAINER (Centered / Max Width) */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-12 lg:h-screen min-h-[100dvh] px-[clamp(24px,8.33vw,160px)]">
        {/* Left Column: Grid Layout [Header, Content, Footer] */}
        <div className="order-1 lg:col-span-5 flex flex-col justify-center gap-[clamp(16px,2vw,32px)] h-full py-[clamp(16px,2vw,32px)] px-1 relative lg:overflow-y-auto z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {/* Header */}
          <header className="w-full max-w-[clamp(360px,30vw,640px)] self-start flex items-center justify-between shrink-0">
            <div className="w-[clamp(100px,7vw,130px)]">
              <Logo className="w-full h-auto object-contain" />
            </div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </header>

          {/* Main Content */}
          <div className="w-full max-w-[clamp(360px,30vw,640px)] self-start flex flex-col justify-center">
            <div className="text-left w-full mb-[clamp(16px,2vw,32px)]">
              <h1 className="font-sans font-semibold text-brand-text-light-primary dark:text-brand-text-primary tracking-[0%] leading-none mb-2 text-[clamp(24px,2.5vw,40px)]">
                Login to your account
              </h1>
              <p className="font-sans text-brand-text-light-secondary dark:text-brand-text-secondary font-normal tracking-[0%] leading-none text-[clamp(13px,1vw,16px)]">
                Discover, connect, and grow with OriginBI
              </p>
              <div className="w-full h-px bg-brand-light-tertiary dark:bg-white/10 mt-[clamp(20px,2vw,40px)]" />
            </div>
            <LoginForm onLoginSuccess={onLoginSuccess} />
          </div>

          {/* Footer */}
          <footer className="w-full max-w-[clamp(360px,30vw,640px)] self-start flex flex-col-reverse sm:flex-row items-center justify-between text-[clamp(11px,0.8vw,14px)] font-medium leading-none tracking-[0px] text-brand-green gap-4 shrink-0 mt-8">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-brand-green/80 transition-colors text-right underline decoration-solid decoration-0 underline-offset-2">Privacy Policy</a>
              <span className="border-r border-brand-light-tertiary dark:border-white/20 h-3 hidden sm:block"></span>
              <a href="#" className="hover:text-brand-green/80 transition-colors text-right underline decoration-solid decoration-0 underline-offset-2">Terms & Conditions</a>
            </div>
            <span className="opacity-100 text-brand-text-light-secondary dark:text-white">&copy; OriginBI {new Date().getFullYear()}</span>
          </footer>
        </div>
        {/* Right Column: Testimonial/Hero Image */}
        <div className="order-2 lg:col-span-7 hidden lg:flex h-full p-[clamp(16px,2vw,32px)] items-center justify-center">
          <div className="w-full h-full rounded-[clamp(1.5rem,2.5vw,2.5rem)] overflow-hidden relative shadow-2xl">
            <Testimonial />
          </div>
        </div>

        <div className="order-2 lg:hidden hidden">
          {/* Mobile Testimonial Placeholder */}
        </div>
      </div>
    </div>
  );
};

export default Login;
