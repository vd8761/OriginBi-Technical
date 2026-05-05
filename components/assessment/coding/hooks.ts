"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TIME_KEY = "ob_exam_time";

export function useTimer(initial: number) {
    const [time, setTime] = useState(initial);
    const [running, setRunning] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(TIME_KEY);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!Number.isNaN(parsed)) setTime(parsed);
            }
        } catch {
            // ignore
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!running || !hydrated || time <= 0) return;
        const id = window.setInterval(() => {
            setTime((t) => {
                const next = t - 1;
                try {
                    window.localStorage.setItem(TIME_KEY, String(next));
                } catch {
                    // ignore
                }
                return next;
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [running, time, hydrated]);

    const reset = useCallback((to: number) => {
        setTime(to);
        try {
            window.localStorage.setItem(TIME_KEY, String(to));
        } catch {
            // ignore
        }
    }, []);

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

export interface TabSwitchEvent {
    at: number;
    duration: number;
}

export function useTabSwitchMonitor(active: boolean) {
    const [count, setCount] = useState(0);
    const [events, setEvents] = useState<TabSwitchEvent[]>([]);
    const [hidden, setHidden] = useState(false);
    const [lastReason, setLastReason] = useState<string | null>(null);
    const hiddenAt = useRef<number | null>(null);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(TAB_SWITCH_KEY);
            if (raw) {
                const parsed: TabSwitchEvent[] = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setEvents(parsed);
                    setCount(parsed.length);
                }
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (!active) return;

        const recordSwitch = (reason: string) => {
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
    }, [active]);

    const clear = useCallback(() => {
        setCount(0);
        setEvents([]);
        try {
            window.localStorage.removeItem(TAB_SWITCH_KEY);
        } catch {
            // ignore
        }
    }, []);

    return { count, events, hidden, lastReason, clear };
}
