import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import AssessmentCard from './AssessmentCard';
import AptitudePreTest from '../assessment/aptitude/AptitudePreTest';
import CommunicationPreTest from '../assessment/communication/CommunicationPreTest';
import RolePreTest from '../assessment/role/RolePreTest';
import AptitudeDashboard from './AptitudeDashboard';
import ExploreView from './ExploreView';
import ProfileView from './ProfileView';
import { ProfileIcon, AptitudeIcon, CommunicationIcon, CodingIcon, MNCIcon, RoleIcon } from '../icons';

const AssessmentPortal: React.FC = () => {
    const [showAptitudeModal, setShowAptitudeModal] = useState(false);
    const [showCommunicationModal, setShowCommunicationModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [currentView, setCurrentView] = useState<"dashboard" | "assessment" | "profile" | "details" | "counsellor" | "roadmaps">("counsellor");
    const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
    const router = useRouter();

    const assessments = [
        {
            title: "Aptitude Assessment",
            description: "Evaluate logical thinking, numerical problem-solving, data interpretation, and abstract reasoning skills.",
            progress: 100,
            totalQuestions: 60,
            completedQuestions: 60,
            status: "completed" as const,
            icon: <AptitudeIcon />,
            price: "₹99.00",
            tags: ["Quantitative", "Logical", "DI", "Abstract"],
            duration: "60 Mins",
            isPurchased: true
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
            duration: "45 Mins",
            isPurchased: true
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
            duration: "90 Mins",
            isPurchased: false
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
            duration: "60 Mins",
            isPurchased: false
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
            duration: "45 Mins",
            isPurchased: false
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

            <div className="relative z-10 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
                {currentView === "assessment" ? (
                    <>
                        {/* Hero Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div className="flex-1 w-full">
                                <h1 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-slate-800 dark:text-white mb-2 transition-colors tracking-tight">
                                    Your Assessments
                                </h1>
                                <p className="text-slate-600 dark:text-gray-300 text-[clamp(12px,0.9vw,14px)] max-w-2xl font-normal transition-colors leading-relaxed">
                                    Manage and track your purchased assessments. Start your journey toward MNC readiness by completing your assigned modules.
                                </p>
                            </div>
                        </div>

                        {/* Grid - Only Purchased */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {assessments.filter(a => a.isPurchased).map((item, idx) => (
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
                            <span className="text-brand-green font-medium">{selectedAssessment.title}</span>
                        </div>

                        <div className="flex flex-col gap-6 lg:gap-8">
                            {/* Hero Section */}
                            <div className="relative overflow-hidden bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl">

                                <div className="relative z-10 p-7 lg:p-10 flex flex-col lg:flex-row gap-8 items-stretch">
                                    <div className="flex-1 flex flex-col justify-center">


                                        <h1 className="text-[clamp(26px,3vw,40px)] font-bold text-slate-900 dark:text-white mb-2 tracking-tight leading-[1.1]">
                                            {selectedAssessment.title}
                                        </h1>

                                        <p className="text-[clamp(13px,0.95vw,15px)] text-slate-600 dark:text-gray-300 max-w-2xl leading-relaxed mb-6 font-normal">
                                            {selectedAssessment.description}
                                        </p>

                                        <div className="flex flex-wrap gap-8 items-center">
                                            <div className="flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center transition-colors">
                                                    <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1.5">Duration</p>
                                                    <p className="text-[15px] font-semibold text-slate-800 dark:text-white leading-none">{selectedAssessment.duration}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center transition-colors">
                                                    <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1.5">Questions</p>
                                                    <p className="text-[15px] font-semibold text-slate-800 dark:text-white leading-none">{selectedAssessment.totalQuestions} Questions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center transition-colors">
                                                    <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1.5">Level</p>
                                                    <p className="text-[15px] font-semibold text-slate-800 dark:text-white leading-none">Intermediate</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-[320px] flex flex-col justify-center">
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[1.5rem] p-6 relative overflow-hidden">
                                            <p className="text-[11px] font-medium text-slate-800 dark:text-white mb-1.5 relative z-10">Access Lifetime Report</p>
                                            <div className="flex items-baseline gap-2 mb-6 relative z-10">
                                                <span className="text-3xl font-black text-brand-green leading-none">{selectedAssessment.price}</span>
                                                <span className="text-xs text-slate-500 dark:text-white font-medium">One-time</span>
                                            </div>

                                            <button className="w-full py-3.5 bg-brand-green hover:bg-[#1bb85c] text-white rounded-xl font-medium text-sm transition-all active:scale-95 mb-5 relative z-10 cursor-pointer">
                                                Unlock Full Access
                                            </button>

                                            <div className="space-y-2.5 relative z-10">
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-800 dark:text-white">
                                                    <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Lifetime Dashboard Access
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-black dark:text-white uppercase tracking-wider">
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
                                    {/* Trial Assessment Card */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-brand-green/10 text-brand-green border border-brand-green/20 mb-3">
                                                Limited Access
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Experience a Trial Assessment</h2>
                                            <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                Get a preview of the question types and difficulty level. Try our 10-minute mini-assessment to calibrate your readiness before unlocking the full comprehensive report.
                                            </p>
                                        </div>
                                        <button className="w-full md:w-auto px-8 py-3 bg-brand-green hover:bg-[#1bb85c] text-white rounded-xl font-bold text-[12px] shadow-lg shadow-brand-green/10 transition-all active:scale-95 cursor-pointer whitespace-nowrap">
                                            Start Trial Test
                                        </button>
                                    </div>

                                    {/* Skills Assessed */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8">
                                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6">Skills Assessed</h2>
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
                                                                <p className="font-semibold text-[13px] text-slate-800 dark:text-white mb-1">{item.title}</p>
                                                                <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">{item.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-slate-500 dark:text-gray-400 italic text-[12px] font-normal">Specific assessment dimensions coming soon...</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Assessment Instructions */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8">
                                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6">Instructions & Guidelines</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                        <strong className="text-slate-800 dark:text-white font-semibold">Multiple Choice:</strong> All questions are in MCQ format with only one correct answer.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                        <strong className="text-slate-800 dark:text-white font-semibold">Marking Scheme:</strong> 0.25 mark will be reduced for every wrong answer.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                        <strong className="text-slate-800 dark:text-white font-semibold">Duration:</strong> The test must be completed within the allotted time. The timer cannot be paused.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                        <strong className="text-slate-800 dark:text-white font-semibold">Device:</strong> We recommend using a desktop or laptop for the best experience. Mobile is not recommended.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                        <strong className="text-slate-800 dark:text-white font-semibold">Anti-Cheating:</strong> Switching tabs or browser windows during the test may lead to disqualification.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                                        <strong className="text-slate-800 dark:text-white font-semibold">Connectivity:</strong> Ensure a stable internet connection. Use Chrome or Edge browsers.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-8">
                                    {/* Assessment Overview Video */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8">
                                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Assessment Overview</h2>
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
                                        <p className="text-[12px] text-slate-500 dark:text-gray-400 mt-3 font-normal">Methodology, sections, and scoring system overview.</p>
                                    </div>

                                    {/* Certificate Card */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 lg:p-8 flex flex-col items-center text-center">
                                        <div className="w-14 h-14 bg-brand-green/10 rounded-full flex items-center justify-center mb-4 text-brand-green border border-brand-green/20">
                                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Verified Certification</h3>
                                        <p className="text-[12px] text-slate-600 dark:text-gray-300 leading-relaxed font-normal">
                                            Assessment completion certificate will be provided by <span className="font-bold text-brand-green">OriginBI</span> upon successful completion of this evaluation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : currentView === "counsellor" ? (
                    <ExploreView 
                        assessments={assessments}
                        onNavigateToDetails={(assessment) => {
                            setSelectedAssessment(assessment);
                            setCurrentView("details");
                        }}
                        onStartAssessment={(assessment) => {
                            if (assessment.title === "Aptitude Assessment") {
                                setShowAptitudeModal(true);
                            } else if (assessment.title === "Communication Assessment") {
                                setShowCommunicationModal(true);
                            } else if (assessment.title === "Role Based Questions") {
                                setShowRoleModal(true);
                            } else {
                                console.log(`Starting ${assessment.title}`);
                            }
                        }}
                    />
                ) : currentView === "dashboard" ? (
                    <AptitudeDashboard onBack={() => setCurrentView("assessment")} />
                ) : currentView === "profile" ? (
                    <ProfileView onNavigate={(view) => setCurrentView(view)} />
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-brand-light-secondary dark:bg-brand-dark-secondary rounded-3xl border border-brand-light-tertiary dark:border-brand-dark-tertiary shadow-xl">
                        <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
                            <ProfileIcon className="w-10 h-10 text-brand-green" />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-text-light-primary dark:text-white mb-2">
                            Your Road Map
                        </h2>
                        <p className="text-brand-text-light-secondary dark:text-brand-text-secondary max-w-md">
                            Personalized learning roadmaps based on your performance will be generated here.
                        </p>
                        <button
                            onClick={() => setCurrentView("assessment")}
                            className="mt-8 px-6 py-2 bg-brand-green text-slate-900 font-bold rounded-xl hover:bg-green-400 transition-all active:scale-95"
                        >
                            Back to Assessments
                        </button>
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
