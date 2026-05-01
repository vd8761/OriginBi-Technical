import React from 'react';
import { ArrowRightIcon } from '../icons';

interface ExploreViewProps {
    assessments: any[];
    onNavigateToDetails: (assessment: any) => void;
    onStartAssessment: (assessment: any) => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ assessments, onNavigateToDetails, onStartAssessment }) => {
    return (
        <div className="animate-fade-in flex flex-col gap-12 w-full pb-20">
            {/* Header Section */}
            <div className="flex flex-col gap-2 pb-4">
                <h1 className="text-[clamp(28px,3vw,42px)] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                    Unlock Your Potential
                </h1>
                <p className="text-slate-500 dark:text-gray-400 text-[15px] max-w-xl font-normal leading-relaxed mt-2">
                    Explore our comprehensive suite of professional assessments designed to benchmark your skills against industry standards.
                </p>
            </div>

            {/* Assessment Cards List - All Large Style */}
            <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
                {assessments.map((assessment, idx) => (
                    <section key={idx} className="relative">
                        <div className="relative overflow-hidden bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl transition-all duration-500 shadow-sm">
                            <div className="relative z-10 p-6 lg:p-10 flex flex-col lg:flex-row items-center gap-10">
                                {/* Left Side Visual */}
                                <div className="flex-1 flex justify-center items-center relative order-1">
                                    {/* Decorative Pattern Behind */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                                        <svg width="200" height="200" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="120" cy="120" r="100" stroke="currentColor" strokeWidth="1" strokeDasharray="8 8" className="text-brand-green" />
                                            <circle cx="120" cy="120" r="70" stroke="currentColor" strokeWidth="0.5" className="text-brand-green" />
                                        </svg>
                                    </div>

                                    {assessment.title === "Aptitude Assessment" ? (
                                        <img
                                            src="/illustration/img1.png"
                                            alt={assessment.title}
                                            className="relative z-10 w-full max-w-[380px] h-auto object-contain transition-all duration-700"
                                        />
                                    ) : assessment.title === "Communication Assessment" ? (
                                        <img
                                            src="/illustration/img2.png"
                                            alt={assessment.title}
                                            className="relative z-10 w-full max-w-[380px] h-auto object-contain transition-all duration-700"
                                        />
                                    ) : (
                                        <div className="relative z-10 w-48 h-48 bg-brand-green/5 rounded-3xl flex items-center justify-center border border-brand-green/10 backdrop-blur-sm overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 to-transparent"></div>
                                            {React.cloneElement(assessment.icon, { className: "w-24 h-24 text-brand-green/40" })}
                                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-green/5 rounded-full blur-2xl"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side Content */}
                                <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start order-2">

                                    
                                    <h2 className="text-[clamp(24px,2.5vw,32px)] font-black text-slate-900 dark:text-white mb-3 tracking-tighter leading-tight">
                                        {assessment.title}
                                    </h2>

                                    <p className="text-[14px] text-slate-600 dark:text-gray-300 max-w-md mb-6 leading-relaxed font-normal">
                                        {assessment.description} Benchmark your skills against industry standards and receive detailed insights into your performance.
                                    </p>



                                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                        <button
                                            onClick={() => onNavigateToDetails(assessment)}
                                            className="w-full sm:w-auto px-10 py-3.5 bg-brand-green hover:bg-[#1bb85c] text-white rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-lg shadow-brand-green/20"
                                        >
                                            Know More
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            {/* Why take these assessments? */}
            <section className="mt-8 p-8 max-w-6xl mx-auto w-full bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div className="flex flex-col gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Industry Standard</h3>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">Our questions are modeled after top MNC recruitment standards to ensure your preparation is accurate.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Skill Gap Analysis</h3>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">Receive detailed insights into your strengths and weaknesses to focus your learning effectively.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Verified Reports</h3>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">Download verified performance reports to showcase your technical readiness to potential employers.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ExploreView;
