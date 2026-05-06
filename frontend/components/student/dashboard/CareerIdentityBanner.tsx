"use client";

import React from "react";
import { motion } from "framer-motion";
import type { CareerIdentity } from "@/lib/progress";

interface CareerIdentityBannerProps {
  userName: string;
  identity: CareerIdentity;
}

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);

const CareerIdentityBanner: React.FC<CareerIdentityBannerProps> = ({ userName, identity }) => {
  const progressPct = Math.min(100, Math.round((identity.xp / identity.xpToNext) * 100));

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-brand-light-tertiary/40 dark:border-white/[0.08]">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark-primary via-[#1a2b1e] to-[#0f1a13]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-brand-green/25 to-transparent rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-emerald-600/15 to-transparent rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-brand-green/10 rounded-full blur-[80px]" />

      <div className="relative z-10 p-7 sm:p-10 lg:p-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left: Identity info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center gap-2 rounded-full bg-brand-green/15 border border-brand-green/30 px-4 py-1.5 text-brand-green text-[11px] font-bold uppercase tracking-[0.15em]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green" />
                </span>
                Career Identity
              </motion.span>
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.12em]">{identity.level}</span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-[52px] font-bold text-white tracking-tight leading-[1.05]"
            >
              {identity.archetype}
            </motion.h2>
            <p className="mt-3 text-[15px] text-white/60 max-w-xl leading-relaxed">{identity.subtitle}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {identity.badges.map((badge, i) => (
                <motion.span
                  key={badge}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-brand-green/25 text-[11px] font-bold text-brand-green tracking-wide"
                >
                  <ShieldIcon className="w-3 h-3" />
                  {badge}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Right: XP progress */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full lg:w-auto lg:min-w-[300px]"
          >
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-white/50 uppercase tracking-[0.15em]">Experience Points</span>
                <span className="font-bold text-white">{identity.xp.toLocaleString()} / {identity.xpToNext.toLocaleString()} XP</span>
              </div>
              <div className="h-3 rounded-full bg-white/[0.08] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.6 }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-green to-emerald-400 shadow-[0_0_12px_rgba(30,211,106,0.5)]"
                />
              </div>
              <p className="mt-4 text-xs text-white/40 leading-relaxed italic">&ldquo;{identity.quote}&rdquo;</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CareerIdentityBanner;
