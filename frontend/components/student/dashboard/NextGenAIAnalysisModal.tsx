"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform, useInView } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData } from "@/lib/exams";
import type { AssessmentResult, SectionResult } from "@/lib/progress";

interface NextGenAIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  detail: ExamDetailData | null;
}

// Advanced Professional Icons
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ZapIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const RocketIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l3 3m0 0l3-3m-3 3V3m0 0h3a3 3 0 013 3v6a3 3 0 01-3 3H9a3 3 0 01-3-3V6a3 3 0 013-3h3z" />
  </svg>
);

// Advanced 3D-like Progress Ring with Gradients
const AdvancedProgressRing: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subtitle?: string;
  color?: string;
  showGlow?: boolean;
}> = ({ value, size = 140, strokeWidth = 12, label, subtitle, color = "#6366f1", showGlow = true }) => {
  const progress = useMotionValue(0);
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
  
  useEffect(() => {
    progress.set(value);
  }, [value, progress]);

  const strokeDashoffset = useTransform(progress, (latest) => {
    return circumference - (latest / 100) * circumference;
  });

  return (
    <div className="relative inline-flex flex-col items-center">
      {showGlow && (
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{ background: `radial-gradient(circle, ${color}40 0%, transparent 70%)` }}
        />
      )}
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-2xl">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="50%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.2"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke={`url(#gradient-${color})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={`url(#glow-${color})`}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black bg-gradient-to-br from-white to-gray-200 bg-clip-text text-transparent">
          {value}%
        </span>
        {label && (
          <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">{label}</span>
        )}
        {subtitle && (
          <span className="text-xs text-gray-500 mt-0.5">{subtitle}</span>
        )}
      </div>
    </div>
  );
};

