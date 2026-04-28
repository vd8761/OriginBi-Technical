"use client";

import React, { useState, useEffect, useCallback } from "react";
import { QuoteIcon, ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";

const testimonials = [
  {
    quote: "An invaluable tool for any student feeling lost about their career. The insights are practical and immediately actionable.",
    name: "Amit",
    title: "B.Com, Delhi",
  },
  {
    quote: "Origin BI's test gave me clarity on my strengths, and the roadmap guided me step-by-step toward UI/UX design.",
    name: "Sneha",
    title: "B.Sc. Computer Science, Chennai",
  },
  {
    quote: "The personalized feedback was a game-changer. I finally understood where to focus my learning efforts for a career in data science.",
    name: "Rajesh",
    title: "B.Tech IT, Bangalore",
  },
];

const Testimonial: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const timer = setTimeout(nextTestimonial, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, nextTestimonial]);

  const current = testimonials[currentIndex];

  return (
    <div className="relative w-full h-full bg-primary-dark rounded-[2.5rem] overflow-hidden p-8 md:p-12 flex flex-col justify-end text-white">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>

      <div className="relative z-10 space-y-8">
        <QuoteIcon className="w-10 h-10 text-primary" />
        
        <p className="text-2xl md:text-3xl font-medium leading-tight transition-all duration-500">
          "{current.quote}"
        </p>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold">{current.name}</h4>
            <p className="text-white/60">{current.title}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={prevTestimonial}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="p-3 rounded-full bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 pt-4">
          {testimonials.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                index === currentIndex ? "w-8 bg-primary" : "w-2 bg-white/20"
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonial;
