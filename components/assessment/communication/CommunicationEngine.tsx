import React, { useState, useEffect } from 'react';
import Logo from '../../ui/Logo';
import ThemeToggle from '../../ui/ThemeToggle';
import AudioTaskComponent from './TaskTypes/AudioTask';
import SpeakingTaskComponent from './TaskTypes/SpeakingTask';
import ReadingTaskComponent from './TaskTypes/ReadingTask';
import WritingTaskComponent from './TaskTypes/WritingTask';

// Mock Data Types
export type TaskType = 'audio' | 'speaking' | 'reading' | 'writing';

export interface BaseTask {
    id: string;
    type: TaskType;
    instructions: string;
}

export interface AudioTask extends BaseTask {
    type: 'audio';
    audioUrl: string;
    questions: { id: string; text: string; options: { id: string; text: string; }[] }[];
}

export interface SpeakingTask extends BaseTask {
    type: 'speaking';
    prompt: string;
    prepTimeSeconds: number;
    recordTimeSeconds: number;
}

export interface ReadingTask extends BaseTask {
    type: 'reading';
    passage: string;
    questions: { id: string; text: string; options: { id: string; text: string; }[] }[];
}

export interface WritingTask extends BaseTask {
    type: 'writing';
    prompt: string;
    minWords?: number;
    maxWords?: number;
}

export type AssessmentTask = AudioTask | SpeakingTask | ReadingTask | WritingTask;

const MOCK_TASKS: AssessmentTask[] = [
    {
        id: 'task_1',
        type: 'audio',
        instructions: 'Listen to the audio clip and answer the questions below.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Example mock audio
        questions: [
            {
                id: 'q1',
                text: 'What is the primary topic of the announcement?',
                options: [
                    { id: 'opt_1', text: 'Quarterly financial results' },
                    { id: 'opt_2', text: 'New office policies' },
                    { id: 'opt_3', text: 'Upcoming company retreat' },
                    { id: 'opt_4', text: 'Software update schedule' }
                ]
            },
            {
                id: 'q2',
                text: 'What action are employees asked to take by Friday?',
                options: [
                    { id: 'opt_1', text: 'Submit expense reports' },
                    { id: 'opt_2', text: 'Update their passwords' },
                    { id: 'opt_3', text: 'RSVP to the event' },
                    { id: 'opt_4', text: 'Complete the survey' }
                ]
            }
        ]
    },
    {
        id: 'task_2',
        type: 'reading',
        instructions: 'Read the following business email and answer the questions.',
        passage: "Subject: Urgent Update on Project Alpha Delivery\\n\\nTeam,\\n\\nI am writing to inform you that the delivery date for Project Alpha has been moved up by two weeks. The client has requested an expedited timeline due to an upcoming product launch on their end. This means our new target for Phase 1 completion is now October 15th, rather than November 1st.\\n\\nPlease review your current workload and let me know by EOD tomorrow if this compressed schedule poses any critical risks to your deliverables. We will hold a brief stand-up meeting on Thursday morning at 9:00 AM to discuss mitigation strategies.\\n\\nBest regards,\\nSarah Jensen\\nProject Manager",
        questions: [
            {
                id: 'q3',
                text: 'What is the main reason for the schedule change?',
                options: [
                    { id: 'opt_1', text: 'The team was working too slowly.' },
                    { id: 'opt_2', text: 'The client has an upcoming product launch.' },
                    { id: 'opt_3', text: 'Sarah Jensen is going on leave.' },
                    { id: 'opt_4', text: 'There was an error in the original contract.' }
                ]
            },
            {
                id: 'q4',
                text: 'When is the new deadline for Phase 1?',
                options: [
                    { id: 'opt_1', text: 'November 1st' },
                    { id: 'opt_2', text: 'EOD tomorrow' },
                    { id: 'opt_3', text: 'October 15th' },
                    { id: 'opt_4', text: 'Thursday morning' }
                ]
            }
        ]
    },
    {
        id: 'task_3',
        type: 'speaking',
        instructions: 'Read the prompt below. You will have 30 seconds to prepare and 90 seconds to record your response.',
        prompt: 'Imagine you are explaining a complex technical problem to a non-technical stakeholder. How would you approach the conversation to ensure they understand the core issue without getting lost in technical jargon?',
        prepTimeSeconds: 30,
        recordTimeSeconds: 90
    },
    {
        id: 'task_4',
        type: 'writing',
        instructions: 'Draft an email response based on the scenario provided below.',
        prompt: 'Scenario: A key client has emailed you expressing frustration that a recent software update broke a critical feature they rely on. Draft a professional, empathetic email acknowledging the issue, explaining that the engineering team is actively working on a fix, and outlining the next steps for communication.',
        minWords: 50,
        maxWords: 200
    }
];

