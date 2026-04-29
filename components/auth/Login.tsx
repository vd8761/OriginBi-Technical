"use client";

import React from "react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LoginForm from "./LoginForm";
import Testimonial from "./Testimonial";

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full h-full min-h-screen grid grid-cols-1 lg:grid-cols-12 px-6 lg:px-20 py-8 lg:py-0">
        {/* Left Side: Form */}
        <div className="lg:col-span-5 flex flex-col justify-between py-10 max-w-xl mx-auto w-full">
          <header className="flex items-center justify-between mb-12">
            <Logo />
            <ThemeToggle />
          </header>

          <main className="flex-1 flex flex-col justify-center">
            <div className="space-y-3 mb-10">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Login to your account
              </h1>
              <p className="text-foreground/60 text-lg">
                Discover, connect, and grow with OriginBI Technical
              </p>
              <div className="w-20 h-1.5 bg-primary rounded-full mt-4"></div>
            </div>

            <LoginForm onLoginSuccess={onLoginSuccess} />
          </main>

          <footer className="mt-12 pt-8 border-t border-foreground/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-foreground/40 font-medium">
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            </div>
            <p>&copy; {new Date().getFullYear()} OriginBI Technical</p>
          </footer>
        </div>

        {/* Right Side: Hero/Testimonial */}
        <div className="lg:col-span-7 hidden lg:flex h-full py-10 pl-10">
          <Testimonial />
        </div>
      </div>
    </div>
  );
};

export default Login;
