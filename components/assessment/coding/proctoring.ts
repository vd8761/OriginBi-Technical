"use client";

import { useCallback, useEffect, useState } from "react";

export interface ProctoringSettings {
    tabSwitch: boolean;
    tabSwitchToast: boolean;
    blockRightClick: boolean;
    detectMouseLeave: boolean;
    detectFullscreenExit: boolean;
    blockCopyPaste: boolean;
}

export const DEFAULT_PROCTORING: ProctoringSettings = {
    tabSwitch: true,
    tabSwitchToast: true,
    blockRightClick: true,
    detectMouseLeave: false,
    detectFullscreenExit: false,
    blockCopyPaste: true,
};

export type ProctoringCounter =
    | "rightClick"
    | "mouseLeave"
    | "fullscreenExit"
    | "copyPaste";

export type ProctoringCounters = Record<ProctoringCounter, number>;

export const EMPTY_COUNTERS: ProctoringCounters = {
    rightClick: 0,
    mouseLeave: 0,
    fullscreenExit: 0,
    copyPaste: 0,
};

const SETTINGS_KEY = "ob_proctoring_settings";

export function useProctoringSettings() {
    const [settings, setSettings] = useState<ProctoringSettings>(DEFAULT_PROCTORING);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    setSettings({ ...DEFAULT_PROCTORING, ...parsed });
                }
            }
        } catch {
            /* ignore */
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch {
            /* ignore */
        }
    }, [settings, hydrated]);

    const update = useCallback(
        <K extends keyof ProctoringSettings>(key: K, value: ProctoringSettings[K]) => {
            setSettings((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_PROCTORING);
    }, []);

    return { settings, update, resetSettings };
}

interface ProctoringHookOptions {
    active: boolean;
    settings: ProctoringSettings;
    onViolation: (type: ProctoringCounter, message: { title: string; desc: string }) => void;
}

export function useProctoring({ active, settings, onViolation }: ProctoringHookOptions) {
    // Right-click block
    useEffect(() => {
        if (!active || !settings.blockRightClick) return;
        const handler = (e: MouseEvent) => {
            e.preventDefault();
            onViolation("rightClick", {
                title: "Right-click blocked",
                desc: "Context menus are disabled during the assessment.",
            });
        };
        document.addEventListener("contextmenu", handler);
        return () => document.removeEventListener("contextmenu", handler);
    }, [active, settings.blockRightClick, onViolation]);

    // Mouse leave detection
    useEffect(() => {
        if (!active || !settings.detectMouseLeave) return;
        const handler = (e: MouseEvent) => {
            // Only fire when cursor leaves the document (not when entering an iframe etc.)
            if (e.relatedTarget != null) return;
            onViolation("mouseLeave", {
                title: "Cursor left the window",
                desc: "Keep your cursor inside the assessment area while the test is running.",
            });
        };
        document.addEventListener("mouseout", handler);
        return () => document.removeEventListener("mouseout", handler);
    }, [active, settings.detectMouseLeave, onViolation]);

    // Fullscreen exit detection
    useEffect(() => {
        if (!active || !settings.detectFullscreenExit) return;
        const handler = () => {
            if (!document.fullscreenElement) {
                onViolation("fullscreenExit", {
                    title: "Exited fullscreen",
                    desc: "Fullscreen exits are recorded as part of your proctoring report.",
                });
            }
        };
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, [active, settings.detectFullscreenExit, onViolation]);

    // Copy / paste / cut block — except in the code editor textarea
    useEffect(() => {
        if (!active || !settings.blockCopyPaste) return;
        const handler = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.classList?.contains("code-textarea")) return;
            e.preventDefault();
            onViolation("copyPaste", {
                title: "Clipboard action blocked",
                desc: "Copy and paste are disabled outside of the code editor.",
            });
        };
        document.addEventListener("copy", handler);
        document.addEventListener("paste", handler);
        document.addEventListener("cut", handler);
        return () => {
            document.removeEventListener("copy", handler);
            document.removeEventListener("paste", handler);
            document.removeEventListener("cut", handler);
        };
    }, [active, settings.blockCopyPaste, onViolation]);
}

export function requestFullscreen() {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {
        /* ignore — browser may require gesture */
    });
}

export function exitFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {
            /* ignore */
        });
    }
}