interface CommunicationEngineProps {
    onComplete: (data: Record<string, any>) => void;
}

const CommunicationEngine: React.FC<CommunicationEngineProps> = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 mins
    const [answers, setAnswers] = useState<Record<string, any>>({});
    
    const currentTask = MOCK_TASKS[currentIndex];

    // Timer Logic
    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        if (currentIndex < MOCK_TASKS.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        onComplete(answers);
    };

    const updateAnswer = (taskId: string, answerData: any) => {
        setAnswers(prev => ({
            ...prev,
            [taskId]: answerData
        }));
    };

    const renderTaskContent = () => {
        switch (currentTask.type) {
            case 'audio':
                return <AudioTaskComponent task={currentTask as AudioTask} value={answers[currentTask.id]} onChange={(val: any) => updateAnswer(currentTask.id, val)} />;
            case 'reading':
                return <ReadingTaskComponent task={currentTask as ReadingTask} value={answers[currentTask.id]} onChange={(val: any) => updateAnswer(currentTask.id, val)} />;
            case 'speaking':
                return <SpeakingTaskComponent task={currentTask as SpeakingTask} value={answers[currentTask.id]} onChange={(val: any) => updateAnswer(currentTask.id, val)} />;
            case 'writing':
                return <WritingTaskComponent task={currentTask as WritingTask} value={answers[currentTask.id]} onChange={(val: any) => updateAnswer(currentTask.id, val)} />;
            default:
                return <div>Unknown Task Type</div>;
        }
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
                    <span className="text-[11px] font-bold text-brand-text-light-secondary dark:text-gray-400 hidden md:block uppercase tracking-wider">
                        Communication Assessment
                    </span>
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
                
                {/* Left Area: Task content */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 md:p-6 relative w-full">
                    
                    {/* Header: Task Number */}
                    <div className="flex items-center mb-4">
                        <div className="text-[10px] font-bold text-brand-green uppercase tracking-widest bg-brand-green/10 px-2.5 py-1 rounded-md">
                            Task {currentIndex + 1} of {MOCK_TASKS.length}
                        </div>
                    </div>

                    {renderTaskContent()}

                </div>

                {/* Right Area: Sidebar Navigator */}
                <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l border-brand-light-tertiary dark:border-white/5 bg-brand-light-primary dark:bg-brand-dark-primary flex flex-col p-4 shrink-0 z-10 lg:z-0">
                    <div className="flex-1 overflow-hidden flex flex-col h-full bg-white dark:bg-[#1A1D21] border border-brand-light-tertiary dark:border-white/5 rounded-[20px] shadow-sm transition-colors">
                        <div className="p-4 border-b border-brand-light-tertiary dark:border-white/5">
                            <h3 className="text-sm font-bold text-brand-text-light-primary dark:text-white">Task Navigator</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] font-bold uppercase tracking-wider text-brand-text-light-secondary dark:text-gray-500">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-brand-green"></div> Completed
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600"></div> Pending
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-4 gap-2">
                                {MOCK_TASKS.map((task, idx) => {
                                    const isActive = idx === currentIndex;
                                    const isCompleted = !!answers[task.id];
                                    
                                    let bgColorClass = 'bg-white dark:bg-[#24272B] border-brand-light-tertiary dark:border-white/10 text-brand-text-light-secondary dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5';
                                    if (isActive) {
                                        bgColorClass = 'bg-brand-text-light-primary dark:bg-white text-white dark:text-black border-transparent shadow-lg scale-110 z-10 relative';
                                    } else if (isCompleted) {
                                        bgColorClass = 'bg-brand-green text-white border-brand-green shadow-brand-green/20';
                                    }

                                    return (
                                        <button
                                            key={task.id}
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

            {/* Bottom Action Bar */}
            <footer className="h-16 md:h-20 border-t border-brand-light-tertiary dark:border-white/5 bg-white dark:bg-[#1A1D21] p-4 flex flex-wrap gap-3 items-center justify-end sticky bottom-0 z-50">
                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
                    <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="px-6 py-2.5 rounded-full border border-brand-light-tertiary dark:border-white/20 text-brand-text-light-primary dark:text-white font-bold text-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    
                    {currentIndex === MOCK_TASKS.length - 1 ? (
                        <button 
                            onClick={handleSubmit}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] shadow-lg shadow-brand-green/20 transition-all active:scale-95"
                        >
                            Submit Assessment
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="px-8 py-2.5 rounded-full bg-brand-green hover:bg-[#1bb85c] text-white font-bold text-[12px] shadow-lg shadow-brand-green/20 transition-all active:scale-95"
                        >
                            Save & Next
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default CommunicationEngine;