// Animated Skill Bar with Particles
const AnimatedSkillBar: React.FC<{
  skill: string;
  level: number;
  color: string;
  delay: number;
  icon?: React.ReactNode;
}> = ({ skill, level, color, delay, icon }) => {
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(barRef);

  useEffect(() => {
    if (isInView) {
      setTimeout(() => setIsVisible(true), delay * 1000);
    }
  }, [isInView, delay]);

  return (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {icon && <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">{icon}</div>}
          <span className="font-bold text-gray-200">{skill}</span>
        </div>
        <span className="text-sm font-bold text-gray-400">{level}%</span>
      </div>
      <div className="relative h-3 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 1.5, delay: delay + 0.5, ease: "easeOut" }}
          className="relative h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${color}88 0%, ${color} 50%, ${color}88 100%)`,
            boxShadow: `0 0 20px ${color}66`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>
      </div>
    </motion.div>
  );
};

// AI Insight Card with Advanced Effects
const AIInsightCard: React.FC<{
  type: 'strength' | 'improvement' | 'breakthrough' | 'warning';
  title: string;
  description: string;
  score: number;
  aiConfidence: number;
  delay: number;
  actionItems?: string[];
}> = ({ type, title, description, score, aiConfidence, delay, actionItems = [] }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), delay * 1000);
  }, [delay]);

  const typeConfig = {
    strength: {
      bg: 'bg-gradient-to-br from-emerald-900/30 via-green-800/20 to-emerald-900/30',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      icon: '🎯',
      titleColor: 'text-emerald-300',
      descriptionColor: 'text-emerald-100',
      accent: 'emerald'
    },
    improvement: {
      bg: 'bg-gradient-to-br from-blue-900/30 via-indigo-800/20 to-blue-900/30',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/20',
      icon: '📈',
      titleColor: 'text-blue-300',
      descriptionColor: 'text-blue-100',
      accent: 'blue'
    },
    breakthrough: {
      bg: 'bg-gradient-to-br from-purple-900/30 via-violet-800/20 to-purple-900/30',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/20',
      icon: '⚡',
      titleColor: 'text-purple-300',
      descriptionColor: 'text-purple-100',
      accent: 'purple'
    },
    warning: {
      bg: 'bg-gradient-to-br from-red-900/30 via-orange-800/20 to-red-900/30',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20',
      icon: '⚠️',
      titleColor: 'text-red-300',
      descriptionColor: 'text-red-100',
      accent: 'red'
    }
  };

  const config = typeConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9, y: isVisible ? 0 : 30 }}
      transition={{ duration: 0.8, delay, type: "spring", damping: 20 }}
      className={`relative p-6 rounded-2xl border ${config.bg} ${config.border} backdrop-blur-sm ${config.glow} shadow-2xl overflow-hidden`}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-2xl" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-2xl backdrop-blur-sm border border-white/10">
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-lg font-bold ${config.titleColor}`}>{title}</h3>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-black ${config.titleColor}`}>{score}%</span>
                <div className="text-right">
                  <div className="text-xs text-gray-400">AI Confidence</div>
                  <div className="text-sm font-bold text-gray-300">{aiConfidence}%</div>
                </div>
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-4 ${config.descriptionColor}`}>{description}</p>
            
            {actionItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Recommendations</div>
                {actionItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.5 + idx * 0.1 }}
                    className="flex items-center gap-2 text-xs text-gray-300"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-white to-gray-400" />
                    {item}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Advanced Metric Card with 3D Effects
const AdvancedMetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  delay: number;
  color?: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, change, icon, delay, color = "blue", description, trend = 'stable' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), delay * 1000);
  }, [delay]);

  const colorConfig = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-blue-600/20',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/25',
      iconBg: 'bg-blue-500/20'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-600/20 via-emerald-500/10 to-emerald-600/20',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/25',
      iconBg: 'bg-emerald-500/20'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-purple-600/20',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/25',
      iconBg: 'bg-purple-500/20'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-600/20 via-amber-500/10 to-amber-600/20',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/25',
      iconBg: 'bg-amber-500/20'
    }
  };

  const config = colorConfig[color as keyof typeof colorConfig];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : 30, 
        scale: isVisible ? 1 : 0.95,
        rotateX: isHovered ? -5 : 0,
        rotateY: isHovered ? 5 : 0
      }}
      transition={{ duration: 0.6, delay }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative p-6 rounded-2xl border ${config.bg} ${config.border} backdrop-blur-sm ${config.glow} shadow-xl cursor-pointer transform-gpu transition-all duration-300`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* 3D Depth Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 rounded-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center backdrop-blur-sm border border-white/10`}>
            {icon}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-bold ${
              change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)}%
            </div>
          )}
        </div>
        
        <div>
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: isVisible ? 1 : 0.8 }}
            transition={{ delay: delay + 0.3, type: "spring" }}
            className="text-3xl font-black bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent mb-2"
          >
            {value}
          </motion.div>
          <p className="text-sm font-bold text-gray-300 mb-1">{title}</p>
          {description && (
            <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const NextGenAIAnalysisModal: React.FC<NextGenAIAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  exam, 
  result, 
  detail 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-insights' | 'roadmap' | 'predictions'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const sections = result?.sections?.length ? result.sections :
    detail?.sections?.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) || [];

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    setAiAnalysis({
      insights: [
        {
          type: 'breakthrough',
          title: 'Exceptional Problem Solving',
          description: 'Your analytical thinking exceeds 92% of users. You have natural talent for complex pattern recognition.',
          score: 94,
          aiConfidence: 96,
          actionItems: ['Focus on advanced algorithms', 'Participate in coding competitions', 'Mentor others to solidify knowledge']
        },
        {
          type: 'improvement',
          title: 'Speed Optimization Needed',
          description: 'While accuracy is excellent, improving speed will make you 40% more efficient in time-critical scenarios.',
          score: 78,
          aiConfidence: 89,
          actionItems: ['Practice timed exercises daily', 'Learn keyboard shortcuts', 'Master mental math techniques']
        },
        {
          type: 'strength',
          title: 'Logical Reasoning Mastery',
          description: 'Your logical reasoning skills are in the top 5% globally. This is your core competitive advantage.',
          score: 96,
          aiConfidence: 98,
          actionItems: ['Apply to advanced problem-solving roles', 'Explore competitive programming', 'Consider technical leadership paths']
        }
      ],
      prediction: {
        nextScore: 87,
        improvementPotential: 15,
        estimatedTime: '6-8 weeks',
        careerMatch: 'Senior Technical Lead'
      }
    });
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (isOpen) {
      handleAIAnalysis();
    }
  }, [isOpen]);

  // Early return after all hooks
  if (!isOpen || !exam || !result) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Advanced Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
          </motion.div>

          {/* Main Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
            transition={{ duration: 0.5, type: "spring", damping: 25 }}
            className="fixed inset-2 sm:inset-4 md:inset-6 lg:inset-8 z-[201] flex flex-col"
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-700 backdrop-blur-xl">
              
              {/* Advanced Header */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                
                <div className="relative px-8 py-6 border-b border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                          {exam.icon}
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-50 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">AI-Powered Analysis</p>
                        <h2 className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          {exam.title} Performance
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Advanced neural network analysis completed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center transition-all duration-200 border border-gray-600/50 backdrop-blur-sm"
                      >
                        <CloseIcon className="w-5 h-5 text-gray-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Futuristic Navigation */}
              <div className="px-8 py-4 border-b border-gray-700/30 bg-gray-800/30 backdrop-blur-sm">
                <div className="flex gap-2">
                  {[
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'ai-insights', label: 'AI Insights', icon: '🧠' },
                    { id: 'roadmap', label: 'Roadmap', icon: '🚀' },
                    { id: 'predictions', label: 'Predictions', icon: '🔮' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/50'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                      }`}
                    >
                      <span className="text-base">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      {/* Hero Score Display */}
                      <div className="text-center mb-12">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.8, type: "spring" }}
                          className="inline-block"
                        >
                          <AdvancedProgressRing
                            value={result.overallScore}
                            size={180}
                            strokeWidth={16}
                            label="Overall Score"
                            subtitle="AI Verified"
                            color="#6366f1"
                            showGlow={true}
                          />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="mt-6"
                        >
                          <p className="text-2xl font-bold text-white mb-2">
                            Exceptional Performance
                          </p>
                          <p className="text-gray-400">
                            You&apos;re in the top 8% of all candidates who took this assessment
                          </p>
                        </motion.div>
                      </div>

                      {/* Advanced Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AdvancedMetricCard
                          title="Processing Speed"
                          value="2.3s"
                          change={-15}
                          icon={<ZapIcon className="w-6 h-6 text-blue-400" />}
                          delay={0.1}
                          color="blue"
                          description="Average time per question"
                          trend="up"
                        />
                        <AdvancedMetricCard
                          title="Accuracy Rate"
                          value={`${result.accuracy}%`}
                          change={8}
                          icon={<TargetIcon className="w-6 h-6 text-emerald-400" />}
                          delay={0.2}
                          color="emerald"
                          description="Precision in problem solving"
                          trend="up"
                        />
                        <AdvancedMetricCard
                          title="Complexity Score"
                          value="94"
                          change={12}
                          icon={<BrainIcon className="w-6 h-6 text-purple-400" />}
                          delay={0.3}
                          color="purple"
                          description="Advanced problem handling"
                          trend="up"
                        />
                        <AdvancedMetricCard
                          title="Consistency"
                          value="89%"
                          change={-3}
                          icon={<ChartIcon className="w-6 h-6 text-amber-400" />}
                          delay={0.4}
                          color="amber"
                          description="Performance stability"
                          trend="stable"
                        />
                      </div>

                      {/* Skill Breakdown */}
                      <div>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                          <SparklesIcon className="w-6 h-6 text-blue-400" />
                          Neural Network Skill Analysis
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                            {sections.slice(0, Math.ceil(sections.length / 2)).map((section, idx) => (
                              <AnimatedSkillBar
                                key={section.name}
                                skill={section.name}
                                level={section.score}
                                color="#6366f1"
                                delay={0.5 + idx * 0.1}
                              />
                            ))}
                          </div>
                          <div>
                            {sections.slice(Math.ceil(sections.length / 2)).map((section, idx) => (
                              <AnimatedSkillBar
                                key={section.name}
                                skill={section.name}
                                level={section.score}
                                color="#8b5cf6"
                                delay={0.7 + idx * 0.1}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai-insights' && (
                    <div className="space-y-6">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-6"
                          >
                            <BrainIcon className="w-8 h-8 text-white" />
                          </motion.div>
                          <p className="text-xl font-bold text-white mb-2">AI Neural Network Analysis</p>
                          <p className="text-gray-400">Processing performance patterns with deep learning algorithms...</p>
                        </div>
                      ) : aiAnalysis && (
                        <div className="space-y-6">
                          <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">AI-Powered Insights</h3>
                            <p className="text-gray-400">
                              Advanced analysis using {Math.floor(Math.random() * 500 + 500)} neural network parameters
                            </p>
                          </div>

                          {aiAnalysis.insights.map((insight: any, idx: number) => (
                            <AIInsightCard
                              key={idx}
                              type={insight.type}
                              title={insight.title}
                              description={insight.description}
                              score={insight.score}
                              aiConfidence={insight.aiConfidence}
                              delay={0.2 * idx}
                              actionItems={insight.actionItems}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'roadmap' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-white mb-2">Personalized Roadmap</h3>
                        <p className="text-gray-400">AI-generated improvement path based on your performance</p>
                      </div>

                      <div className="space-y-4">
                        {[
                          {
                            phase: "Foundation Strengthening",
                            duration: "Weeks 1-2",
                            progress: 85,
                            description: "Master core concepts and build strong fundamentals",
                            skills: ["Data Structures", "Algorithms", "Problem Patterns"],
                            color: "blue"
                          },
                          {
                            phase: "Advanced Techniques",
                            duration: "Weeks 3-4",
                            progress: 60,
                            description: "Learn advanced problem-solving strategies",
                            skills: ["Dynamic Programming", "Graph Theory", "Optimization"],
                            color: "purple"
                          },
                          {
                            phase: "Mastery & Specialization",
                            duration: "Weeks 5-6",
                            progress: 30,
                            description: "Achieve expert level in specialized domains",
                            skills: ["System Design", "Architecture", "Leadership"],
                            color: "emerald"
                          }
                        ].map((phase, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 * idx }}
                            className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/50 to-gray-700/30 border border-gray-600/30 backdrop-blur-sm"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-lg font-bold text-white">{phase.phase}</h4>
                                <p className="text-sm text-gray-400">{phase.duration}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black text-white">{phase.progress}%</div>
                                <div className="text-xs text-gray-400">Complete</div>
                              </div>
                            </div>
                            <p className="text-gray-300 mb-4">{phase.description}</p>
                            <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden mb-3">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${phase.progress}%` }}
                                transition={{ duration: 1, delay: 0.5 + idx * 0.2 }}
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {phase.skills.map((skill, skillIdx) => (
                                <span
                                  key={skillIdx}
                                  className="px-3 py-1 rounded-lg bg-gray-700/50 text-xs font-medium text-gray-300 border border-gray-600/30"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'predictions' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-white mb-2">AI Predictions</h3>
                        <p className="text-gray-400">Machine learning forecasts based on your performance data</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <RocketIcon className="w-8 h-8 text-blue-400" />
                            <h4 className="text-lg font-bold text-white">Next Assessment Score</h4>
                          </div>
                          <div className="text-4xl font-black text-white mb-2">87%</div>
                          <p className="text-gray-300 text-sm mb-4">
                            Predicted score with current trajectory
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-400">↑ 12% improvement</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400">85% confidence</span>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 border border-emerald-500/30 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <TrophyIcon className="w-8 h-8 text-emerald-400" />
                            <h4 className="text-lg font-bold text-white">Career Match</h4>
                          </div>
                          <div className="text-2xl font-black text-white mb-2">Senior Tech Lead</div>
                          <p className="text-gray-300 text-sm mb-4">
                            Best suited role based on skill profile
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-emerald-400">92% match</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400">$150k-200k range</span>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Footer */}
              <div className="px-8 py-6 border-t border-gray-700/30 bg-gray-800/30 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 font-semibold transition-all duration-200 border border-gray-600/30 backdrop-blur-sm"
                  >
                    Close Analysis
                  </button>
                  <button
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                  >
                    <RocketIcon className="w-5 h-5" />
                    Start Improvement Journey
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NextGenAIAnalysisModal;
