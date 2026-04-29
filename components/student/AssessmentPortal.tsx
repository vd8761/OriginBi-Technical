import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import AssessmentCard from './AssessmentCard';
import AptitudePreTest from '../assessment/aptitude/AptitudePreTest';
import CommunicationPreTest from '../assessment/communication/CommunicationPreTest';
import RolePreTest from '../assessment/role/RolePreTest';
import { ProfileIcon, AptitudeIcon, CommunicationIcon, CodingIcon, MNCIcon, RoleIcon } from '../icons';

const AssessmentPortal: React.FC = () => {
    const [showAptitudeModal, setShowAptitudeModal] = useState(false);
    const [showCommunicationModal, setShowCommunicationModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [currentView, setCurrentView] = useState<"dashboard" | "assessment" | "profile" | "details">("dashboard");
    const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
    const router = useRouter();

    const assessments = [
        {
            title: "Aptitude Assessment",
            description: "Evaluate logical thinking, numerical problem-solving, data interpretation, and abstract reasoning skills.",
            progress: 0,
            totalQuestions: 60,
            completedQuestions: 0,
            status: "not-started" as const,
            icon: <AptitudeIcon />,
            price: "₹99.00",
            tags: ["Quantitative", "Logical", "DI", "Abstract"],
            duration: "60 Mins"
        },
        {
            title: "Communication Assessment",
            description: "Measure proficiency across Listening, Speaking, Reading, and Writing to simulate real-world workplace scenarios.",
            progress: 0,
            totalQuestions: 40,
            completedQuestions: 0,
            status: "not-started" as const,
            icon: <CommunicationIcon />,
            price: "₹149.00",
            tags: ["Listening", "Speaking", "Reading", "Writing"],
            duration: "45 Mins"
        },
        {
            title: "Coding Assessment",
            description: "Showcase fundamental programming ability through number logic, string manipulation, and real-world simulations.",
            progress: 0,
            totalQuestions: 30,
            completedQuestions: 0,
            status: "not-started" as const,
            icon: <CodingIcon />,
            price: "₹199.00",
            tags: ["Number Logic", "Strings", "Simulation", "Arrays"],
            duration: "90 Mins"
        },
        {
            title: "MNC Based Questions",
            description: "Advanced DSA assessment covering core topics like Arrays, Trees, and DP frequently asked in top-tier tech companies.",
            progress: 0,
            totalQuestions: 25,
            completedQuestions: 0,
            status: "not-started" as const,
            icon: <MNCIcon />,
            price: "₹249.00",
            tags: ["Arrays", "Trees", "DP", "Graphs"],
            duration: "60 Mins"
        },
        {
            title: "Role Based Questions",
            description: "Domain-specific evaluation featuring conceptual MCQ and scenario-based problem solving for your target role.",
            progress: 0,
            totalQuestions: 20,
            completedQuestions: 0,
            status: "not-started" as const,
            icon: <RoleIcon />,
            price: "₹299.00",
            tags: ["Conceptual", "Scenario-Based"],
            duration: "45 Mins"
        }
    ];


    return (
        <div className="min-h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary transition-colors duration-500 font-sans">
            {/* Background Layer */}
            <div className="fixed inset-0 portal-bg opacity-100 dark:opacity-40 pointer-events-none z-0"></div>

            <Header 
                currentView={currentView}
                onNavigate={(view) => setCurrentView(view)}
                onLogout={() => console.log("Logging out...")}
            />

            <div className="relative z-10 max-w-[1440px] mx-auto flex flex-col gap-6 md:gap-8 px-4 sm:px-6 lg:px-12 pt-24 pb-10">
                
                {currentView === "dashboard" || currentView === "assessment" ? (
                    <>
                        {/* Welcome Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                            <div className="flex-1 w-full">
                                <h1 className="text-[clamp(24px,2.5vw,32px)] font-bold text-black dark:text-white mb-2 transition-colors tracking-tight">
                                    Hello, Candidate
                                </h1>
                                <p className="text-black dark:text-white text-[clamp(12px,0.9vw,14px)] max-w-2xl font-medium transition-colors leading-relaxed">
                                    Benchmark your performance across various domains. Take individual assessments to uncover your core strengths, identify growth areas, and unlock personalized insights.
                                </p>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {assessments.map((item, idx) => (
                                <AssessmentCard 
                                    key={idx}
                                    {...item}
                                    onDetailsClick={() => {
                                        setSelectedAssessment(item);
                                        setCurrentView("details");
                                    }}
                                    onClick={() => {
                                        if (item.title === "Aptitude Assessment") {
                                            setShowAptitudeModal(true);
                                        } else if (item.title === "Communication Assessment") {
                                            setShowCommunicationModal(true);
                                        } else if (item.title === "Role Based Questions") {
                                            setShowRoleModal(true);
                                        } else {
                                            console.log(`Starting ${item.title}`);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </>
                ) : currentView === "details" && selectedAssessment ? (
                    <div className="animate-fade-in">
                        {/* Breadcrumbs */}
                        <div className="flex items-center text-[12px] text-black dark:text-white mb-6 font-normal flex-wrap">
                            <button
                                onClick={() => setCurrentView("dashboard")}
                                className="hover:text-gray-700 dark:hover:text-[#1ED36A] transition-colors cursor-pointer"
                            >
                                Dashboard
                            </button>
                            <span className="mx-2 text-black dark:text-white">
                                <svg width="6" height="11" viewBox="0 0 8 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-black dark:text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M0.858619 13.974C0.662243 14.1708 0.343861 14.1708 0.147484 13.974C-0.0488759 13.7771 -0.0488759 13.458 0.147484 13.2612L6.33311 7.06091L0.147281 0.860465C-0.049095 0.663641 -0.0490951 0.344505 0.147281 0.147665C0.343658 -0.0491765 0.662041 -0.0491766 0.8584 0.147665L7.3525 6.65711C7.46243 6.7673 7.51082 6.91578 7.49769 7.0597C7.51152 7.20431 7.4632 7.35375 7.35272 7.4645L0.858619 13.974Z" />
                                </svg>
                            </span>
                            <button
                                onClick={() => setCurrentView("assessment")}
                                className="text-black dark:text-white hover:text-brand-green dark:hover:text-brand-green transition-colors cursor-pointer"
                            >
                                Your Assessments
                            </button>
                            <span className="mx-2 text-black dark:text-white">
                                <svg width="6" height="11" viewBox="0 0 8 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-black dark:text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M0.858619 13.974C0.662243 14.1708 0.343861 14.1708 0.147484 13.974C-0.0488759 13.7771 -0.0488759 13.458 0.147484 13.2612L6.33311 7.06091L0.147281 0.860465C-0.049095 0.663641 -0.0490951 0.344505 0.147281 0.147665C0.343658 -0.0491765 0.662041 -0.0491766 0.8584 0.147665L7.3525 6.65711C7.46243 6.7673 7.51082 6.91578 7.49769 7.0597C7.51152 7.20431 7.4632 7.35375 7.35272 7.4645L0.858619 13.974Z" />
                                </svg>
                            </span>
                            <span className="text-brand-green font-semibold">{selectedAssessment.title}</span>
                        </div>

                        <div className="flex flex-col gap-6 lg:gap-8">
                            {/* Hero Section */}
                            <div className="relative overflow-hidden bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-[2rem]">
                                {/* Subtle decorative circle to match theme */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 blur-3xl rounded-full -mr-32 -mt-32"></div>

                                <div className="relative z-10 p-8 lg:p-12 flex flex-col lg:flex-row gap-10 items-stretch">
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-14 h-14 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green border border-brand-green/20">
                                                {selectedAssessment.icon}
                                            </div>
                                            <div className="px-4 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#19211C] dark:text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                Professional Assessment
                                            </div>
                                        </div>
                                        
                                        <h1 className="text-[clamp(28px,3.5vw,48px)] font-black text-[#19211C] dark:text-white mb-6 tracking-tight leading-[1.1]">
                                            {selectedAssessment.title}
                                        </h1>
                                        
                                        <p className="text-[clamp(14px,1vw,16px)] text-[#19211C] dark:text-white max-w-2xl leading-relaxed mb-10 font-medium">
                                            {selectedAssessment.description}
                                        </p>

                                        <div className="flex flex-wrap gap-10 items-center">
                                            <div className="flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center transition-colors">
                                                    <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-[#19211C] dark:text-white uppercase tracking-widest leading-none mb-1.5">Duration</p>
                                                    <p className="text-[15px] font-bold text-[#19211C] dark:text-white leading-none">{selectedAssessment.duration}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center transition-colors">
                                                    <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-[#19211C] dark:text-white uppercase tracking-widest leading-none mb-1.5">Questions</p>
                                                    <p className="text-[15px] font-bold text-[#19211C] dark:text-white leading-none">{selectedAssessment.totalQuestions} Questions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center transition-colors">
                                                    <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-[#19211C] dark:text-white uppercase tracking-widest leading-none mb-1.5">Level</p>
                                                    <p className="text-[15px] font-bold text-[#19211C] dark:text-white leading-none">Intermediate</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-[340px] flex flex-col justify-center">
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[1.5rem] p-8 relative overflow-hidden">
                                            <p className="text-[11px] font-bold text-[#19211C] dark:text-white uppercase tracking-widest mb-2 relative z-10">Access Lifetime Report</p>
                                            <div className="flex items-baseline gap-2 mb-8 relative z-10">
                                                <span className="text-4xl font-black text-brand-green leading-none">{selectedAssessment.price}</span>
                                                <span className="text-xs text-[#19211C] dark:text-white font-bold uppercase tracking-wider">One-time</span>
                                            </div>
                                            
                                            <button className="w-full py-4 bg-brand-green hover:bg-brand-green/90 text-[#19211C] rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 mb-6 relative z-10 cursor-pointer">
                                                Unlock Full Access
                                            </button>
                                            
                                            <div className="space-y-3 relative z-10">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#19211C] dark:text-white uppercase tracking-wider">
                                                    <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Lifetime Dashboard Access
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#19211C] dark:text-white uppercase tracking-wider">
                                                    <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Verified Certificate
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 flex flex-col gap-8">
                                    {/* Skills Assessed */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8">
                                        <h2 className="text-xl font-bold text-brand-text-light-primary dark:text-white mb-6">Skills Assessed</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {selectedAssessment.title === "Aptitude Assessment" ? (
                                                <>
                                                    {[
                                                        { title: "Quantitative Aptitude", desc: "Evaluate your numerical problem-solving speed, understanding of ratios, and advanced arithmetic capability." },
                                                        { title: "Logical Reasoning", desc: "Benchmark your logical thinking through complex patterns, seating puzzles, and structured reasoning." },
                                                        { title: "Data Interpretation", desc: "Test your ability to accurately analyze and extract actionable insights from complex data sets." },
                                                        { title: "Abstract Reasoning", desc: "Measure your pattern recognition and non-verbal spatial reasoning skills under time pressure." }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex gap-3">
                                                            <svg className="w-5 h-5 text-brand-green shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <div>
                                                                <p className="font-bold text-[13px] text-brand-text-light-primary dark:text-white mb-1">{item.title}</p>
                                                                <p className="text-[12px] text-[#19211C] dark:text-white leading-relaxed font-medium">{item.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-[#19211C] dark:text-white italic text-[12px] font-medium">Specific assessment dimensions coming soon...</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Syllabus / Sections */}
                                    {selectedAssessment.title === "Aptitude Assessment" && (
                                        <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7">
                                            <h2 className="text-lg font-bold text-brand-text-light-primary dark:text-white mb-5">Assessment Sections</h2>
                                            <div className="space-y-4">
                                                {[
                                                    { name: "Quantitative Aptitude", topics: "Percentages, Ratios, Profit & Loss, Time & Distance, SI/CI, Mixtures" },
                                                    { name: "Logical Reasoning", topics: "Series, Seating, Blood Relations, Syllogisms, Coding-Decoding" },
                                                    { name: "Data Interpretation", topics: "Bar Charts, Pie Charts, Line Graphs, Table Analysis" },
                                                    { name: "Abstract Reasoning", topics: "Pattern Recognition, Matrix Figures, Visual Series" }
                                                ].map((section, i) => (
                                                    <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="font-bold text-[13px] text-brand-text-light-primary dark:text-white">{section.name}</span>
                                                            <span className="text-[9px] font-bold text-brand-green uppercase tracking-wider">Group {i+1}</span>
                                                        </div>
                                                        <p className="text-[12px] text-[#19211C] dark:text-white leading-relaxed font-medium">
                                                            {section.topics}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-8">
                                    {/* Assessment Overview Video */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8">
                                        <h2 className="text-lg font-bold text-[#19211C] dark:text-white mb-4">Assessment Overview</h2>
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-white/10">
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                src="https://www.youtube.com/embed/Y0Bc6YW9txo?si=av5GIZQjafOcOqy9" 
                                                title="YouTube video player" 
                                                frameBorder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                                referrerPolicy="strict-origin-when-cross-origin" 
                                                allowFullScreen
                                                className="absolute inset-0"
                                            ></iframe>
                                        </div>
                                        <p className="text-[12px] text-[#19211C] dark:text-white mt-3 font-medium">Methodology, sections, and scoring system overview.</p>
                                    </div>

                                    {/* Insight Outcomes */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8">
                                        <h2 className="text-base font-bold text-brand-text-light-primary dark:text-white mb-4">Insight Outcomes</h2>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <svg className="w-3.5 h-3.5 text-brand-green mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="text-[12px] font-bold text-brand-text-light-primary dark:text-white">Strength Profiling</p>
                                                    <p className="text-[11px] text-[#19211C] dark:text-white mt-0.5 font-medium">Understand your natural cognitive and technical edges.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <svg className="w-3.5 h-3.5 text-brand-green mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                                <div>
                                                    <p className="text-[12px] font-bold text-brand-text-light-primary dark:text-white">Weakness Analysis</p>
                                                    <p className="text-[11px] text-[#19211C] dark:text-white mt-0.5 font-medium">Pinpoint specific gaps that may hinder career growth.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <svg className="w-3.5 h-3.5 text-brand-green mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                <div>
                                                    <p className="text-[12px] font-bold text-brand-text-light-primary dark:text-white">Benchmark Reports</p>
                                                    <p className="text-[11px] text-[#19211C] dark:text-white mt-0.5 font-medium">Compare your scores against industry standards.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <svg className="w-3.5 h-3.5 text-brand-green mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                <div>
                                                    <p className="text-[12px] font-bold text-brand-text-light-primary dark:text-white">Roadmap Guidance</p>
                                                    <p className="text-[11px] text-[#19211C] dark:text-white mt-0.5 font-medium">Receive actionable learning paths based on performance.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Certification Section */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8 relative overflow-hidden group">
                                        <h2 className="text-base font-bold text-[#19211C] dark:text-white mb-4 relative z-10">Verified Certification</h2>
                                        <div className="flex gap-4 items-center mb-4 relative z-10">
                                            <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green shrink-0">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.498 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.498 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-[#19211C] dark:text-white leading-tight">Assessment Completion Certificate</p>
                                                <p className="text-[10px] text-brand-green font-bold uppercase tracking-wider mt-1">By OriginBI Official</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-[#19211C] dark:text-white leading-relaxed font-medium mb-4 relative z-10">
                                            Earn your official **OriginBI Certification**—a trusted benchmark for cognitive and technical proficiency. A verified testament to your core strengths and potential, recognized across industry standards.
                                        </p>
                                        <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg text-[10px] text-[#19211C] dark:text-white italic font-medium relative z-10">
                                            "A recognized benchmark of excellence in the industry."
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-brand-light-secondary dark:bg-brand-dark-secondary rounded-3xl border border-brand-light-tertiary dark:border-brand-dark-tertiary shadow-xl">
                        <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
                            <ProfileIcon className="w-10 h-10 text-brand-green" />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-text-light-primary dark:text-white mb-2">Profile and Settings</h2>
                        <p className="text-brand-text-light-secondary dark:text-brand-text-secondary max-w-md">
                            Your profile information and account settings will be available here soon. For now, you can focus on completing your assessments.
                        </p>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-12 mb-6 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] opacity-40 transition-colors">
                    &copy; {new Date().getFullYear()} Origin BI &bull; Powered by Beyond Intelligence
                </footer>
            </div>

            {/* Modals */}
            {showAptitudeModal && (
                <AptitudePreTest 
                    onStart={() => router.push('/assessment/aptitude')} 
                    onClose={() => setShowAptitudeModal(false)}
                />
            )}

            {showCommunicationModal && (
                <CommunicationPreTest 
                    onStart={() => router.push('/assessment/communication')} 
                    onClose={() => setShowCommunicationModal(false)}
                />
            )}

            {showRoleModal && (
                <RolePreTest 
                    onStart={() => router.push('/assessment/role')} 
                    onClose={() => setShowRoleModal(false)}
                />
            )}
        </div>
    );
};

export default AssessmentPortal;


