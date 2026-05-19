"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AssessmentId } from "./exams";
import {
    getActiveEmail,
    getLatestSubmittedResult,
    getPurchasedAssessments,
    listAssignments,
    HAS_TECH_API,
    TECH_API_BASE,
} from "./api";

export type PaymentKey = AssessmentId | `coding:${string}`;

export const codingPaymentKey = (languageId: string): PaymentKey =>
    `coding:${languageId}` as PaymentKey;

const PAID_KEY = "originbi:paid-assessments";
const PAID_EVENT = "originbi:paid-changed";
const VISIBLE_KEY = "originbi:visible-assessments";
const VISIBLE_EVENT = "originbi:visible-changed";
const COMPLETED_KEY = "originbi:completed-assessments";
const COMPLETED_EVENT = "originbi:completed-changed";
const LEGACY_TECH_API_URL = TECH_API_BASE;
const PAID_REFRESH_MS = 30000;
const DEFAULT_VISIBLE_ASSESSMENTS = ["aptitude", "communication", "coding", "mnc", "role"];

const isNetworkError = (err: any) => {
    if (err instanceof TypeError) return true;
    if (typeof err === "string") return /failed to fetch/i.test(err);
    return /failed to fetch/i.test(String(err?.message ?? err));
};

const readSet = (storageKey: string): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
        return new Set();
    } catch {
        return new Set();
    }
};

const writeSet = (storageKey: string, eventName: string, set: Set<string>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(eventName));
};

const resolveCurrentEmail = (): string | null => {
    if (typeof window === "undefined") return null;
    const keys = ["originbi:user-profile", "user"];
    for (const key of keys) {
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (parsed?.email && typeof parsed.email === "string") {
                return parsed.email;
            }
        } catch {
            // Ignore malformed local storage values.
        }
    }
    return null;
};

