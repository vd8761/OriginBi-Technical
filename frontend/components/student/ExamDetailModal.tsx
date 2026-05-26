"use client";

import React, { useEffect, useState } from "react";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  features: string[];
  badge?: string;
  popular?: boolean;
}

interface ExamDetail {
  focus: string;
  skills: { title: string; description: string }[];
  sections: { name: string; detail: string; weight: string }[];
  outcomes: string[];
  requirements: string[];
  pricingTiers: PricingTier[];
}

interface Exam {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  duration: string;
  questions: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  price: number;
  tags: string[];
  icon: React.ReactNode;
  available: boolean;
  statusLabel: string;
  accentColor: string;
  gradient: string;
}

interface ExamDetailModalProps {
  exam: Exam | null;
  detail: ExamDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (exam: Exam, tier?: PricingTier) => void;
}

type TabType = "overview" | "pricing" | "syllabus";

const ExamDetailModal: React.FC<ExamDetailModalProps> = ({
  exam,
  detail,
  isOpen,
  onClose,
  onStart,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("overview");
    setSelectedTier(null);
  }, [exam?.id, isOpen]);

  if (!isOpen || !exam || !detail) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStartExam = () => {
    const tier = selectedTier
      ? detail.pricingTiers.find((t) => t.id === selectedTier)
      : undefined;
    onStart(exam, tier);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white/95 dark:bg-[#111a15]/95 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div
            className="h-1.5 w-full"
            style={{ background: exam.gradient }}
          />
          <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-5">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${exam.accentColor}15`, color: exam.accentColor }}
                >
                  {exam.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        exam.available
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                      }`}
                    >
                      {exam.statusLabel}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {exam.difficulty}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-white tracking-tight">
                    {exam.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                    {exam.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
              >
                <svg className="w-5 h-5 transform group-hover:scale-110 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="group/stat rounded-2xl bg-slate-50/50 dark:bg-white/5 p-4 border border-slate-100/50 dark:border-white/5 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 group-hover/stat:text-brand-green transition-colors">Questions</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{exam.questions}</p>
              </div>
              <div className="group/stat rounded-2xl bg-slate-50/50 dark:bg-white/5 p-4 border border-slate-100/50 dark:border-white/5 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 group-hover/stat:text-cyan-500 transition-colors">Duration</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{exam.duration}</p>
              </div>
              <div className="group/stat rounded-2xl bg-slate-50/50 dark:bg-white/5 p-4 border border-slate-100/50 dark:border-white/5 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 group-hover/stat:text-purple-500 transition-colors">Certificate</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">Included</p>
              </div>
              <div className="group/stat rounded-2xl bg-slate-50/50 dark:bg-white/5 p-4 border border-slate-100/50 dark:border-white/5 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Price</p>
                <p className="text-xl font-bold" style={{ color: exam.accentColor }}>{exam.price === 0 || !exam.price ? "Free" : `₹${exam.price}`}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 sm:px-8 border-b border-slate-100/60 dark:border-white/5 relative">
          {[
            { id: "overview", label: "Overview", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "pricing", label: "Pricing", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "syllabus", label: "Syllabus", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                relative flex items-center gap-2 px-4 py-4 text-sm font-semibold transition-all duration-300
                ${
                  activeTab === tab.id
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-white/5 rounded-t-xl"
                }
              `}
            >
              {activeTab === tab.id && (
                <span 
                  className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full shadow-[0_-2px_8px_currentColor]"
                  style={{ background: exam.accentColor }} 
                />
              )}
              <svg className={`w-4 h-4 ${activeTab === tab.id ? 'transform scale-110 transition-transform' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-280px)] p-6 sm:p-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Focus */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">What this exam covers</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{detail.focus}</p>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">Skills assessed</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {detail.skills.map((skill, i) => (
                    <div
                      key={skill.title}
                      className="group p-5 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <h4 className="font-bold text-slate-800 dark:text-white mb-2 group-hover:text-brand-green transition-colors">{skill.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outcomes */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">What you&apos;ll receive</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {detail.outcomes.map((outcome) => (
                    <div key={outcome} className="flex items-start gap-3">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5"
                        style={{ background: `${exam.accentColor}20` }}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke={exam.accentColor}
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Requirements</h3>
                <div className="space-y-3">
                  {detail.requirements.map((req) => (
                    <div key={req} className="flex items-start gap-3">
                      <div
                        className="h-2 w-2 rounded-full mt-2 shrink-0"
                        style={{ background: exam.accentColor }}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Choose your plan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select the tier that best fits your needs. All plans include full access to the exam.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                {detail.pricingTiers.map((tier, i) => (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`
                      group relative p-6 rounded-[2rem] cursor-pointer transition-all duration-300 animate-slide-up overflow-hidden
                      ${
                        selectedTier === tier.id
                          ? "ring-2 bg-white dark:bg-[#161f1a] shadow-xl -translate-y-2"
                          : "bg-slate-50/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:-translate-y-1 hover:shadow-lg"
                      }
                    `}
                    style={{ "--tw-ring-color": selectedTier === tier.id ? exam.accentColor : undefined, animationDelay: `${i * 150}ms` } as React.CSSProperties}
                  >
                    {selectedTier === tier.id && (
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 opacity-50 pointer-events-none" />
                    )}
                    {tier.popular && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ background: exam.gradient }}
                      >
                        Most Popular
                      </div>
                    )}
                    {tier.badge && !tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {tier.badge}
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h4 className="font-semibold text-slate-800 dark:text-white">{tier.name}</h4>
                      <div className="mt-2">
                        {tier.originalPrice && (
                          <span className="text-sm text-slate-400 line-through block">₹{tier.originalPrice}</span>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-semibold text-slate-900 dark:text-white">₹{tier.price}</span>
                          {tier.discount && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Save {tier.discount}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-4">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <svg
                            className="w-4 h-4 shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke={exam.accentColor}
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={`
                        w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${
                          selectedTier === tier.id
                            ? "text-white"
                            : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15"
                        }
                      `}
                      style={{ background: selectedTier === tier.id ? exam.gradient : undefined }}
                    >
                      {selectedTier === tier.id ? "Selected" : "Select Plan"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              {selectedTier && (
                <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Selected Plan</span>
                    <span className="font-medium text-slate-800 dark:text-white">
                      {detail.pricingTiers.find((t) => t.id === selectedTier)?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
                    <span className="font-semibold text-slate-800 dark:text-white">Total</span>
                    <span className="text-xl font-semibold" style={{ color: exam.accentColor }}>
                      ₹{detail.pricingTiers.find((t) => t.id === selectedTier)?.price}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "syllabus" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Exam Structure</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  The exam is divided into the following sections with specific weightages.
                </p>
              </div>

              <div className="space-y-3">
                {detail.sections.map((section, index) => (
                  <div
                    key={section.name}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                      style={{ background: `${exam.accentColor}15`, color: exam.accentColor }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-800 dark:text-white">{section.name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{section.detail}</p>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: `${exam.accentColor}15`, color: exam.accentColor }}
                    >
                      {section.weight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 border-t border-slate-100/60 dark:border-white/5 bg-slate-50/30 dark:bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartExam}
            disabled={!exam.available}
            className="w-full sm:w-auto group relative overflow-hidden px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2"
            style={{ background: exam.gradient }}
          >
            {exam.available && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
            )}
            {exam.available ? (
              <>
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedTier ? `Pay ₹${detail.pricingTiers.find(t => t.id === selectedTier)?.price} & Start` : "Start Free Trial"}
                </span>
              </>
            ) : (
              <>
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Coming Soon
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailModal;
