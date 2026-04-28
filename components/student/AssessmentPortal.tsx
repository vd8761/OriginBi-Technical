import React, { useState } from 'react';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import AssessmentCard from './AssessmentCard';
import AptitudePreTest from '../assessment/aptitude/AptitudePreTest';
import { useRouter } from 'next/navigation';

const AssessmentPortal: React.FC = () => {
    const [showAptitudeModal, setShowAptitudeModal] = useState(false);
    const router = useRouter();

    const assessments = [
        {
            title: "Aptitude Assessment",
            description: "Evaluate logical thinking, numerical problem-solving, data interpretation, and abstract reasoning skills.",
            progress: 0,
            totalQuestions: 60,
            completedQuestions: 0,
            status: "not-started" as const
        },
        {
            title: "Communication Assessment",
            description: "Measure proficiency across Listening, Speaking, Reading, and Writing to simulate real-world workplace scenarios.",
            progress: 0,
            totalQuestions: 40,
            completedQuestions: 0,
            status: "not-started" as const
        },
        {
            title: "Coding Assessment",
            description: "Showcase fundamental programming ability through number logic, string manipulation, and real-world simulations.",
            progress: 0,
            totalQuestions: 30,
            completedQuestions: 0,
            status: "not-started" as const
        },
        {
            title: "MNC Based Questions",
            description: "Advanced DSA assessment covering core topics like Arrays, Trees, and DP frequently asked in top-tier tech companies.",
            progress: 0,
            totalQuestions: 25,
            completedQuestions: 0,
            status: "not-started" as const
        },
        {
            title: "Role Based Questions",
            description: "Domain-specific evaluation featuring conceptual MCQ and scenario-based problem solving for your target role.",
            progress: 0,
            totalQuestions: 20,
            completedQuestions: 0,
            status: "not-started" as const
        }
    ];

    const overallPercentage = 0;

    return (
        <div className="min-h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary transition-colors duration-500 font-sans">
            {/* Background Layer */}
            <div className="fixed inset-0 portal-bg opacity-100 dark:opacity-40 pointer-events-none z-0"></div>

            <div className="relative z-10 max-w-[1440px] mx-auto flex flex-col gap-6 md:gap-8 px-4 sm:px-6 lg:px-12 py-6 md:py-10">
                
                {/* Top Nav */}
                <header className="flex justify-between items-center w-full">
                    <div className="scale-75 md:scale-90 lg:scale-100 origin-left">
                        <Logo />
                    </div>
                    <ThemeToggle />
                </header>

                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                    <div className="flex-1 w-full">
                        <h1 className="text-[clamp(20px,2vw,28px)] font-semibold text-brand-text-light-primary dark:text-brand-text-primary mb-1 transition-colors">
                            Hello, Candidate
                        </h1>
                        <p className="text-brand-text-light-secondary dark:text-brand-text-secondary text-[clamp(10px,0.8vw,12px)] max-w-xl font-medium transition-colors">
                            The intelligent assessment platform designed to unlock potential. Complete the following evaluations to help us understand your core strengths.
                        </p>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-2 md:items-end">
                        <div
                            className="relative overflow-hidden rounded-r-2xl rounded-l-none p-3 min-w-[180px] text-white self-start md:self-center w-full md:w-auto text-right shadow-sm"
                            style={{
                                background: "linear-gradient(90deg, transparent 0%, #1ED36A 100%)",
                            }}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                            <p className="text-[10px] font-bold opacity-90 mb-0.5 text-white uppercase tracking-wider">
                                Overall Progress
                            </p>
                            <p className="text-2xl font-bold text-white">
                                {overallPercentage}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                    {assessments.map((item, idx) => (
                        <AssessmentCard 
                            key={idx}
                            {...item}
                            onClick={() => {
                                if (item.title === "Aptitude Assessment") {
                                    setShowAptitudeModal(true);
                                } else {
                                    console.log(`Starting ${item.title}`);
                                }
                            }}
                        />
                    ))}
                </div>

                {/* Footer */}
                <footer className="mt-12 mb-6 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] opacity-40 transition-colors">
                    &copy; {new Date().getFullYear()} Origin BI &bull; Powered by Beyond Intelligence
                </footer>
            </div>

            {/* Aptitude Modal */}
            {showAptitudeModal && (
                <AptitudePreTest 
                    onStart={() => router.push('/assessment/aptitude')} 
                    onClose={() => setShowAptitudeModal(false)}
                />
            )}
        </div>
    );
};

export default AssessmentPortal;