const fetchServerEntitlements = async (): Promise<{ paid: Set<string>; visible: Set<string> }> => {
    const paid = new Set<string>();
    const visible = new Set<string>(DEFAULT_VISIBLE_ASSESSMENTS);

    const email = resolveCurrentEmail();
    if (email) {
        try {
            // The backend now returns the full catalog of assessment codes
            // when the user's registrations.registration_source is 'ADMIN',
            // so the regular hydration path covers the admin free-access
            // case without a separate client check.
            const response = await fetch(`${LEGACY_TECH_API_URL}/api/assessment/purchase/purchases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                const data = await response.json();
                for (const code of data?.purchased ?? []) {
                    if (typeof code === "string" && code.trim()) {
                        paid.add(code.trim());
                    }
                }
                if (Array.isArray(data?.visible) && data.visible.length > 0) {
                    visible.clear();
                    for (const code of data.visible) {
                        if (typeof code === "string" && code.trim()) {
                            visible.add(code.trim());
                        }
                    }
                }
            }
        } catch {
            // Purchase hydration is best-effort; coding assignments still load separately.
        }
    }

    try {
        const data = await listAssignments();
        for (const assignment of data.assignments ?? []) {
            if (
                typeof assignment.assignmentRef === "string" &&
                assignment.assignmentRef &&
                (assignment.status === "active" || assignment.status === "completed" || assignment.completed)
            ) {
                paid.add(assignment.assignmentRef);
            }
        }
    } catch {
        // Exam-engine assignments are also best-effort here.
    }

    return { paid, visible };
};

const useKeyedSet = (storageKey: string, eventName: string) => {
    const [set, setLocal] = useState<Set<string>>(new Set());

    useEffect(() => {
        const id = window.setTimeout(() => setLocal(readSet(storageKey)), 0);
        const sync = () => setLocal(readSet(storageKey));
        // Sync on mount to ensure we have latest data
        sync();
        window.addEventListener("storage", sync);
        window.addEventListener(eventName, sync);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener("storage", sync);
            window.removeEventListener(eventName, sync);
        };
    }, [storageKey, eventName]);

    const has = useCallback((key: PaymentKey) => set.has(key), [set]);

    const add = useCallback(
        (key: PaymentKey) => {
            const next = readSet(storageKey);
            next.add(key);
            writeSet(storageKey, eventName, next);
            setLocal(next);
        },
        [storageKey, eventName],
    );

    const remove = useCallback(
        (key: PaymentKey) => {
            const next = readSet(storageKey);
            next.delete(key);
            writeSet(storageKey, eventName, next);
            setLocal(next);
        },
        [storageKey, eventName],
    );

    return { has, add, remove };
};

export function usePaidAssessments() {
    const [set, setLocal] = useState<Set<string>>(new Set());
    const [visibleSet, setVisibleLocal] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_ASSESSMENTS));
    const [isEntitlementsReady, setIsEntitlementsReady] = useState(false);

    const syncFromStorage = useCallback(() => {
        setLocal(readSet(PAID_KEY));
        const nextVisible = readSet(VISIBLE_KEY);
        setVisibleLocal(nextVisible.size > 0 ? nextVisible : new Set(DEFAULT_VISIBLE_ASSESSMENTS));
    }, []);

    const hydrateFromBackend = useCallback(async () => {
        const { paid, visible } = await fetchServerEntitlements();
        writeSet(PAID_KEY, PAID_EVENT, paid);
        writeSet(VISIBLE_KEY, VISIBLE_EVENT, visible);
        setLocal(paid);
        setVisibleLocal(visible);
        setIsEntitlementsReady(true);
    }, []);

    useEffect(() => {
        const id = window.setTimeout(() => {
            syncFromStorage();
            void hydrateFromBackend();
        }, 0);
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void hydrateFromBackend();
            }
        }, PAID_REFRESH_MS);
        const handleFocus = () => {
            void hydrateFromBackend();
        };
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void hydrateFromBackend();
            }
        };
        window.addEventListener("storage", syncFromStorage);
        window.addEventListener(PAID_EVENT, syncFromStorage);
        window.addEventListener(VISIBLE_EVENT, syncFromStorage);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.clearTimeout(id);
            window.clearInterval(intervalId);
            window.removeEventListener("storage", syncFromStorage);
            window.removeEventListener(PAID_EVENT, syncFromStorage);
            window.removeEventListener(VISIBLE_EVENT, syncFromStorage);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [hydrateFromBackend, syncFromStorage]);

    const isPaid = useCallback((key: PaymentKey) => set.has(key), [set]);
    const isVisible = useCallback((key: string) => {
        if (key.startsWith("coding:")) {
            return visibleSet.has("coding") || visibleSet.has(key);
        }
        return visibleSet.has(key);
    }, [visibleSet]);

    const markPaid = useCallback((key: PaymentKey) => {
        const next = readSet(PAID_KEY);
        next.add(key);
        writeSet(PAID_KEY, PAID_EVENT, next);
        setLocal(next);
    }, []);

    const clearPaid = useCallback((key: PaymentKey) => {
        const next = readSet(PAID_KEY);
        next.delete(key);
        writeSet(PAID_KEY, PAID_EVENT, next);
        setLocal(next);
    }, []);

    // Sync purchased assessments from backend on mount so clearing
    // browser cache does not erase purchase history.
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            if (!HAS_TECH_API) return;
            const email = getActiveEmail();
            if (!email) {
                console.warn("[usePaidAssessments] No email found; skipping purchase sync.");
                return;
            }
            try {
                const { purchased, visible } = await getPurchasedAssessments(email);
                if (cancelled) return;
                const current = new Set<string>(purchased);
                const nextVisible = new Set<string>(
                    Array.isArray(visible) && visible.length > 0
                        ? visible
                        : DEFAULT_VISIBLE_ASSESSMENTS,
                );
                writeSet(PAID_KEY, PAID_EVENT, current);
                writeSet(VISIBLE_KEY, VISIBLE_EVENT, nextVisible);
                setLocal(current);
                setVisibleLocal(nextVisible);
                setIsEntitlementsReady(true);
                console.log("[usePaidAssessments] Synced purchases:", purchased);
            } catch (err: any) {
                if (isNetworkError(err)) return;
                console.error("[usePaidAssessments] Purchase sync failed:", err?.message || err);
            }
        };
        sync();

        const handleSessionReady = () => {
            if (!cancelled) sync();
        };
        window.addEventListener("originbi:session-ready", handleSessionReady);

        return () => {
            cancelled = true;
            window.removeEventListener("originbi:session-ready", handleSessionReady);
        };
    }, []);


    return {
        isPaid,
        isVisible,
        visibleAssessments: visibleSet,
        markPaid,
        clearPaid,
        refreshPurchases: hydrateFromBackend,
        isEntitlementsReady,
    };
}

export function useCompletedAssessments() {
    const { has, add, remove } = useKeyedSet(COMPLETED_KEY, COMPLETED_EVENT);

    // Sync completed assessments from backend on mount so clearing
    // browser cache does not erase completion history.
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            if (!HAS_TECH_API) return;
            const email = getActiveEmail();
            if (!email) {
                console.warn("[useCompletedAssessments] No email found; skipping completion sync.");
                return;
            }
            const modules: AssessmentId[] = ["aptitude", "communication", "mnc", "role"];
            const current = readSet(COMPLETED_KEY);
            const paid = readSet(PAID_KEY); // Get currently known purchases
            let changed = false;

            await Promise.all(
                modules.map(async (module) => {
                    // Optimization: Skip if not purchased to avoid 404 noise
                    if (!paid.has(module)) return;

                    try {
                        const submission = await getLatestSubmittedResult(module, email);
                        if (submission && !current.has(module)) {
                            current.add(module);
                            changed = true;
                        }
                    } catch (err: any) {
                        if (isNetworkError(err)) return;
                        // 404 means no submitted attempt — expected for incomplete assessments
                        if (err?.status !== 404 && err?.status !== 400) {
                            console.error(`[useCompletedAssessments] ${module} sync error:`, err?.message || err);
                        }
                    }
                }),
            );

            if (cancelled) return;
            if (changed) {
                writeSet(COMPLETED_KEY, COMPLETED_EVENT, current);
            }
            console.log("[useCompletedAssessments] Synced completed:", Array.from(current));
        };
        sync();

        const handleSessionReady = () => {
            if (!cancelled) sync();
        };
        window.addEventListener("originbi:session-ready", handleSessionReady);

        return () => {
            cancelled = true;
            window.removeEventListener("originbi:session-ready", handleSessionReady);
        };
    }, []);

    return { isCompleted: has, markCompleted: add, clearCompleted: remove };
}

export function PaymentProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
