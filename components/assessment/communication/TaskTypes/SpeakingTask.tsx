import React, { useState, useEffect, useRef } from 'react';
import { SpeakingTask } from '../CommunicationEngine';

interface SpeakingTaskProps {
    task: SpeakingTask;
    value?: { audioBlobUrl: string } | null;
    onChange: (value: { audioBlobUrl: string }) => void;
}

const SpeakingTaskComponent: React.FC<SpeakingTaskProps> = ({ task, value, onChange }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [prepTimeLeft, setPrepTimeLeft] = useState(task.prepTimeSeconds);
    const [recordTimeLeft, setRecordTimeLeft] = useState(task.recordTimeSeconds);
    const [recordingComplete, setRecordingComplete] = useState(!!value?.audioBlobUrl);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        // Prep timer countdown
        if (!isRecording && !recordingComplete && prepTimeLeft > 0) {
            const timer = setInterval(() => {
                setPrepTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
        
        // Auto-start recording when prep time finishes
        if (!isRecording && !recordingComplete && prepTimeLeft === 0) {
            startRecording();
        }
    }, [prepTimeLeft, isRecording, recordingComplete]);

    useEffect(() => {
        // Record timer countdown
        if (isRecording && recordTimeLeft > 0) {
            const timer = setInterval(() => {
                setRecordTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }

        // Auto-stop recording when time is up
        if (isRecording && recordTimeLeft === 0) {
            stopRecording();
        }
    }, [recordTimeLeft, isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                onChange({ audioBlobUrl: audioUrl });
                setRecordingComplete(true);
                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Microphone access denied or error:', error);
            alert('Unable to access the microphone. Please allow permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="bg-brand-light-secondary dark:bg-white/[0.03] p-5 rounded-2xl border border-brand-light-tertiary dark:border-white/10 flex flex-col gap-4">
                <p className="text-[13px] font-medium text-black dark:text-white">
                    {task.instructions}
                </p>
                <div className="bg-white dark:bg-brand-dark-primary p-5 rounded-xl border border-brand-light-tertiary dark:border-white/5">
                    <h3 className="text-[clamp(14px,1.2vw,18px)] font-semibold text-black dark:text-white leading-relaxed italic">
                        "{task.prompt}"
                    </h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-white/[0.03] rounded-[20px] border border-brand-light-tertiary dark:border-white/5 transition-colors min-h-[300px]">
                
                {/* Status Indicator */}
                <div className="mb-8 flex flex-col items-center gap-2">
                    {recordingComplete ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-2">
                                <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-black dark:text-white">Recording Saved</h4>
                            <p className="text-xs text-black dark:text-white">You can proceed to the next task.</p>
                        </>
                    ) : isRecording ? (
                        <>
                            <div className="relative flex items-center justify-center w-24 h-24 mb-2">
                                <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
                                <div className="absolute inset-2 border-4 border-red-500 rounded-full animate-pulse opacity-40"></div>
                                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                                    <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                            </div>
                            <h4 className="font-bold text-red-500 animate-pulse uppercase tracking-wider text-sm">Recording</h4>
                            <p className="text-2xl font-mono font-bold text-black dark:text-white mt-1">{formatTime(recordTimeLeft)}</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 border border-amber-500/20">
                                <span className="text-2xl font-bold font-mono text-amber-500">{formatTime(prepTimeLeft)}</span>
                            </div>
                            <h4 className="font-bold text-black dark:text-white uppercase tracking-wider text-sm">Preparation Time</h4>
                            <p className="text-xs text-black dark:text-white">Read the prompt and prepare your response.</p>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    {!isRecording && !recordingComplete && (
                        <button 
                            onClick={startRecording}
                            className="px-8 py-3 rounded-full bg-brand-green text-white font-bold text-xs hover:bg-[#1bb85c] transition-all"
                        >
                            Start Early
                        </button>
                    )}
                    {isRecording && (
                        <button 
                            onClick={stopRecording}
                            className="px-8 py-3 rounded-full bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all"
                        >
                            Finish Recording
                        </button>
                    )}
                    {recordingComplete && value?.audioBlobUrl && (
                        <audio controls src={value.audioBlobUrl} className="h-10 mt-2" />
                    )}
                </div>

            </div>
        </div>
    );
};

export default SpeakingTaskComponent;
