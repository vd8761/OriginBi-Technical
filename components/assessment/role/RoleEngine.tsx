import React, { useState, useEffect } from 'react';
import Logo from '../../ui/Logo';
import ThemeToggle from '../../ui/ThemeToggle';
import ConceptualQuestionComponent from './QuestionTypes/ConceptualQuestion';
import ScenarioQuestionComponent from './QuestionTypes/ScenarioQuestion';

// Mock Data Types
export type RoleQuestionType = 'conceptual' | 'scenario';

export interface Option {
    id: string;
    text: string;
}

export interface BaseRoleQuestion {
    id: string;
    type: RoleQuestionType;
    text: string;
    options: Option[];
}

export interface ConceptualQuestion extends BaseRoleQuestion {
    type: 'conceptual';
}

export interface ScenarioQuestion extends BaseRoleQuestion {
    type: 'scenario';
    scenarioContext: string;
    ticketId?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    reportedBy?: string;
}

export type RoleQuestion = ConceptualQuestion | ScenarioQuestion;

const MOCK_ROLE_QUESTIONS: RoleQuestion[] = [
    {
        id: "rq1",
        type: "conceptual",
        text: "Which of the following is NOT a valid HTTP method used in RESTful APIs?",
        options: [
            { id: "o1", text: "PATCH" },
            { id: "o2", text: "FETCH" },
            { id: "o3", text: "OPTIONS" },
            { id: "o4", text: "DELETE" }
        ]
    },
    {
        id: "rq2",
        type: "scenario",
        scenarioContext: "The UI freezes for 3-5 seconds when rendering a table containing 10,000 user records at once.",
        ticketId: "INC-8942",
        priority: "High",
        reportedBy: "QA Team",
        text: "What is the most optimal frontend architecture solution to resolve this performance bottleneck?",
        options: [
            { id: "o1", text: "Increase the memory limit of the user's browser via settings." },
            { id: "o2", text: "Implement virtualization/windowing to only render visible rows." },
            { id: "o3", text: "Move the rendering logic to a Web Worker." },
            { id: "o4", text: "Debounce the API call that fetches the 10,000 records." }
        ]
    },
    {
        id: "rq3",
        type: "conceptual",
        text: "In React, what happens when you call setState() multiple times synchronously in the same event handler?",
        options: [
            { id: "o1", text: "React immediately re-renders after every call." },
            { id: "o2", text: "React throws an infinite loop error." },
            { id: "o3", text: "React batches the updates and performs a single re-render." },
            { id: "o4", text: "Only the first setState() call is executed." }
        ]
    },
    {
        id: "rq4",
        type: "scenario",
        scenarioContext: "A critical e-commerce checkout API is returning a 502 Bad Gateway error intermittently during peak traffic hours.",
        ticketId: "INC-9011",
        priority: "Critical",
        reportedBy: "Automated Alerts",
        text: "As a Backend Engineer investigating the issue, what is the most likely root cause?",
        options: [
            { id: "o1", text: "The database connection string is permanently incorrect." },
            { id: "o2", text: "A reverse proxy (like Nginx) is timing out or failing to communicate with the upstream application servers." },
            { id: "o3", text: "The client-side JavaScript is sending malformed JSON payloads." },
            { id: "o4", text: "A recent CSS deployment broke the checkout button." }
        ]
    }
];

interface RoleEngineProps {
    onComplete: (answers: Record<string, string>) => void;
    roleName?: string;
}

