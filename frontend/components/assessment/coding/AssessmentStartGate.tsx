"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { requestFullscreen } from "@/lib/proctoring";

type PermState = "idle" | "requesting" | "granted" | "denied";
type Mode = "camera" | "screen";

interface AssessmentStartGateProps {
    languageLabel: string;
    onStart: () => void;
    onCancel: () => void;
}

// AssessmentStartGate is the mandatory pre-exam check.
//
// Primary path: acquire camera + mic (live preview) so the candidate is
// visibly proctored. If no camera/mic is available (or access is blocked), we
// don't dead-end the candidate — we warn them and fall back to requiring a
// full-SCREEN share (the entire monitor, not a single tab) with audio. Either
// way, once a valid source is granted we offer "Start in fullscreen", which is
// triggered inside the click handler so the browser honours the gesture and
// fullscreen persists into the exam.
const AssessmentStartGate: React.FC<AssessmentStartGateProps> = ({
    languageLabel,
    onStart,
    onCancel,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const [mode, setMode] = useState<Mode>("camera");
    const [perm, setPerm] = useState<PermState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const stopStreams = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop());
            micStreamRef.current = null;
        }
    }, []);

    const attachPreview = useCallback((stream: MediaStream) => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => {});
        }
    }, []);

    // ── Camera + mic (primary) ────────────────────────────────────────────────
    const requestCamera = useCallback(async () => {
        setMode("camera");
        setPerm("requesting");
        setError(null);
        setNotice(null);
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("This browser does not support camera/microphone access.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 },
                audio: true,
            });
            if (stream.getVideoTracks().length === 0 || stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach((t) => t.stop());
                throw new Error("Both a working camera and microphone are required.");
            }
            stopStreams();
            streamRef.current = stream;
            attachPreview(stream);
            setPerm("granted");
        } catch (err) {
            // Don't hard-block — offer the screen-share fallback.
            setPerm("denied");
            const msg = err instanceof Error ? err.message : "Camera/microphone unavailable.";
            setError(
                `Camera/microphone unavailable (${msg}). You can instead share your entire screen with audio to continue.`,
            );
        }
    }, [attachPreview, stopStreams]);

    // ── Full-screen share (fallback) ───────────────────────────────────────────
    const requestScreen = useCallback(async () => {
        setMode("screen");
        setPerm("requesting");
        setError(null);
        setNotice(null);
        try {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                throw new Error("This browser does not support screen sharing.");
            }
            const screen = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "monitor" } as MediaTrackConstraints,
                audio: true,
            });
            const videoTrack = screen.getVideoTracks()[0];
            const surface = videoTrack?.getSettings?.().displaySurface;
            // Require the ENTIRE screen, not a tab or single window.
            if (surface && surface !== "monitor") {
                screen.getTracks().forEach((t) => t.stop());
                throw new Error(
                    "Please share your ENTIRE screen (the whole monitor), not a tab or a single window.",
                );
            }

            stopStreams();
            streamRef.current = screen;
            attachPreview(screen);

            // Also capture microphone audio when possible. Some browsers expose
            // system audio on getDisplayMedia; others require a separate mic
            // stream. At least one audio track is required in fallback mode.
            try {
                const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                micStreamRef.current = mic;
            } catch {
                /* display audio may still be present */
            }

            const hasAudio =
                screen.getAudioTracks().length > 0 || !!micStreamRef.current;
            if (!hasAudio) {
                stopStreams();
                throw new Error(
                    "Screen sharing needs audio. Re-share your entire screen with “Share audio” enabled, or allow microphone access.",
                );
            }
            // If the candidate stops the share from the browser chrome, send them
            // back to re-grant rather than starting unproctored.
            videoTrack?.addEventListener("ended", () => {
                stopStreams();
                setPerm("denied");
                setError("Screen sharing stopped. Re-share your entire screen to continue.");
            });
            setPerm("granted");
        } catch (err) {
            setPerm("denied");
            const msg = err instanceof Error ? err.message : "Screen sharing was blocked.";
            setError(msg);
        }
    }, [attachPreview, stopStreams]);

    // Request camera on mount.
    useEffect(() => {
        void requestCamera();
        return () => stopStreams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStart = () => {
        if (perm !== "granted") return;
        // Release the camera preview (the proctoring layer re-acquires inside the
        // exam if needed). A screen share, however, must stay live for the whole
        // exam, so we keep that stream running.
        if (mode === "camera") {
            stopStreams();
        }
        requestFullscreen();
        onStart();
    };

    const sourceLabel = mode === "camera" ? "Camera & microphone" : "Full screen + audio";

    return (
        <div className="coding-exam-root coding-theme-dark flex min-h-screen items-center justify-center bg-[#19211C] px-4 text-white">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
                <h1 className="text-[22px] font-extrabold tracking-tight">Device & permission check</h1>
                <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                    Your {languageLabel} coding assessment is proctored. Grant a monitoring source
                    below, then start in fullscreen.
                </p>

                <div className="relative mx-auto mt-6 aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                    <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                    {perm !== "granted" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-3 text-center text-[12px] text-white/70">
                            {perm === "requesting"
                                ? mode === "camera"
                                    ? "Requesting camera & microphone…"
                                    : "Requesting screen share…"
                                : perm === "denied"
                                    ? "No monitoring source yet"
                                    : "Awaiting permission…"}
                        </div>
                    )}
                </div>

                {perm === "granted" && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1ED36A]/10 px-3 py-1 text-[12px] font-semibold text-[#1ED36A]">
                        ● {sourceLabel} active
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-200">
                        {error}
                    </div>
                )}
                {notice && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11.5px] text-white/70">
                        {notice}
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
                        <>
                            <button
                                type="button"
                                onClick={requestCamera}
                                disabled={perm === "requesting" && mode === "camera"}
                                className="w-full rounded-full bg-[#1ED36A] px-6 py-3.5 text-[13px] font-extrabold text-white shadow-[0_8px_24px_rgba(30,211,106,0.35)] transition active:scale-95 disabled:opacity-60"
                            >
                                {perm === "requesting" && mode === "camera"
                                    ? "Requesting…"
                                    : "Allow camera & microphone"}
                            </button>
                            <button
                                type="button"
                                onClick={requestScreen}
                                disabled={perm === "requesting" && mode === "screen"}
                                className="w-full rounded-full border border-white/15 px-6 py-3 text-[12px] font-bold text-white/80 transition hover:bg-white/5 disabled:opacity-60"
                            >
                                {perm === "requesting" && mode === "screen"
                                    ? "Requesting…"
                                    : "No camera? Share entire screen + audio instead"}
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            stopStreams();
                            onCancel();
                        }}
                        className="w-full rounded-full px-6 py-2.5 text-[12px] font-bold text-white/50 transition hover:text-white/80"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssessmentStartGate;
