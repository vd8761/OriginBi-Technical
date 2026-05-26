"use client";

// Drop-in proctoring host for any assessment engine. Mounts the
// `useProctoring()` rule-set, keeps violation counters, and renders a small
// floating toast when a rule fires. Engines just place
//   <ProctoringHost settings={settings} active={!isLoading && !isSubmitting} />
// inside their root and the rest is automatic.
//
// CodingAssessment.tsx has its own bespoke proctoring UI (counters in the
// header, dev controls, traceEvent integration) — keep using that hook
// directly there. This component is for engines that don't need that level
// of control surface.

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert, Video } from "lucide-react";
import {
    EMPTY_COUNTERS,
    type ProctoringCounter,
    type ProctoringCounters,
    type ProctoringMessage,
    type ProctoringSettings,
    useProctoring,
} from "./index";
import { requestDummyMedia } from "./dummyMedia";

// Counters live in a ref because no host-rendered UI reads them today —
// they're forwarded straight to `onViolation` so engines can persist them
// with the attempt. Tracking via ref avoids a re-render per violation.

const TOAST_VISIBLE_MS = 4500;

interface ProctoringHostProps {
    settings: ProctoringSettings;
    active: boolean;
    // Optional — fires alongside the internal counter update so engines can
    // record violations into telemetry / persist them with the attempt.
    onViolation?: (
        type: ProctoringCounter,
        message: ProctoringMessage,
        counters: ProctoringCounters,
    ) => void;
}

export default function ProctoringHost({ settings, active, onViolation }: ProctoringHostProps) {
    const countersRef = useRef<ProctoringCounters>({ ...EMPTY_COUNTERS });
    const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hideTimer = useRef<number | null>(null);

    useEffect(() => {
        if (!active || !settings.requireCameraMic) return;
        let cancelled = false;
        requestDummyMedia().then((state) => {
            if (cancelled) return;
            if (state.stream && videoRef.current) {
                videoRef.current.srcObject = state.stream;
                videoRef.current.play().catch(() => {});
                setCameraReady(true);
            } else if (state.error) {
                setCameraError(state.error);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [active, settings.requireCameraMic]);

    const showToast = useCallback((title: string, desc: string) => {
        setToast({ title, desc });
        if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setToast(null), TOAST_VISIBLE_MS);
    }, []);

    const handleViolation = useCallback(
        (type: ProctoringCounter, message: ProctoringMessage) => {
            const prev = countersRef.current;
            const next: ProctoringCounters = { ...prev, [type]: prev[type] + 1 };
            countersRef.current = next;
            onViolation?.(type, message, next);
            showToast(message.title, message.desc);
        },
        [onViolation, showToast],
    );

    useEffect(
        () => () => {
            if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
        },
        [],
    );

    useProctoring({ active, settings, onViolation: handleViolation });

    const showCameraChip = active && settings.requireCameraMic;

    return (
        <>
            {showCameraChip && (
                <div className="hidden">
                    <div className="overflow-hidden rounded-xl border border-emerald-500/40 bg-black/70 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
                        <video
                            ref={videoRef}
                            muted
                            playsInline
                            autoPlay
                            style={{ width: 144, height: 108, objectFit: "cover", display: cameraReady ? "block" : "none" }}
                        />
                        {!cameraReady && (
                            <div className="flex h-[108px] w-[144px] items-center justify-center px-2 text-center text-[10px] font-bold text-amber-300">
                                {cameraError ? "Camera blocked" : "Awaiting camera…"}
                            </div>
                        )}
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
                        <Video size={11} />
                        <span>{cameraReady ? "Camera Active" : cameraError ? "Camera Blocked" : "Camera…"}</span>
                    </div>
                </div>
            )}

            {toast && (
                <div
                    className="pointer-events-none fixed left-1/2 top-20 z-[170] -translate-x-1/2"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex max-w-[440px] items-start gap-3 rounded-2xl border border-amber-500/40 bg-white/95 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:bg-[#111a15]/95">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <ShieldAlert size={16} />
                        </div>
                        <div className="text-[12.5px] leading-snug">
                            <div className="font-bold text-amber-600 dark:text-amber-400">{toast.title}</div>
                            <div className="mt-0.5 text-slate-600 dark:text-slate-300">{toast.desc}</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
