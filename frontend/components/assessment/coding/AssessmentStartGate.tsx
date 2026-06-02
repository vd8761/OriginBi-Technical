"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { requestFullscreen } from "@/lib/proctoring";

type PermState = "idle" | "requesting" | "granted" | "denied";

interface AssessmentStartGateProps {
    languageLabel: string;
    onStart: () => void;
    onCancel: () => void;
}

// AssessmentStartGate is the mandatory pre-exam check: it acquires camera + mic
// (showing a live preview so the candidate can confirm), and only then offers a
// "Start in fullscreen" button. Fullscreen is requested inside the button's
// click handler so the browser honours the user gesture, and it persists into
// the exam because we render this on the same page as the assessment.
const AssessmentStartGate: React.FC<AssessmentStartGateProps> = ({
    languageLabel,
    onStart,
    onCancel,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [perm, setPerm] = useState<PermState>("idle");
    const [error, setError] = useState<string | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    const requestPermissions = useCallback(async () => {
        setPerm("requesting");
        setError(null);
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("This browser does not support camera/microphone access.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 },
                audio: true,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
            const hasVideo = stream.getVideoTracks().length > 0;
            const hasAudio = stream.getAudioTracks().length > 0;
            if (!hasVideo || !hasAudio) {
                throw new Error("Both a working camera and microphone are required.");
            }
            setPerm("granted");
        } catch (err) {
            stopStream();
            setPerm("denied");
            setError(
                err instanceof Error
                    ? err.message
                    : "Camera and microphone permission was blocked.",
            );
        }
    }, [stopStream]);

    // Request on mount.
    useEffect(() => {
        void requestPermissions();
        return () => stopStream();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStart = () => {
        if (perm !== "granted") return;
        // Release the preview stream; the proctoring layer re-acquires inside the
        // exam if camera monitoring is enabled. Then go fullscreen on the gesture.
        stopStream();
        requestFullscreen();
        onStart();
    };

    return (
        <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] px-4 text-white">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
                <h1 className="text-[22px] font-extrabold tracking-tight">Device & permission check</h1>
                <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                    Your {languageLabel} coding assessment is proctored. Allow camera and
                    microphone access, then start in fullscreen.
                </p>

                <div className="relative mx-auto mt-6 aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                    />
                    {perm !== "granted" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[12px] text-white/70">
                            {perm === "requesting"
                                ? "Requesting camera & microphone…"
                                : perm === "denied"
                                    ? "Camera / mic blocked"
                                    : "Awaiting permission…"}
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-semibold">
                    <span className={perm === "granted" ? "text-[#1ED36A]" : "text-white/50"}>
                        ● Camera
                    </span>
                    <span className={perm === "granted" ? "text-[#1ED36A]" : "text-white/50"}>
                        ● Microphone
                    </span>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-300">
                        {error}
                        <div className="mt-1 text-[11px] text-red-300/80">
                            Enable access in your browser’s site settings, then retry.
                        </div>
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-2.5">
                    {perm === "granted" ? (
                        <button
                            type="button"
                            onClick={handleStart}
                            className="w-full rounded-full bg-[#1ED36A] px-6 py-3.5 text-[13px] font-extrabold text-white shadow-[0_8px_24px_rgba(30,211,106,0.35)] transition active:scale-95"
                        >
                            Start in fullscreen
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={requestPermissions}
                            disabled={perm === "requesting"}
                            className="w-full rounded-full bg-[#1ED36A] px-6 py-3.5 text-[13px] font-extrabold text-white shadow-[0_8px_24px_rgba(30,211,106,0.35)] transition active:scale-95 disabled:opacity-60"
                        >
                            {perm === "requesting" ? "Requesting…" : "Allow camera & microphone"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            stopStream();
                            onCancel();
                        }}
                        className="w-full rounded-full border border-white/10 px-6 py-3 text-[12px] font-bold text-white/70 transition hover:bg-white/5"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssessmentStartGate;
