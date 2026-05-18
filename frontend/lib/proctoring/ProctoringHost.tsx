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
import { ShieldAlert } from "lucide-react";
import {
    EMPTY_COUNTERS,
    type ProctoringCounter,
    type ProctoringCounters,
    type ProctoringSettings,
    useProctoring,
} from "./index";

const TOAST_VISIBLE_MS = 4500;

interface ProctoringHostProps {
    settings: ProctoringSettings;
    active: boolean;
    // Optional — fires alongside the internal counter update so engines can
    // record violations into telemetry / persist them with the attempt.
    onViolation?: (
        type: ProctoringCounter,
        message: { title: string; desc: string },
        counters: ProctoringCounters,
    ) => void;
}

export default function ProctoringHost({ settings, active, onViolation }: ProctoringHostProps) {
    const [counters, setCounters] = useState<ProctoringCounters>({ ...EMPTY_COUNTERS });
    const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);
    const hideTimer = useRef<number | null>(null);

    const showToast = useCallback((title: string, desc: string) => {
        setToast({ title, desc });
        if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setToast(null), TOAST_VISIBLE_MS);
    }, []);

    const handleViolation = useCallback(
        (type: ProctoringCounter, message: { title: string; desc: string }) => {
            // Use functional setState so we always read the latest counter
            // value when several violations fire in the same tick.
            setCounters((prev) => {
                const next: ProctoringCounters = { ...prev, [type]: prev[type] + 1 };
                onViolation?.(type, message, next);
                return next;
            });
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

    if (!toast) return null;

    return (
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
    );
}
