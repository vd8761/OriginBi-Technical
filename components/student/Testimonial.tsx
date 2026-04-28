'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QuoteIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons';

const testimonials = [
  {
    quote:
      'An invaluable tool for any student feeling lost about their career. The insights are practical and immediately actionable.',
    name: 'Amit',
    title: 'B.Com, Delhi',
    image: '/Slider.png',
  },
  {
    quote:
      "Origin BI's test gave me clarity on my strengths, and the roadmap guided me step-by-step toward UI/UX design.",
    name: 'Sneha',
    title: 'B.Sc. Computer Science, Chennai',
    image: '/Slider.png',
  },
  {
    quote:
      'The personalized feedback was a game-changer. I finally understood where to focus my learning efforts for a career in data science.',
    name: 'Rajesh',
    title: 'B.Tech IT, Bangalore',
    image: '/Slider.png',
  },
  {
    quote:
      'I never thought I could pivot into product management, but OriginBI provided the exact guidance I needed to start my journey.',
    name: 'Priya',
    title: 'MBA, Mumbai',
    image: '/Slider.png',
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

  const current = testimonials[currentIndex];

  useEffect(() => {
    const timer = setTimeout(nextTestimonial, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, nextTestimonial]);

  return (
    <div className="relative w-full h-full bg-brand-dark-secondary rounded-3xl overflow-hidden p-6 md:p-8 lg:p-[5%] flex flex-col justify-end">
      {/* Origin Fav Icon Overlay */}
      <img
        src="/Origin_Fav_Icon.svg"
        alt="Origin BI Icon"
        className="absolute top-8 left-8 w-[clamp(32px,3vw,56px)] h-[clamp(32px,3vw,56px)] z-30 select-none"
      />
      <div className="absolute inset-0 z-0">
        <img
          src="/Slider.png"
          alt="Testimonial background"
          className="absolute inset-0 w-full h-full object-cover object-top select-none pointer-events-none"
        />
      </div>

      <div key={currentIndex} className="relative z-20 flex flex-col justify-end h-full">
        {/* Fill Animation Style */}
        <style jsx global>{`
          @keyframes fillProgress {
            from { width: 0%; }
            to { width: 100%; }
          }
          .animate-fill {
            animation: fillProgress 5000ms linear forwards;
          }
        `}</style>

        <div className="mt-auto space-y-3 md:space-y-4">
          <div className="animate-fade-in space-y-3 md:space-y-4">
            <QuoteIcon className="w-[clamp(16px,1.5vw,24px)] h-[clamp(16px,1.5vw,24px)] text-brand-green" />

            <p className="font-sans text-[clamp(16px,1.5vw,28px)] font-normal leading-[1.2] tracking-[0%] text-white">
              {current.quote}
            </p>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="animate-fade-in">
              <h4 className="font-sans text-[clamp(14px,1.2vw,20px)] font-semibold text-white leading-tight">
                {current.name}
              </h4>
              <p className="font-sans text-[clamp(12px,1vw,16px)] font-normal text-gray-400 leading-tight">
                {current.title}
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              <button
                onClick={prevTestimonial}
                disabled={currentIndex === 0}
                aria-label="Previous testimonial"
                className={`rounded-full p-[clamp(8px,0.6vw,12px)] transition-all transform hover:scale-105 ${currentIndex === 0
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-brand-green text-white hover:bg-brand-green/90 shadow-lg shadow-brand-green/30'
                  }`}
              >
                <ArrowLeftIcon className="w-[clamp(14px,1vw,20px)] h-[clamp(14px,1vw,20px)]" />
              </button>
              <button
                onClick={nextTestimonial}
                disabled={currentIndex === testimonials.length - 1}
                aria-label="Next testimonial"
                className={`rounded-full p-[clamp(8px,0.6vw,12px)] transition-all transform hover:scale-105 ${currentIndex === testimonials.length - 1
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-brand-green text-white hover:bg-brand-green/90 shadow-lg shadow-brand-green/30'
                  }`}
              >
                <ArrowRightIcon className="w-[clamp(14px,1vw,20px)] h-[clamp(14px,1vw,20px)]" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center w-full gap-2 mt-6">
          {testimonials.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              className="h-1 flex-1 bg-white rounded-full overflow-hidden cursor-pointer hover:bg-white/90 transition-colors"
            >
              <div
                className={`h-full bg-brand-green rounded-full transition-all duration-300 ${index < currentIndex
                  ? 'w-full'
                  : index === currentIndex
                    ? 'animate-fill'
                    : 'w-0'
                  }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonial;
