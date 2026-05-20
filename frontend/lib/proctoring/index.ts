"use client";

// Shared proctoring lib used by every assessment engine.
//
// Originally lived at `components/assessment/coding/proctoring.ts`. Moved here
// so non-coding engines (Aptitude, Adaptive Aptitude, Communication, MNC,
// Role) can mount the same rules without re-implementing them. The old path
// re-exports from this module for back-compat.
//
// Today the rule-set is hardcoded; per-package toggles come in via the
// `resolveProctoringForPackage()` resolver below, which reads
// `tab_switch_limit` and `anti_copy_enabled` off the admin assessment row.
// Adding more per-package controls is a follow-up: add columns to
// `ApiAssessment`, surface them in `AssessmentSettingsModal`, and extend the
// resolver mapping.

import { useCallback, useEffect, useState } from "react";

export interface ProctoringSettings {
    tabSwitch: boolean;
    tabSwitchToast: boolean;
    blockRightClick: boolean;
    detectMouseLeave: boolean;
    detectFullscreenExit: boolean;
    blockCopyPaste: boolean;
    blockBrowserShortcuts: boolean;
    detectDevtools: boolean;
    detectFocusLoss: boolean;
    logKeypress: boolean;
    requireCameraMic: boolean;
}

export const DEFAULT_PROCTORING: ProctoringSettings = {
    tabSwitch: true,
    tabSwitchToast: true,
    blockRightClick: true,
    // Mouse-leave and focus-loss are detection-only signals (no UX block) and
    // every occurrence is forwarded to the attempt_events pipeline. On by
    // default so the proctoring report captures the full count of cursor exits
    // and window-focus losses, alongside right-click / copy-paste / tab
    // switches which were already tracked.
    detectMouseLeave: true,
    detectFullscreenExit: false,
    blockCopyPaste: true,
    blockBrowserShortcuts: true,
    detectDevtools: false,
    detectFocusLoss: true,
    logKeypress: false,
    requireCameraMic: false,
};

export type ProctoringCounter =
    | "rightClick"
    | "mouseLeave"
    | "fullscreenExit"
    | "copyPaste"
    | "browserShortcut"
    | "devtoolsOpen"
    | "focusLost"
    | "keypress";

export type ProctoringCounters = Record<ProctoringCounter, number>;

export interface ProctoringMessage {
    title: string;
    desc: string;
    meta?: Record<string, unknown>;
}

