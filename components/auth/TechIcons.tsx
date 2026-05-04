"use client";

import React from "react";
import {
  FaJava,
  FaPython,
  FaReact,
  FaNodeJs,
  FaAws,
  FaHtml5,
  FaCss3Alt,
  FaDatabase,
  FaGitAlt,
} from "react-icons/fa";
import {
  SiTypescript,
  SiJavascript,
  SiMongodb,
  SiDocker,
  SiKubernetes,
  SiGraphql,
  SiTailwindcss,
  SiFlutter,
  SiGo,
  SiRust,
} from "react-icons/si";
import { TbBrandCpp, TbBinaryTree } from "react-icons/tb";
import { HiOutlineChatBubbleLeftRight, HiOutlineLightBulb } from "react-icons/hi2";
import { MdOutlinePsychology } from "react-icons/md";

/* ═══════════════════════════════════════════════════════════════
   Infinite Tech Marquee — Vertical scrolling columns on left/right
   Creates elegant side-mounted tech cloud animations
   ═══════════════════════════════════════════════════════════════ */

const leftIcons = [
  { icon: <FaJava color="#E76F00" />, label: "Java" },
  { icon: <FaPython color="#3776AB" />, label: "Python" },
  { icon: <TbBinaryTree color="#10b981" />, label: "DSA" },
  { icon: <SiTypescript color="#3178C6" />, label: "TS" },
  { icon: <FaReact color="#61DAFB" />, label: "React" },
  { icon: <MdOutlinePsychology color="#8b5cf6" />, label: "Aptitude" },
  { icon: <SiMongodb color="#47A248" />, label: "MongoDB" },
  { icon: <FaNodeJs color="#339933" />, label: "Node" },
  { icon: <HiOutlineLightBulb color="#f59e0b" />, label: "Logic" },
  { icon: <SiGraphql color="#E10098" />, label: "GraphQL" },
];

const rightIcons = [
  { icon: <HiOutlineChatBubbleLeftRight color="#3b82f6" />, label: "Comm." },
  { icon: <SiJavascript color="#F7DF1E" />, label: "JS" },
  { icon: <FaAws color="#FF9900" />, label: "AWS" },
  { icon: <SiDocker color="#2496ED" />, label: "Docker" },
  { icon: <TbBrandCpp color="#00599C" />, label: "C++" },
  { icon: <SiKubernetes color="#326CE5" />, label: "K8s" },
  { icon: <FaGitAlt color="#F05032" />, label: "Git" },
  { icon: <SiTailwindcss color="#06B6D4" />, label: "Tailwind" },
  { icon: <SiFlutter color="#02569B" />, label: "Flutter" },
  { icon: <SiRust color="#CE422B" />, label: "Rust" },
];

function MarqueeColumn({ 
  icons, 
  direction = "up", 
  speed = "40s" 
}: { 
  icons: { icon: React.ReactNode; label: string }[]; 
  direction?: "up" | "down";
  speed?: string;
}) {
  const animationClass = direction === "up" ? "animate-marquee-vertical-up" : "animate-marquee-vertical-down";
  
  return (
    <div className="relative flex flex-col h-full overflow-hidden py-4">
      <div 
        className={`flex flex-col gap-12 shrink-0 ${animationClass}`}
        style={{ animationDuration: speed }}
      >
        {/* Render icons multiple times for seamless loop */}
        {[...icons, ...icons, ...icons].map((item, i) => (
          <div 
            key={i} 
            className="flex flex-col items-center justify-center transition-all duration-500 hover:scale-125 opacity-40 hover:opacity-100 group"
          >
            <div className="text-4xl md:text-5xl filter drop-shadow-md transition-filter group-hover:drop-shadow-[0_0_8px_rgba(30,211,106,0.4)]">
              {item.icon}
            </div>
            <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-brand-text-light-secondary/40 dark:text-brand-text-secondary/30 group-hover:text-brand-green transition-colors">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TechIcons() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden hidden lg:block select-none">
      {/* Edge Fading Gradients */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FAFAFA] dark:from-brand-dark-primary to-transparent z-[2]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FAFAFA] dark:from-brand-dark-primary to-transparent z-[2]" />
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAFAFA] dark:from-brand-dark-primary to-transparent z-[2]" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#FAFAFA] dark:from-brand-dark-primary to-transparent z-[2]" />

      <div className="flex justify-between h-full px-8 xl:px-16 2xl:px-24">
        {/* Left Side Marquees */}
        <div className="flex gap-12 xl:gap-20 h-full">
          <MarqueeColumn icons={leftIcons} direction="up" speed="50s" />
          <MarqueeColumn icons={rightIcons.slice(0, 5)} direction="down" speed="60s" />
        </div>

        {/* Right Side Marquees */}
        <div className="flex gap-12 xl:gap-20 h-full">
          <MarqueeColumn icons={leftIcons.slice(0, 5)} direction="down" speed="55s" />
          <MarqueeColumn icons={rightIcons} direction="up" speed="45s" />
        </div>
      </div>
    </div>
  );
}
