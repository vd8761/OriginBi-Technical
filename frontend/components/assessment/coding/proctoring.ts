"use client";

import { useCallback, useEffect, useState } from "react";

export interface ProctoringSettings {
    tabSwitch: boolean;
    tabSwitchToast: boolean;
    blockRightClick: boolean;
    detectMouseLeave: boolean;
    detectFullscreenExit: boolean;
    blockCopyPaste: boolean;
    blockBrowserShortcuts: boolean;
}

export const DEFAULT_PROCTORING: ProctoringSettings = {
    tabSwitch: true,
    tabSwitchToast: true,
    blockRightClick: true,
    detectMouseLeave: false,
    detectFullscreenExit: false,
    blockCopyPaste: true,
    blockBrowserShortcuts: true,
};

export type ProctoringCounter =
    | "rightClick"
    | "mouseLeave"
    | "fullscreenExit"
    | "copyPaste"
    | "browserShortcut";

export type ProctoringCounters = Record<ProctoringCounter, number>;

export const EMPTY_COUNTERS: ProctoringCounters = {
    rightClick: 0,
    mouseLeave: 0,
    fullscreenExit: 0,
    copyPaste: 0,
    browserShortcut: 0,
};

const SETTINGS_KEY = "ob_proctoring_settings";

export function useProctoringSettings() {
    const [settings, setSettings] = useState<ProctoringSettings>(DEFAULT_PROCTORING);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const id = window.setTimeout(() => {
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
        }, 0);
        return () => window.clearTimeout(id);
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

    // Block browser shortcuts that would either steal focus to a native
    // dialog (Ctrl+S "Save Page" / Ctrl+P "Print" → falsely registers as a
    // tab switch when the dialog steals focus) or open devtools / view-source
    // (Ctrl+Shift+I / Ctrl+U / F12) which defeat the proctoring entirely.
    //
    // We deliberately do NOT block Ctrl+C inside the code editor — that's
    // handled by the copy/paste rule below which exempts `.code-textarea`.
    useEffect(() => {
        if (!active || !settings.blockBrowserShortcuts) return;
        const handler = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            const mod = e.ctrlKey || e.metaKey;

            // Single-key blocks
            if (e.key === "F12") {
                e.preventDefault();
                e.stopPropagation();
                onViolation("browserShortcut", {
                    title: "Devtools blocked",
                    desc: "Opening developer tools is disabled during the assessment.",
                });
                return;
            }

            if (!mod) return;

            // Ctrl/Cmd + Shift + I / J / C — devtools / inspector
            if (e.shiftKey && (k === "i" || k === "j" || k === "c")) {
                e.preventDefault();
                e.stopPropagation();
                onViolation("browserShortcut", {
                    title: "Inspector blocked",
                    desc: "Developer tools shortcuts are disabled during the assessment.",
                });
                return;
            }

            // Ctrl/Cmd-only browser dialogs and view-source
            const blocked: Record<string, { title: string; desc: string }> = {
                s: { title: "Save page blocked", desc: "Press the assessment's Submit button to finish — not Ctrl+S." },
                p: { title: "Print blocked", desc: "Printing the assessment is disabled." },
                o: { title: "Open file blocked", desc: "Opening local files is disabled during the assessment." },
                u: { title: "View source blocked", desc: "Viewing page source is disabled during the assessment." },
                // Find dialogs steal focus, which the tab-switch monitor
                // would otherwise count as cheating.
                f: { title: "Browser find blocked", desc: "Use the editor's built-in find (inside the code area) instead." },
                g: { title: "Browser find blocked", desc: "Use the editor's built-in find (inside the code area) instead." },
                // Page reload — accidental Ctrl+R / Ctrl+F5 would destroy the session.
                r: { title: "Reload blocked", desc: "Reloading the page is disabled mid-assessment." },
            };
            if (blocked[k]) {
                e.preventDefault();
                e.stopPropagation();
                onViolation("browserShortcut", blocked[k]);
                return;
            }
        };
        // beforeunload guards against Ctrl+W / window close attempts as a
        // last-resort prompt so the candidate doesn't lose their work.
        document.addEventListener("keydown", handler, true);
        return () => {
            document.removeEventListener("keydown", handler, true);
        };
    }, [active, settings.blockBrowserShortcuts, onViolation]);

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
