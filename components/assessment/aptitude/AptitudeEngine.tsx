import React, { useState, useEffect } from 'react';
import Logo from '../../ui/Logo';
import ThemeToggle from '../../ui/ThemeToggle';
import QuestionNavigator, { NavigatorQuestion, QuestionState } from './QuestionNavigator';

// Mock Data Types
interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    category: string;
    text: string;
    imageUrl?: string;
    options: Option[];
}

const MOCK_QUESTIONS: Question[] = [
    {
        id: "q1",
        category: "QA",
        text: "If the price of a book is first decreased by 25% and then increased by 20%, then the net change in the price will be:",
        options: [
            { id: "o1", text: "10% decrease" },
            { id: "o2", text: "5% decrease" },
            { id: "o3", text: "No change" },
            { id: "o4", text: "5% increase" }
        ]
    },
    {
        id: "q2",
        category: "LR",
        text: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
        options: [
            { id: "o1", text: "(1/3)" },
            { id: "o2", text: "(1/8)" },
            { id: "o3", text: "(2/8)" },
            { id: "o4", text: "(1/16)" }
        ]
    },
    {
        id: "q3",
        category: "DI",
        text: "Based on the chart below, what was the total revenue in Q3?",
        imageUrl: "https://via.placeholder.com/600x300.png?text=Sample+Bar+Chart",
        options: [
            { id: "o1", text: "$45,000" },
            { id: "o2", text: "$50,000" },
            { id: "o3", text: "$55,000" },
            { id: "o4", text: "$60,000" }
        ]
    },
    {
        id: "q4",
        category: "AR",
        text: "Which of the following figures is the odd one out?",
        imageUrl: "https://via.placeholder.com/600x200.png?text=Abstract+Figures",
        options: [
            { id: "o1", text: "Figure A" },
            { id: "o2", text: "Figure B" },
            { id: "o3", text: "Figure C" },
            { id: "o4", text: "Figure D" }
        ]
    }
];

import ConfirmationModal from '../../ui/ConfirmationModal';

interface AptitudeEngineProps {
    onComplete: (answers: Record<string, string>) => void;
}

const AptitudeEngine: React.FC<AptitudeEngineProps> = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    // Timer Logic
    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete(answers);
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, onComplete, answers]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const currentQuestion = MOCK_QUESTIONS[currentIndex];

    // Build Navigator State
    const navigatorQuestions: NavigatorQuestion[] = MOCK_QUESTIONS.map((q, idx) => {
        let state: QuestionState = 'unanswered';
        if (answers[q.id]) state = 'answered';
        if (markedForReview.has(q.id)) state = 'marked';
        
        return {
            id: q.id,
            number: idx + 1,
            state,
            category: q.category
        };
    });

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
        if (currentIndex < MOCK_QUESTIONS.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        setShowSubmitModal(true);
    };

    const confirmSubmit = () => {
        setShowSubmitModal(false);
        onComplete(answers);
    };

    return (
        <div className="h-screen w-full bg-brand-light-primary dark:bg-brand-dark-primary flex flex-col font-sans transition-colors duration-500 overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-brand-dark-primary flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="scale-75 origin-left">
                        <Logo />
                    </div>
                    <div className="h-4 w-px bg-brand-light-tertiary dark:bg-white/10 hidden md:block"></div>
                    <span className="text-[11px] font-bold text-black dark:text-white hidden md:block uppercase tracking-wider">
                        Aptitude Assessment
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${timeLeft < 300 ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 animate-pulse' : 'bg-black/5 dark:bg-white/5 border-transparent text-black dark:text-white'}`}>
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
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 md:p-6 relative">
                    
                    {/* Header: Question Number */}
                    <div className="flex items-center mb-4">
                        <div className="text-[10px] font-bold text-brand-green uppercase tracking-widest bg-brand-green/10 px-2.5 py-1 rounded-md">
                            Question {currentIndex + 1} of {MOCK_QUESTIONS.length}
                        </div>
                    </div>

                    {/* Question Text */}
                    <div className="bg-white dark:bg-white/[0.03] border border-brand-light-tertiary dark:border-white/5 p-5 md:p-8 rounded-[20px] mb-6 transition-colors">
                        <h2 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-black dark:text-white leading-relaxed">
                            {currentQuestion.text}
                        </h2>
                        
                        {currentQuestion.imageUrl && (
                            <div className="mt-6 rounded-xl overflow-hidden border border-brand-light-tertiary dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 flex justify-center">
                                <img src={currentQuestion.imageUrl} alt="Question Reference" className="max-w-full h-auto object-contain max-h-[200px]" />
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div className="flex flex-col gap-2.5 flex-1 mb-6">
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = answers[currentQuestion.id] === option.id;
                            const labels = ['A', 'B', 'C', 'D'];
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleOptionSelect(option.id)}
                                    className={`
                                        flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 group
                                        ${isSelected 
                                            ? 'bg-brand-green/5 border-brand-green' 
                                            : 'bg-white dark:bg-white/[0.03] border-brand-light-tertiary dark:border-white/5 hover:border-brand-green/30'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all
                                        ${isSelected ? 'bg-brand-green text-white' : 'bg-brand-light-primary dark:bg-white/5 text-black dark:text-white group-hover:bg-brand-green/10 group-hover:text-brand-green'}
                                    `}>
                                        {labels[idx]}
                                    </div>
                                    <span className={`text-[13px] font-medium ${isSelected ? 'text-brand-green font-bold' : 'text-black dark:text-white'}`}>
                                        {option.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                </div>

                {/* Right Area: Sidebar Navigator */}
                <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l border-brand-light-tertiary dark:border-white/5 bg-brand-light-primary dark:bg-brand-dark-primary flex flex-col p-4 shrink-0 z-10 lg:z-0">
                    <div className="flex-1 overflow-hidden">
                        <QuestionNavigator 
                            questions={navigatorQuestions} 
                            currentIndex={currentIndex} 
                            onSelect={setCurrentIndex} 
                        />
                    </div>
                </div>

            </main>

            {/* Bottom Action Bar */}
            <footer className="h-16 md:h-20 border-t border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-brand-dark-primary p-4 flex flex-wrap gap-3 items-center justify-between sticky bottom-0 z-50">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleMarkReview}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-full border font-bold text-[12px] transition-all ${markedForReview.has(currentQuestion.id) ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-500' : 'bg-white dark:bg-[#24272B] border-brand-light-tertiary dark:border-white/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        {markedForReview.has(currentQuestion.id) ? 'Unmark Review' : 'Mark for Review'}
                    </button>
                    <button 
                        onClick={handleClear}
                        disabled={!answers[currentQuestion.id]}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-white dark:bg-[#24272B] border border-brand-light-tertiary dark:border-white/20 text-black dark:text-white font-bold text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Clear Response
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
                    <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="px-6 py-2.5 rounded-full border border-brand-light-tertiary dark:border-white/20 text-black dark:text-white font-bold text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    
                    {currentIndex === MOCK_QUESTIONS.length - 1 ? (
                        <button 
                            onClick={handleSubmit}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] transition-all active:scale-95"
                        >
                            Submit Test
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] transition-all active:scale-95"
                        >
                            Save & Next
                        </button>
                    )}
                </div>
            </footer>
            
            <ConfirmationModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onConfirm={confirmSubmit}
                title="Submit Assessment?"
                message="Are you sure you want to submit your assessment? You won't be able to change your answers after submission."
                confirmText="Submit Test"
                cancelText="Review Again"
                type="warning"
            />
        </div>
    );
};

export default AptitudeEngine;
