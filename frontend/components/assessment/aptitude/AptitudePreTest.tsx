import React, { useEffect, useState } from "react";
import { Video, Mic, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { requestDummyMedia } from "@/lib/proctoring/dummyMedia";

interface AptitudePreTestProps {
    onStart: (mode: 'trial' | 'main') => void;
    onClose: () => void;
    accentColor?: string;
    gradient?: string;
    mode?: 'trial' | 'main';
    questions?: number | string;
    duration?: string;
    trialAttemptsLimit?: number;
    mainAttemptsLimit?: number;
    attemptsCount?: number;
    skills?: string[];
    requireCameraMic?: boolean;
}

const AptitudePreTest: React.FC<AptitudePreTestProps> = ({ 
    onStart, 
    onClose,
    accentColor = '#1ED36A',
    gradient = 'linear-gradient(135deg, #1ED36A 0%, #1bb85c 100%)',
    mode = 'main',
    questions = 60,
    duration = "60 min",
    trialAttemptsLimit = 5,
    mainAttemptsLimit = 2,
    attemptsCount: initialAttemptsCount,
    skills = ["Quantitative", "Logical", "Data interpretation", "Abstract reasoning"],
    requireCameraMic = false
}) => {
    const [attemptsCount, setAttemptsCount] = useState<number>(initialAttemptsCount ?? 0);
    const [step, setStep] = useState<1 | 2>(1);
    const [mediaStatus, setMediaStatus] = useState<'idle' | 'requesting' | 'granted' | 'error'>('idle');
    const [mediaError, setMediaError] = useState<string | null>(null);

    useEffect(() => {
        if (initialAttemptsCount !== undefined) {
            setAttemptsCount(initialAttemptsCount);
            return;
        }
        let active = true;
        const fetchStats = async () => {
            try {
                let activeEmail = "";
                const storedProfile = localStorage.getItem("originbi:user-profile");
                if (storedProfile) {
                    const parsed = JSON.parse(storedProfile);
                    if (parsed && parsed.email) {
                        activeEmail = parsed.email;
                    }
                }
                if (!activeEmail) {
                    const storedUser = localStorage.getItem("user");
                    if (storedUser) {
                        const parsed = JSON.parse(storedUser);
                        if (parsed && parsed.email) {
                            activeEmail = parsed.email;
                        }
                    }
                }
                const API_BASE =
                    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : process.env.NEXT_PUBLIC_ASSESSMENT_SERVICE_URL?.replace(/\/$/, "")) ||
                    process.env.NEXT_PUBLIC_EXAM_ENGINE_URL?.replace(/\/$/, "") ||
                    "";
                const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
                const response = await fetch(`${API_BASE}/api/assessment/attempts-stats${emailParam}`);
                const json = await response.json();
                const data = json.data || json;
                if (active && data) {
                    const stats = data['aptitude'] || { trial: 0, main: 0 };
                    setAttemptsCount(mode === 'trial' ? stats.trial : stats.main);
                }
            } catch (err) {
                console.error("Failed to load attempt stats in pretest:", err);
            }
        };
        fetchStats();
        return () => { active = false; };
    }, [mode, initialAttemptsCount]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (step === 2 && mediaStatus === 'granted') {
            const stream = window.__obi_dummy_stream;
            if (stream && videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [step, mediaStatus]);

    const handleEnableHardware = async () => {
        setMediaStatus('requesting');
        setMediaError(null);
        const state = await requestDummyMedia();
        if (state.error) {
            setMediaStatus('error');
            setMediaError(state.error);
        } else {
            setMediaStatus('granted');
            if (videoRef.current && state.stream) {
                videoRef.current.srcObject = state.stream;
            }
        }
    };

    const limit = mode === 'trial' ? trialAttemptsLimit : mainAttemptsLimit;
    const currentAttempt = attemptsCount + 1;

    const metrics = [
        { label: "Questions", value: String(questions) },
        { label: "Duration", value: duration },
        { label: "Sections", value: "4" },
        { label: "Attempts", value: `${currentAttempt}/${limit}` },
    ];

    const checklist = [
        `Keep one uninterrupted ${duration} window ready.`,
        "Use a laptop or desktop for the most stable test layout.",
        "Avoid refreshing the browser after the assessment begins.",
        "Ensure all questions are answered before submission.",
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                aria-hidden="true"
            />

            <section
                role="dialog"
                aria-modal="true"
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111a15]"
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-8 dark:border-white/10">
                    <div className="flex items-start gap-6">
                        <div 
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ background: gradient || accentColor }}
                        >
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Aptitude Assessment
                                </h2>
                                {mode === 'trial' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 whitespace-nowrap">
                                        Trial Assessment
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-900 dark:text-white">
                                {step === 1 ? "Benchmark problem-solving speed, numerical accuracy, and logical reasoning." : "Complete the hardware check to ensure an uninterrupted testing experience."}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-brand-green hover:text-brand-green dark:border-white/10"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                </header>

                <div className="relative flex flex-1 overflow-hidden">
                    <div 
                        className="flex w-full transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
                    >
                        {/* Step 1: Core Details */}
                        <div className="w-full shrink-0 overflow-y-auto p-6 sm:p-8">
                            <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
                                <div className="space-y-8 order-2 lg:order-1">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Core modules</h3>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {skills.map((skill) => (
                                                <div key={skill} className="rounded-xl border border-brand-green/10 bg-brand-green/5 p-4 text-sm font-bold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
                                                    {skill}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Checklist</h3>
                                        <div className="space-y-3">
                                            {checklist.map((point) => (
                                                <div key={point} className="flex items-start gap-3">
                                                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{point}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <aside className="h-fit rounded-2xl border border-brand-green/10 bg-brand-green/[0.03] p-6 dark:border-white/10 dark:bg-white/5 order-1 lg:order-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-brand-green mb-4">Session Stats</h3>
                                    <div className="space-y-4">
                                        {metrics.map((metric) => (
                                            <div key={metric.label} className="flex items-center justify-between gap-4 border-b border-brand-green/10 pb-3 last:border-0 last:pb-0 dark:border-white/10">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{metric.label}</span>
                                                <strong className="text-sm font-bold text-slate-900 dark:text-white">{metric.value}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </aside>
                            </div>
                        </div>

                        {/* Step 2: Hardware Check */}
                        <div className="w-full shrink-0 overflow-y-auto p-6 sm:p-8 flex flex-col justify-center items-center">
                            <div className="max-w-md w-full space-y-6">
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Hardware Check Required</h3>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        This assessment is proctored. You must enable your camera and microphone to proceed.
                                    </p>
                                </div>

                                {mediaStatus === 'granted' ? (
                                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-black/5 flex flex-col items-center">
                                        <video 
                                            ref={videoRef} 
                                            autoPlay 
                                            muted 
                                            playsInline 
                                            className="w-full h-48 object-cover bg-black"
                                        />
                                        <div className="flex w-full items-center justify-center gap-2 bg-emerald-50 py-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="text-sm font-bold">Please ensure you are clearly visible</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                <Video className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">Camera Access</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Required for visual proctoring</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                <Mic className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">Microphone Access</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Required for audio proctoring</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {mediaError && (
                                    <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-500/10 dark:text-red-400">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                        <div className="text-sm font-medium">
                                            <p>Hardware access denied or unavailable.</p>
                                            <p className="mt-1 text-xs opacity-90">{mediaError}</p>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                <footer className="shrink-0 flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-end sm:px-8 dark:border-white/10 dark:bg-transparent">
                    <button
                        type="button"
                        onClick={() => {
                            if (step === 2) setStep(1);
                            else onClose();
                        }}
                        className="px-8 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-900 hover:opacity-80 dark:text-white dark:hover:opacity-80 transition-all"
                    >
                        Go back
                    </button>
                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (requireCameraMic) {
                                    setStep(2);
                                } else {
                                    onStart(mode);
                                }
                            }}
                            className="rounded-lg bg-brand-green px-10 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#1bb85c]"
                        >
                            {requireCameraMic ? "Next step" : "Begin test"}
                        </button>
                    ) : mediaStatus !== 'granted' ? (
                        <button
                            type="button"
                            onClick={handleEnableHardware}
                            disabled={mediaStatus === 'requesting'}
                            className="flex items-center justify-center gap-2 rounded-lg bg-brand-green px-10 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#1bb85c] disabled:opacity-70"
                        >
                            {mediaStatus === 'requesting' ? (
                                <><Loader2 className="h-3 w-3 animate-spin" /> Requesting...</>
                            ) : "Enable Hardware"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onStart(mode)}
                            className="rounded-lg bg-brand-green px-10 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#1bb85c]"
                        >
                            Begin test
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
};

export default AptitudePreTest;
