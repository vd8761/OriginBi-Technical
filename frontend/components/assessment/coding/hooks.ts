"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TIME_KEY = "ob_exam_time";

export function useTimer(initial: number, options: { persist?: boolean } = {}) {
    const persist = options.persist ?? true;
    const [time, setTime] = useState(initial);
    const [running, setRunning] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!persist) {
            const id = window.setTimeout(() => setHydrated(true), 0);
            return () => window.clearTimeout(id);
        }
        let savedTime: number | null = null;
        try {
            const saved = window.localStorage.getItem(TIME_KEY);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!Number.isNaN(parsed)) savedTime = parsed;
            }
        } catch {
            // ignore
        }
        const id = window.setTimeout(() => {
            if (savedTime != null) setTime(savedTime);
            setHydrated(true);
        }, 0);
        return () => window.clearTimeout(id);
    }, [persist]);

    useEffect(() => {
        if (!running || !hydrated || time <= 0) return;
        const id = window.setInterval(() => {
            setTime((t) => {
                const next = t - 1;
                if (persist) {
                    try {
                        window.localStorage.setItem(TIME_KEY, String(next));
                    } catch {
                        // ignore
                    }
                }
                return next;
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [running, time, hydrated, persist]);

    const reset = useCallback((to: number) => {
        setTime(to);
        if (!persist) return;
        try {
            window.localStorage.setItem(TIME_KEY, String(to));
        } catch {
            // ignore
        }
    }, [persist]);

    const clear = useCallback(() => {
        try {
            window.localStorage.removeItem(TIME_KEY);
        } catch {
            // ignore
        }
    }, []);

    return { time, running, setRunning, reset, clear };
}

const TAB_SWITCH_KEY = "ob_tab_switches";
const TAB_SWITCH_GRACE_KEY = "ob_tab_switch_grace_start";

export interface TabSwitchEvent {
    at: number;
    duration: number;
}

/**
 * Monitors tab/visibility changes once the candidate has had `graceMs`
 * to settle in. The grace deadline is persisted to localStorage so a
 * page reload can't reset the timer — once consumed, it's consumed for
 * the rest of the attempt.
 */
export function useTabSwitchMonitor(active: boolean, graceMs = 10_000) {
    const [count, setCount] = useState(0);
    const [events, setEvents] = useState<TabSwitchEvent[]>([]);
    const [hidden, setHidden] = useState(false);
    const [lastReason, setLastReason] = useState<string | null>(null);
    const hiddenAt = useRef<number | null>(null);

    useEffect(() => {
        let savedEvents: TabSwitchEvent[] | null = null;
        try {
            const raw = window.localStorage.getItem(TAB_SWITCH_KEY);
            if (raw) {
                const parsed: TabSwitchEvent[] = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    savedEvents = parsed;
                }
            }
        } catch {
            // ignore
        }
        const id = window.setTimeout(() => {
            if (!savedEvents) return;
            setEvents(savedEvents);
            setCount(savedEvents.length);
        }, 0);
        return () => window.clearTimeout(id);
    }, []);

    useEffect(() => {
        if (!active) return;

        // One-time grace period. Persisted so a reload doesn't reset it —
        // we set the start timestamp on first activation and never bump it.
        let graceStart: number;
        try {
            const raw = window.localStorage.getItem(TAB_SWITCH_GRACE_KEY);
            const parsed = raw ? parseInt(raw, 10) : NaN;
            if (Number.isFinite(parsed)) {
                graceStart = parsed;
            } else {
                graceStart = Date.now();
                window.localStorage.setItem(TAB_SWITCH_GRACE_KEY, String(graceStart));
            }
        } catch {
            graceStart = Date.now();
        }
        const graceUntil = graceStart + graceMs;
        const inGrace = () => Date.now() < graceUntil;

        const recordSwitch = (reason: string) => {
            if (inGrace()) return; // ignored — settling-in window
            const at = Date.now();
            hiddenAt.current = at;
            setHidden(true);
            setLastReason(reason);
        };

        const recordReturn = () => {
            const at = Date.now();
            const start = hiddenAt.current;
            hiddenAt.current = null;
            setHidden(false);
            if (start == null) return;
            const evt: TabSwitchEvent = { at: start, duration: at - start };
            setEvents((prev) => {
                const next = [...prev, evt];
                try {
                    window.localStorage.setItem(TAB_SWITCH_KEY, JSON.stringify(next));
                } catch {
                    // ignore
                }
                return next;
            });
            setCount((c) => c + 1);
        };

        const onVisibility = () => {
            if (document.visibilityState === "hidden") recordSwitch("visibility");
            else if (document.visibilityState === "visible" && hiddenAt.current != null) recordReturn();
        };

        const onBlur = () => {
            if (hiddenAt.current == null) recordSwitch("blur");
        };

        const onFocus = () => {
            if (hiddenAt.current != null && document.visibilityState === "visible") recordReturn();
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("blur", onBlur);
            window.removeEventListener("focus", onFocus);
        };
    }, [active, graceMs]);

    const clear = useCallback(() => {
        setCount(0);
        setEvents([]);
        try {
            window.localStorage.removeItem(TAB_SWITCH_KEY);
            window.localStorage.removeItem(TAB_SWITCH_GRACE_KEY);
        } catch {
            // ignore
        }
    }, []);

    return { count, events, hidden, lastReason, clear };
}

const PANIC_FAVICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="15" fill="#ED2F34"/>' +
    '<text x="16" y="23" text-anchor="middle" fill="white" font-size="22" font-weight="900" font-family="Arial,sans-serif">!</text>' +
    "</svg>";

const PANIC_FAVICON_URL = `data:image/svg+xml,${encodeURIComponent(PANIC_FAVICON_SVG)}`;
const PANIC_TITLE = "⚠ Return to your assessment!";

// Flashes the document title and swaps the favicon while the tab is hidden,
// so the candidate sees an alarming label/icon in their tab bar and snaps back.
export function useTabPanic(active: boolean, hidden: boolean) {
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (!active || !hidden) return;

        const originalTitle = document.title;
        const head = document.head;

        // Snapshot current favicons so we can restore them.
        const existing = Array.from(
            head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
        );
        const snapshots = existing.map((el) => ({ el, href: el.href, rel: el.rel }));

        // Remove existing icons and inject the panic icon.
        existing.forEach((el) => el.parentNode?.removeChild(el));
        const panicLink = document.createElement("link");
        panicLink.rel = "icon";
        panicLink.type = "image/svg+xml";
        panicLink.href = PANIC_FAVICON_URL;
        head.appendChild(panicLink);

        let toggle = false;
        document.title = PANIC_TITLE;
        const interval = window.setInterval(() => {
            toggle = !toggle;
            document.title = toggle ? originalTitle : PANIC_TITLE;
        }, 900);

        return () => {
            window.clearInterval(interval);
            document.title = originalTitle;
            panicLink.parentNode?.removeChild(panicLink);
            // Restore previous favicons in original order.
            snapshots.forEach(({ el, href, rel }) => {
                const restored = el.cloneNode(false) as HTMLLinkElement;
                restored.rel = rel;
                restored.href = href;
                head.appendChild(restored);
            });
        };
    }, [active, hidden]);
}
