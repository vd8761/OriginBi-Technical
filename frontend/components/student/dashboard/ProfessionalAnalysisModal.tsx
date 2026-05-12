"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData } from "@/lib/exams";
import type { AssessmentResult, SectionResult } from "@/lib/progress";

interface ProfessionalAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  detail: ExamDetailData | null;
}

// Professional Icons
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// Professional Circular Progress Component
const CircularProgress: React.FC<{ 
  value: number; 
  size?: number; 
  strokeWidth?: number; 
  color?: string;
  showPercentage?: boolean;
  label?: string;
}> = ({ value, size = 120, strokeWidth = 8, color = "#10b981", showPercentage = true, label }) => {
  const progress = useMotionValue(0);
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
  
  useEffect(() => {
    progress.set(value);
  }, [value, progress]);

  const strokeDashoffset = useTransform(progress, (latest) => {
    return circumference - (latest / 100) * circumference;
  });

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-2xl font-bold text-gray-900">{value}%</span>
        )}
        {label && (
          <span className="text-xs font-medium text-gray-500 mt-1">{label}</span>
        )}
      </div>
    </div>
  );
};

// Animated Metric Card
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay: number;
  color?: string;
}> = ({ title, value, icon, trend, delay, color = "gray" }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const colorClasses = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5, delay }}
      className={`p-6 rounded-2xl border ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-xl bg-white/50">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUpIcon className="w-3 h-3" />
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-sm font-medium text-gray-600">{title}</p>
      </div>
    </motion.div>
  );
};

// Performance Insight Card
const InsightCard: React.FC<{
  type: 'strength' | 'improvement' | 'critical';
  title: string;
  description: string;
  score: number;
  delay: number;
}> = ({ type, title, description, score, delay }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const typeConfig = {
    strength: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
      border: 'border-emerald-200',
      icon: '✓',
      iconBg: 'bg-emerald-100',
      titleColor: 'text-emerald-800',
      descriptionColor: 'text-emerald-700',
    },
    improvement: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      icon: '↑',
      iconBg: 'bg-blue-100',
      titleColor: 'text-blue-800',
      descriptionColor: 'text-blue-700',
    },
    critical: {
      bg: 'bg-gradient-to-br from-red-50 to-orange-50',
      border: 'border-red-200',
      icon: '!',
      iconBg: 'bg-red-100',
      titleColor: 'text-red-800',
      descriptionColor: 'text-red-700',
    },
  };

  const config = typeConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.95 }}
      transition={{ duration: 0.6, delay }}
      className={`p-6 rounded-2xl border ${config.bg} ${config.border}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center text-lg font-bold ${config.titleColor}`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-bold ${config.titleColor}`}>{title}</h4>
            <span className={`text-sm font-bold ${config.titleColor}`}>{score}%</span>
          </div>
          <p className={`text-sm leading-relaxed ${config.descriptionColor}`}>{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

const ProfessionalAnalysisModal: React.FC<ProfessionalAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  exam, 
  result, 
  detail 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'recommendations'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !exam || !result) return null;

  const sections = result.sections?.length ? result.sections :
    detail?.sections.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) || [];

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export functionality
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExporting(false);
  };

  const handleShare = async () => {
    // Simulate share functionality
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${exam.title} Results`,
          text: `I scored ${result.overallScore}% in ${exam.title}!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-4 sm:inset-6 md:inset-8 lg:inset-12 z-[151] flex flex-col"
          >
            <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
              
              {/* Header */}
              <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      {exam.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Performance Analysis</p>
                      <h2 className="text-2xl font-bold text-white">{exam.title}</h2>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/20"
                    >
                      <ShareIcon className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/20 disabled:opacity-50"
                    >
                      <DownloadIcon className={`w-5 h-5 text-white ${isExporting ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                      onClick={onClose}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/20"
                    >
                      <CloseIcon className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-8 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'insights', label: 'Insights', icon: '🧠' },
                    { id: 'recommendations', label: 'Recommendations', icon: '🎯' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      {/* Score Overview */}
                      <div className="flex flex-col lg:flex-row items-center gap-8">
                        <div className="flex-shrink-0">
                          <CircularProgress 
                            value={result.overallScore} 
                            size={160}
                            color="#10b981"
                            label="Overall Score"
                          />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <MetricCard
                            title="Time Taken"
                            value={result.timeTaken}
                            icon={<ClockIcon className="w-5 h-5" />}
                            delay={0.1}
                            color="blue"
                          />
                          <MetricCard
                            title="Accuracy"
                            value={`${result.accuracy}%`}
                            icon={<TargetIcon className="w-5 h-5" />}
                            delay={0.2}
                            color="green"
                          />
                          <MetricCard
                            title="Sections"
                            value={sections.length}
                            icon={<BrainIcon className="w-5 h-5" />}
                            delay={0.3}
                            color="amber"
                          />
                          <MetricCard
                            title="Questions"
                            value={exam.questions}
                            icon={<AwardIcon className="w-5 h-5" />}
                            delay={0.4}
                            color="purple"
                          />
                        </div>
                      </div>

                      {/* Section Breakdown */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <span>📈</span> Section Performance
                        </h3>
                        <div className="grid gap-4">
                          {sections.map((section, idx) => (
                            <motion.div
                              key={section.name}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * idx }}
                              className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50"
                            >
                              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-gray-700">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-900">{section.name}</h4>
                                  <span className="text-sm font-bold text-gray-700">{section.score}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${section.score}%` }}
                                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.8 }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'insights' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Performance Insights</h3>
                        <p className="text-gray-600">AI-powered analysis of your strengths and areas for improvement</p>
                      </div>

                      <div className="grid gap-6">
                        <InsightCard
                          type="strength"
                          title="Excellent Problem Solving"
                          description="You demonstrate strong analytical thinking and logical reasoning abilities. Keep up the great work!"
                          score={85}
                          delay={0.1}
                        />
                        <InsightCard
                          type="improvement"
                          title="Time Management"
                          description="Consider practicing timed exercises to improve your speed without sacrificing accuracy."
                          score={72}
                          delay={0.2}
                        />
                        <InsightCard
                          type="critical"
                          title="Advanced Topics"
                          description="Focus on complex problem patterns and algorithms to reach the next level."
                          score={58}
                          delay={0.3}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'recommendations' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Personalized Recommendations</h3>
                        <p className="text-gray-600">Actionable steps to improve your performance</p>
                      </div>

                      <div className="grid gap-4">
                        {[
                          {
                            title: "Daily Practice Routine",
                            description: "Spend 30 minutes daily on problem-solving exercises. Focus on weak areas identified in this analysis.",
                            priority: "High",
                            estimatedTime: "2 weeks",
                          },
                          {
                            title: "Advanced Study Materials",
                            description: "Explore advanced resources and practice problems to deepen your understanding.",
                            priority: "Medium",
                            estimatedTime: "1 month",
                          },
                          {
                            title: "Mock Assessments",
                            description: "Take weekly mock tests to track progress and build exam confidence.",
                            priority: "High",
                            estimatedTime: "Ongoing",
                          },
                        ].map((rec, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-bold text-gray-900">{rec.title}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                rec.priority === 'High' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {rec.priority} Priority
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{rec.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>⏱️ {rec.estimatedTime}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-8 py-6 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Close Analysis
                  </button>
                  <button
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <TargetIcon className="w-5 h-5" />
                    Practice Again
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

export default ProfessionalAnalysisModal;
