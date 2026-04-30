"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

export interface Exam {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  duration: string;
  questions: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  price: number;
  originalPrice?: number;
  discount?: number;
  tags: string[];
  icon: React.ReactNode;
  available: boolean;
  statusLabel: string;
  accentColor: string;
  gradient: string;
  track?: string;
}

interface ExamCarouselProps {
  exams: Exam[];
  onSelectExam: (exam: Exam) => void;
  onStartExam: (exam: Exam) => void;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "bg-emerald-50 text-emerald-600 border-emerald-100";
    case "Intermediate":
      return "bg-amber-50 text-amber-600 border-amber-100";
    case "Advanced":
      return "bg-rose-50 text-rose-600 border-rose-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
};

const getDifficultyDarkColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
    case "Intermediate":
      return "dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    case "Advanced":
      return "dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
    default:
      return "dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }
};

const ExamCarousel: React.FC<ExamCarouselProps> = ({ exams, onSelectExam, onStartExam }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? exams.length - 1 : prev - 1));
  }, [exams.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === exams.length - 1 ? 0 : prev + 1));
  }, [exams.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    setTranslateX(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (translateX > 50) {
      handlePrev();
    } else if (translateX < -50) {
      handleNext();
    }
    setTranslateX(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (translateX > 50) {
      handlePrev();
    } else if (translateX < -50) {
      handleNext();
    }
    setTranslateX(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  return (
    <div className="relative w-full">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-30 blur-3xl transition-all duration-700"
          style={{
            background: exams[activeIndex]?.gradient || "radial-gradient(circle, rgba(30,211,106,0.2), transparent 70%)",
          }}
        />
      </div>

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out cursor-grab active:cursor-grabbing"
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${translateX}px))`,
          }}
        >
          {exams.map((exam, index) => (
            <div
              key={exam.id}
              className="w-full flex-shrink-0 px-4 sm:px-8"
              onClick={() => index !== activeIndex && setActiveIndex(index)}
            >
              <div
                className={`
                  relative mx-auto max-w-4xl transform transition-all duration-500
                  ${index === activeIndex ? "scale-100 opacity-100" : "scale-95 opacity-50"}
                `}
              >
                {/* Card */}
                <div className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-[#161f1a]/90 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
                  {/* Top Gradient Bar */}
                  <div
                    className="h-1.5 w-full"
                    style={{ background: exam.gradient }}
                  />

                  <div className="p-6 sm:p-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                      <div className="flex items-start gap-5">
                        {/* Icon Container */}
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                          style={{ background: `${exam.accentColor}15`, color: exam.accentColor }}
                        >
                          {exam.icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${getDifficultyColor(exam.difficulty)} ${getDifficultyDarkColor(exam.difficulty)}`}
                            >
                              {exam.difficulty}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                exam.available
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                  : "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                              }`}
                            >
                              {exam.statusLabel}
                            </span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-white tracking-tight">
                            {exam.title}
                          </h2>
                          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                            {exam.description}
                          </p>
                        </div>
                      </div>

                      {/* Price Badge */}
                      <div className="flex flex-col items-end">
                        {exam.discount && (
                          <span className="text-sm text-slate-400 line-through">
                            ₹{exam.originalPrice}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-semibold" style={{ color: exam.accentColor }}>
                            ₹{exam.price}
                          </span>
                          {exam.discount && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Save {exam.discount}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="rounded-2xl bg-slate-50/80 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Questions</span>
                        </div>
                        <p className="text-xl font-semibold text-slate-700 dark:text-white">{exam.questions}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50/80 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Duration</span>
                        </div>
                        <p className="text-xl font-semibold text-slate-700 dark:text-white">{exam.duration}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50/80 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Certificate</span>
                        </div>
                        <p className="text-xl font-semibold text-slate-700 dark:text-white">Yes</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {exam.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-slate-100/80 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartExam(exam)}
                        disabled={!exam.available}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: exam.gradient }}
                      >
                        {exam.available ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start Exam
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Coming Soon
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          type="button"
          onClick={handlePrev}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-[#1a231e] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          aria-label="Previous exam"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {exams.map((exam, index) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === activeIndex ? "w-8" : "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"}
              `}
              style={{
                backgroundColor: index === activeIndex ? exam.accentColor : undefined,
              }}
              aria-label={`Go to exam ${index + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-[#1a231e] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          aria-label="Next exam"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mt-4">
        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
          {activeIndex + 1} <span className="text-slate-300 dark:text-slate-600">/</span> {exams.length}
        </span>
      </div>
    </div>
  );
};

export default ExamCarousel;