export const EMPTY_COUNTERS: ProctoringCounters = {
    rightClick: 0,
    mouseLeave: 0,
    fullscreenExit: 0,
    copyPaste: 0,
    browserShortcut: 0,
    devtoolsOpen: 0,
    focusLost: 0,
    keypress: 0,
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
    onViolation: (type: ProctoringCounter, message: ProctoringMessage) => void;
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

    // Tab-switch is owned by the `proctoring.tab-switch` plugin (see
    // frontend/plugins/proctoring-tab-switch/manifest.tsx) — it runs its own
    // visibilitychange listener and publishes onto the plugin event bus.
    // The settings.tabSwitch / settings.tabSwitchToast flags remain on the
    // type for back-compat but are no longer read from this hook.

    // Block browser shortcuts that would either steal focus to a native
    // dialog (Ctrl+S "Save Page" / Ctrl+P "Print") or open devtools / view-
    // source (Ctrl+Shift+I / Ctrl+U / F12). Excludes the code editor (.code-
    // textarea) for the copy/paste case below.
    useEffect(() => {
        if (!active || !settings.blockBrowserShortcuts) return;
        const handler = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            const mod = e.ctrlKey || e.metaKey;

            if (e.key === "F12") {
                e.preventDefault();
                e.stopPropagation();
                onViolation("browserShortcut", {
                    title: "Devtools blocked",
                    desc: "Opening developer tools is disabled during the assessment.",
                    meta: { shortcut: "F12" },
                });
                return;
            }

            if (!mod) return;

            if (e.shiftKey && (k === "i" || k === "j" || k === "c")) {
                e.preventDefault();
                e.stopPropagation();
                onViolation("browserShortcut", {
                    title: "Inspector blocked",
                    desc: "Developer tools shortcuts are disabled during the assessment.",
                    meta: { shortcut: `${e.ctrlKey ? "Ctrl" : "Meta"}+Shift+${e.key}` },
                });
                return;
            }

            const blocked: Record<string, { title: string; desc: string }> = {
                s: { title: "Save page blocked", desc: "Press the assessment's Submit button to finish — not Ctrl+S." },
                p: { title: "Print blocked", desc: "Printing the assessment is disabled." },
                o: { title: "Open file blocked", desc: "Opening local files is disabled during the assessment." },
                u: { title: "View source blocked", desc: "Viewing page source is disabled during the assessment." },
                f: { title: "Browser find blocked", desc: "Use the editor's built-in find (inside the code area) instead." },
                g: { title: "Browser find blocked", desc: "Use the editor's built-in find (inside the code area) instead." },
                r: { title: "Reload blocked", desc: "Reloading the page is disabled mid-assessment." },
            };
            if (blocked[k]) {
                e.preventDefault();
                e.stopPropagation();
                onViolation("browserShortcut", {
                    ...blocked[k],
                    meta: { shortcut: `${e.ctrlKey ? "Ctrl" : "Meta"}+${e.key}` },
                });
                return;
            }
        };
        document.addEventListener("keydown", handler, true);
        return () => {
            document.removeEventListener("keydown", handler, true);
        };
    }, [active, settings.blockBrowserShortcuts, onViolation]);

    // Devtools-open heuristic. Two signals:
    //   1. Window outer/inner size delta > 160px (docked devtools).
    //   2. F12 / Ctrl+Shift+I keystrokes (covered by blockBrowserShortcuts
    //      above but we count the *attempt* here too).
    useEffect(() => {
        if (!active || !settings.detectDevtools) return;
        let wasOpen = false;
        const check = () => {
            const dx = window.outerWidth - window.innerWidth;
            const dy = window.outerHeight - window.innerHeight;
            const open = dx > 160 || dy > 160;
            if (open && !wasOpen) {
                onViolation("devtoolsOpen", {
                    title: "Developer tools detected",
                    desc: "Opening the browser inspector is recorded by the proctor.",
                });
            }
            wasOpen = open;
        };
        const id = window.setInterval(check, 1500);
        return () => window.clearInterval(id);
    }, [active, settings.detectDevtools, onViolation]);

    // Focus-loss / window-blur counter. Fires when the candidate clicks away
    // (e.g. into another app) or moves the mouse outside the viewport for
    // long enough to register a blur event.
    useEffect(() => {
        if (!active || !settings.detectFocusLoss) return;
        const blurHandler = () => {
            onViolation("focusLost", {
                title: "Window lost focus",
                desc: "Stay on the assessment window for the full duration.",
            });
        };
        window.addEventListener("blur", blurHandler);
        return () => window.removeEventListener("blur", blurHandler);
    }, [active, settings.detectFocusLoss, onViolation]);

    // Optional keypress log. Throttled to one event every 250 ms so a normal
    // typing burst doesn't flood the event channel. Counts attempts; the
    // payload could later carry the key if the assessment opted in.
    useEffect(() => {
        if (!active || !settings.logKeypress) return;
        let last = 0;
        const handler = () => {
            const now = Date.now();
            if (now - last < 250) return;
            last = now;
            onViolation("keypress", {
                title: "Keystroke recorded",
                desc: "Keystroke activity is logged for this assessment.",
            });
        };
        window.addEventListener("keydown", handler, { passive: true });
        return () => window.removeEventListener("keydown", handler);
    }, [active, settings.logKeypress, onViolation]);

    // Copy / paste / cut block — except in the code editor textarea (the
    // coding engine adds `.code-textarea` to its Monaco mount, others don't).
    useEffect(() => {
        if (!active || !settings.blockCopyPaste) return;
        const handler = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.classList?.contains("code-textarea")) return;
            e.preventDefault();
            const action = e.type === "cut" ? "cut" : e.type === "paste" ? "paste" : "copy";
            const label = action[0].toUpperCase() + action.slice(1);
            onViolation("copyPaste", {
                title: `${label} blocked`,
                desc: "Copy and paste are disabled outside of the code editor.",
                meta: { action },
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

// ─── Per-package resolver ────────────────────────────────────────────────
//
// Maps an admin assessment row (returned by GET /api/assessment/admin/
// assessments) into a ProctoringSettings object. Only fields that already
// exist on the row are read; the rest fall back to defaults. Adding new
// per-package fields means: add the column on the backend, expose it via
// ApiAssessment + AssessmentSettingsModal, then extend this mapping.

export interface PackageProctoringInput {
    tab_switch_limit?: number | null;
    anti_copy_enabled?: boolean | null;
    proctoring_block_devtools?: boolean | null;
    proctoring_require_fullscreen?: boolean | null;
    devtools_open_limit?: number | null;
    mouse_focus_loss_limit?: number | null;
    keypress_log_enabled?: boolean | null;
    require_camera_mic?: boolean | null;
}

export function resolveProctoringForPackage(
    assessment: PackageProctoringInput | null | undefined,
): ProctoringSettings {
    if (!assessment) return DEFAULT_PROCTORING;
    const tabSwitch =
        typeof assessment.tab_switch_limit === "number" && assessment.tab_switch_limit > 0;
    const blockCopyPaste = Boolean(assessment.anti_copy_enabled);
    const detectDevtools = Boolean(assessment.proctoring_block_devtools);
    const detectFullscreenExit = Boolean(assessment.proctoring_require_fullscreen);
    const detectFocusLoss =
        typeof assessment.mouse_focus_loss_limit === "number" && assessment.mouse_focus_loss_limit >= 0
            ? Boolean(assessment.mouse_focus_loss_limit) || true
            : false;
    const logKeypress = Boolean(assessment.keypress_log_enabled);
    const requireCameraMic = Boolean(assessment.require_camera_mic);
    return {
        ...DEFAULT_PROCTORING,
        tabSwitch,
        tabSwitchToast: tabSwitch,
        blockCopyPaste,
        detectDevtools,
        detectFullscreenExit,
        detectFocusLoss,
        logKeypress,
        requireCameraMic,
    };
}