const RoleEngine: React.FC<RoleEngineProps> = ({ onComplete, roleName = "Full Stack Engineer" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

    const currentQuestion = MOCK_ROLE_QUESTIONS[currentIndex];

    // Timer Logic
    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleOptionSelect = (optionId: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
        // Automatically unmark if answered
        if (markedForReview.has(currentQuestion.id)) {
            const newMarked = new Set(markedForReview);
            newMarked.delete(currentQuestion.id);
            setMarkedForReview(newMarked);
        }
    };

    const handleClear = () => {
        const newAnswers = { ...answers };
        delete newAnswers[currentQuestion.id];
        setAnswers(newAnswers);
    };

    const handleMarkReview = () => {
        const newMarked = new Set(markedForReview);
        if (newMarked.has(currentQuestion.id)) {
            newMarked.delete(currentQuestion.id);
        } else {
            newMarked.add(currentQuestion.id);
        }
        setMarkedForReview(newMarked);
    };

    const handleNext = () => {
        if (currentIndex < MOCK_ROLE_QUESTIONS.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (window.confirm("Are you sure you want to submit the assessment?")) {
            onComplete(answers);
        }
    };

    const renderQuestionContent = () => {
        const selectedOption = answers[currentQuestion.id];
        if (currentQuestion.type === 'conceptual') {
            return (
                <ConceptualQuestionComponent 
                    question={currentQuestion as ConceptualQuestion} 
                    selectedOptionId={selectedOption}
                    onSelectOption={handleOptionSelect}
                />
            );
        } else if (currentQuestion.type === 'scenario') {
            return (
                <ScenarioQuestionComponent 
                    question={currentQuestion as ScenarioQuestion} 
                    selectedOptionId={selectedOption}
                    onSelectOption={handleOptionSelect}
                />
            );
        }
        return null;
    };

    return (
        <div className="h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary flex flex-col font-sans transition-colors duration-500 overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-[#1A1D21] flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="scale-75 origin-left">
                        <Logo />
                    </div>
                    <div className="h-4 w-px bg-brand-light-tertiary dark:bg-white/10 hidden md:block"></div>
                    
                    {/* Role Badge */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-brand-green/10 border border-brand-green/20 rounded-md">
                        <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-brand-green uppercase tracking-wider">
                            {roleName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${timeLeft < 300 ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 animate-pulse' : 'bg-black/5 dark:bg-white/5 border-transparent text-brand-text-light-primary dark:text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-bold font-mono text-[13px] tracking-wider">{formatTime(timeLeft)}</span>
                    </div>

                    <ThemeToggle />
                </div>
            </header>

            {/* Main Content - Flex-1 with overflow hidden to allow internal scrolling */}
            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                
                {/* Left Area: Question content */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
                    
                    {/* Header: Question Number */}
                    <div className="flex items-center mb-4">
                        <div className="text-[10px] font-bold text-brand-green uppercase tracking-widest bg-brand-green/10 px-2.5 py-1 rounded-md">
                            Question {currentIndex + 1} of {MOCK_ROLE_QUESTIONS.length}
                        </div>
                    </div>

                    <div className="w-full">
                        {renderQuestionContent()}
                    </div>

                    {/* Mobile Navigator - Only shows on mobile, at the bottom of scroll */}
                    <div className="lg:hidden mt-8 mb-4">
                        <div className="bg-white dark:bg-[#1A1D21] border border-brand-light-tertiary dark:border-white/5 rounded-2xl p-4 shadow-sm">
                            <h3 className="text-xs font-bold text-brand-text-light-primary dark:text-white mb-3 flex items-center justify-between">
                                Question Navigator
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1 text-[8px] uppercase tracking-tighter text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div> Ans
                                    </div>
                                    <div className="flex items-center gap-1 text-[8px] uppercase tracking-tighter text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Rev
                                    </div>
                                </div>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {MOCK_ROLE_QUESTIONS.map((q, idx) => {
                                    const isActive = idx === currentIndex;
                                    const isAnswered = !!answers[q.id];
                                    const isMarked = markedForReview.has(q.id);
                                    
                                    let bgColorClass = 'bg-gray-50 dark:bg-white/5 text-gray-400';
                                    if (isActive) bgColorClass = 'bg-brand-text-light-primary dark:bg-white text-white dark:text-black shadow-md';
                                    else if (isMarked) bgColorClass = 'bg-amber-500 text-white';
                                    else if (isAnswered) bgColorClass = 'bg-brand-green text-white';

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] transition-all ${bgColorClass}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Sidebar Navigator */}
                <div className="hidden lg:flex w-[280px] border-l border-brand-light-tertiary dark:border-white/5 bg-brand-light-primary dark:bg-brand-dark-primary flex-col p-4 shrink-0">
                    <div className="flex-1 overflow-hidden flex flex-col h-full bg-white dark:bg-[#1A1D21] border border-brand-light-tertiary dark:border-white/5 rounded-[20px] shadow-sm transition-colors">
                        <div className="p-4 border-b border-brand-light-tertiary dark:border-white/5">
                            <h3 className="text-sm font-bold text-brand-text-light-primary dark:text-white">Navigator</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] font-bold uppercase tracking-wider text-brand-text-light-secondary dark:text-gray-500">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-brand-green"></div> Answered
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Review
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600"></div> Pending
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-4 gap-2">
                                {MOCK_ROLE_QUESTIONS.map((q, idx) => {
                                    const isActive = idx === currentIndex;
                                    const isAnswered = !!answers[q.id];
                                    const isMarked = markedForReview.has(q.id);
                                    
                                    let bgColorClass = 'bg-white dark:bg-[#24272B] border-brand-light-tertiary dark:border-white/10 text-brand-text-light-secondary dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5';
                                    
                                    if (isActive) {
                                        bgColorClass = 'bg-brand-text-light-primary dark:bg-white text-white dark:text-black border-transparent shadow-lg scale-110 z-10 relative';
                                    } else if (isMarked) {
                                        bgColorClass = 'bg-amber-500 text-white border-amber-500 shadow-amber-500/20';
                                    } else if (isAnswered) {
                                        bgColorClass = 'bg-brand-green text-white border-brand-green shadow-brand-green/20';
                                    }

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`
                                                w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] border transition-all duration-300
                                                ${bgColorClass}
                                            `}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* Bottom Action Bar - Highly optimized for Mobile */}
            <footer className="min-h-[70px] md:h-20 border-t border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-[#1A1D21] p-3 md:p-4 flex flex-col md:flex-row gap-3 items-center justify-between sticky bottom-0 z-50 transition-all">
                
                {/* Primary Actions Row (Mobile) / Left Side (Desktop) */}
                <div className="flex items-center gap-2 w-full md:w-auto order-2 md:order-1">
                    <button 
                        onClick={handleMarkReview}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl border font-bold text-[11px] transition-all ${markedForReview.has(currentQuestion.id) ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-500' : 'bg-white dark:bg-[#24272B] border-brand-light-tertiary dark:border-white/20 text-brand-text-light-primary dark:text-white'}`}
                    >
                        {markedForReview.has(currentQuestion.id) ? 'Unmark Review' : 'Mark Review'}
                    </button>
                    <button 
                        onClick={handleClear}
                        disabled={!answers[currentQuestion.id]}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-[#24272B] border border-brand-light-tertiary dark:border-white/20 text-brand-text-light-primary dark:text-white font-bold text-[11px] disabled:opacity-30"
                    >
                        Clear
                    </button>
                </div>

                {/* Main Navigation Row (Mobile) / Right Side (Desktop) */}
                <div className="flex items-center gap-3 w-full md:w-auto order-1 md:order-2">
                    <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-brand-light-tertiary dark:border-white/20 text-brand-text-light-primary dark:text-white font-bold text-[12px] disabled:opacity-30"
                    >
                        Previous
                    </button>
                    
                    {currentIndex === MOCK_ROLE_QUESTIONS.length - 1 ? (
                        <button 
                            onClick={handleSubmit}
                            className="flex-[2] md:flex-none px-8 py-2.5 rounded-xl bg-brand-green text-white font-bold text-[12px] shadow-lg shadow-brand-green/20"
                        >
                            Submit Test
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="flex-[2] md:flex-none px-8 py-2.5 rounded-xl bg-brand-green text-white font-bold text-[12px] shadow-lg shadow-brand-green/20"
                        >
                            Save & Next
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default RoleEngine;
