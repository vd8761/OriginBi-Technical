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
            tags: ["Quantitative", "Logical", "Verbal"],
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
            tags: ["Logic", "Strings", "DSA"],
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
            tags: ["Advanced DSA", "Trees", "DP"],
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
            tags: ["Domain MCQs", "Scenarios"],
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
                                <h1 className="text-[clamp(24px,2.5vw,32px)] font-bold text-brand-text-light-primary dark:text-brand-text-primary mb-2 transition-colors tracking-tight">
                                    Hello, Candidate
                                </h1>
                                <p className="text-brand-text-light-secondary dark:text-brand-text-secondary text-[clamp(12px,0.9vw,14px)] max-w-2xl font-medium transition-colors leading-relaxed">
                                    Choose any assessment you want. You can unlock individual modules to test your skills for specific job roles.
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
                        {/* Back Button */}
                        <button 
                            onClick={() => setCurrentView("assessment")}
                            className="flex items-center gap-2 text-brand-text-light-secondary dark:text-brand-text-secondary hover:text-brand-green transition-colors mb-6 cursor-pointer group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-bold text-sm uppercase tracking-wider">Back to Assessments</span>
                        </button>

                        <div className="flex flex-col gap-8">
                            {/* Hero Section */}
                            <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-[2.5rem] p-8 lg:p-12 flex flex-col lg:flex-row gap-10 items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                                            {selectedAssessment.icon}
                                        </div>
                                        <span className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            Professional Assessment
                                        </span>
                                    </div>
                                    <h1 className="text-4xl lg:text-5xl font-black text-brand-text-light-primary dark:text-white mb-6 tracking-tight">
                                        {selectedAssessment.title}
                                    </h1>
                                    <p className="text-lg text-brand-text-light-secondary dark:text-brand-text-secondary max-w-3xl leading-relaxed mb-8">
                                        {selectedAssessment.description}
                                    </p>

                                    <div className="flex flex-wrap gap-8 items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Duration</p>
                                                <p className="text-sm font-bold text-brand-text-light-primary dark:text-white mt-1">{selectedAssessment.duration}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Questions</p>
                                                <p className="text-sm font-bold text-brand-text-light-primary dark:text-white mt-1">{selectedAssessment.totalQuestions} Questions</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Level</p>
                                                <p className="text-sm font-bold text-brand-text-light-primary dark:text-white mt-1">Intermediate</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full lg:w-[350px] bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-black/5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Access for</p>
                                    <p className="text-3xl font-black text-brand-green mb-6">{selectedAssessment.price}</p>
                                    
                                    <button className="w-full py-4 bg-brand-green text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 hover:scale-[1.02] active:scale-95 transition-all mb-4 cursor-pointer">
                                        Unlock Full Access
                                    </button>
                                    
                                    <p className="text-[11px] text-center text-gray-400 dark:text-brand-text-secondary">
                                        Includes lifetime report access & certificate
                                    </p>
                                </div>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 flex flex-col gap-8">
                                    {/* What you'll learn */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl p-8">
                                        <h2 className="text-2xl font-bold text-brand-text-light-primary dark:text-white mb-8">What you&apos;ll learn</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {selectedAssessment.title === "Aptitude Assessment" ? (
                                                <>
                                                    {[
                                                        { title: "Quantitative Aptitude", desc: "Master numerical problem-solving, ratios, percentages, and advanced arithmetic." },
                                                        { title: "Logical Reasoning", desc: "Sharpen logical thinking through patterns, puzzles, and structured reasoning." },
                                                        { title: "Data Interpretation", desc: "Analyze and extract insights from charts, graphs, and complex data tables." },
                                                        { title: "Abstract Reasoning", desc: "Develop pattern recognition and non-verbal reasoning skills for complex scenarios." }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex gap-4">
                                                            <svg className="w-6 h-6 text-brand-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <div>
                                                                <p className="font-bold text-brand-text-light-primary dark:text-white mb-1">{item.title}</p>
                                                                <p className="text-sm text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed">{item.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-brand-text-light-secondary dark:text-brand-text-secondary italic">Specific syllabus details coming soon...</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Syllabus / Sections */}
                                    {selectedAssessment.title === "Aptitude Assessment" && (
                                        <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl p-8">
                                            <h2 className="text-2xl font-bold text-brand-text-light-primary dark:text-white mb-8">Assessment Sections</h2>
                                            <div className="space-y-4">
                                                {[
                                                    { name: "Quantitative Aptitude", topics: "Percentages, Ratios, Profit & Loss, Time & Distance, SI/CI, Mixtures" },
                                                    { name: "Logical Reasoning", topics: "Series, Seating, Blood Relations, Syllogisms, Coding-Decoding" },
                                                    { name: "Data Interpretation", topics: "Bar Charts, Pie Charts, Line Graphs, Table Analysis" },
                                                    { name: "Abstract Reasoning", topics: "Pattern Recognition, Matrix Figures, Visual Series" }
                                                ].map((section, i) => (
                                                    <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-bold text-brand-text-light-primary dark:text-white">{section.name}</span>
                                                            <span className="text-[10px] font-bold text-brand-green uppercase">Topic Group {i+1}</span>
                                                        </div>
                                                        <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary leading-relaxed">
                                                            {section.topics}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-8">
                                    {/* Details to know */}
                                    <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl p-8">
                                        <h2 className="text-xl font-bold text-brand-text-light-primary dark:text-white mb-6">Details to know</h2>
                                        <div className="space-y-6">
                                            <div className="flex gap-4">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-bold text-brand-text-light-primary dark:text-white">Shareable certificate</p>
                                                    <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">Add to your LinkedIn profile</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.516a3 3 0 11-3.015-3.015 2.13 2.13 0 001.286-.404 2.13 2.13 0 012.188-.404 3 3 0 104.252 4.252" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-bold text-brand-text-light-primary dark:text-white">Taught in English</p>
                                                    <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">Global standard assessment</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-bold text-brand-text-light-primary dark:text-white">Recent updated</p>
                                                    <p className="text-xs text-brand-text-light-secondary dark:text-brand-text-secondary mt-1">January 2026</p>
                                                </div>
                                            </div>
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


