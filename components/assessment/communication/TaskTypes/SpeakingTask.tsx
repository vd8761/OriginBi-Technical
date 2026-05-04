import React, { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingTask } from "../CommunicationEngine";

interface SpeakingTaskProps {
    task: SpeakingTask;
    value?: { audioBlobUrl: string } | null;
    onChange: (value: { audioBlobUrl: string }) => void;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const SpeakingTaskComponent: React.FC<SpeakingTaskProps> = ({ task, value, onChange }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [prepTimeLeft, setPrepTimeLeft] = useState(task.prepTimeSeconds);
    const [recordTimeLeft, setRecordTimeLeft] = useState(task.recordTimeSeconds);
    const [recordingComplete, setRecordingComplete] = useState(!!value?.audioBlobUrl);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    const startRecording = useCallback(async () => {
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
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const audioUrl = URL.createObjectURL(audioBlob);
                onChange({ audioBlobUrl: audioUrl });
                setRecordingComplete(true);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Microphone access denied or error:", error);
            alert("Unable to access the microphone. Please allow permissions.");
        }
    }, [onChange]);

    useEffect(() => {
        if (!isRecording && !recordingComplete && prepTimeLeft > 0) {
            const timer = window.setInterval(() => {
                setPrepTimeLeft((prev) => prev - 1);
            }, 1000);

            return () => window.clearInterval(timer);
        }

    }, [isRecording, prepTimeLeft, recordingComplete]);

    useEffect(() => {
        if (isRecording && recordTimeLeft > 0) {
            const timer = window.setInterval(() => {
                setRecordTimeLeft((prev) => prev - 1);
            }, 1000);

            return () => window.clearInterval(timer);
        }

        if (isRecording && recordTimeLeft === 0) {
            stopRecording();
        }
    }, [isRecording, recordTimeLeft, stopRecording]);

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#17201b] dark:text-white">
                    Speaking prompt
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                    {task.instructions}
                </p>
                <div className="mt-4 rounded-lg border border-brand-green/10 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                    <h3 className="text-lg font-bold leading-8 text-[#17201b] dark:text-white">
                        {task.prompt}
                    </h3>
                </div>
            </section>

            <aside className="rounded-lg border border-brand-green/10 bg-white p-4 dark:border-white/10 dark:bg-[#0f1712]">
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                    {recordingComplete ? (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h4 className="mt-4 text-lg font-bold text-[#17201b] dark:text-white">Recording saved</h4>
                            <p className="mt-2 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                                Review your audio or continue to the next task.
                            </p>
                        </>
                    ) : isRecording ? (
                        <>
                            <div className="relative flex h-24 w-24 items-center justify-center">
                                <span className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping" />
                                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 0 1-7 7m0 0a7 7 0 0 1-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 0 1-3-3V5a3 3 0 1 1 6 0v6a3 3 0 0 1-3 3Z" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-red-500">Recording</p>
                            <p className="mt-2 font-mono text-3xl font-bold text-[#17201b] dark:text-white">
                                {formatTime(recordTimeLeft)}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10">
                                <span className="font-mono text-2xl font-bold text-amber-600">
                                    {formatTime(prepTimeLeft)}
                                </span>
                            </div>
                            <h4 className="mt-4 text-lg font-bold text-[#17201b] dark:text-white">
                                {prepTimeLeft === 0 ? "Ready to record" : "Prepare your answer"}
                            </h4>
                            <p className="mt-2 text-sm font-medium leading-6 text-[#17201b] dark:text-white">
                                {prepTimeLeft === 0
                                    ? "Start when you are ready. Keep your response clear and structured."
                                    : "Use this preparation time to organize your response."}
                            </p>
                        </>
                    )}
                </div>

                <div className="mt-4 flex flex-col gap-3">
                    {!isRecording && !recordingComplete && (
                        <button
                            type="button"
                            onClick={() => void startRecording()}
                            className="min-h-11 rounded-lg bg-brand-green px-5 text-sm font-bold text-white transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                        >
                            Start recording now
                        </button>
                    )}
                    {isRecording && (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="min-h-11 rounded-lg bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                        >
                            Finish recording
                        </button>
                    )}
                    {recordingComplete && value?.audioBlobUrl && (
                        <audio controls src={value.audioBlobUrl} className="h-10 w-full" />
                    )}
                </div>
            </aside>
        </div>
    );
};

export default SpeakingTaskComponent;
