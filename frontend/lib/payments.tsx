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
const COMPLETED_KEY = "originbi:completed-assessments";
const COMPLETED_EVENT = "originbi:completed-changed";
const LEGACY_TECH_API_URL = TECH_API_BASE;

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

const fetchServerPaidSet = async (): Promise<Set<string>> => {
    const paid = new Set<string>();

    const email = resolveCurrentEmail();
    if (email) {
        try {
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

    return paid;
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

    const syncFromStorage = useCallback(() => {
        setLocal(readSet(PAID_KEY));
    }, []);

    const hydrateFromBackend = useCallback(async () => {
        const next = readSet(PAID_KEY);
        const serverPaid = await fetchServerPaidSet();
        serverPaid.forEach((key) => next.add(key));
        writeSet(PAID_KEY, PAID_EVENT, next);
        setLocal(next);
    }, []);

    useEffect(() => {
        const id = window.setTimeout(() => {
            syncFromStorage();
            void hydrateFromBackend();
        }, 0);
        window.addEventListener("storage", syncFromStorage);
        window.addEventListener(PAID_EVENT, syncFromStorage);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener("storage", syncFromStorage);
            window.removeEventListener(PAID_EVENT, syncFromStorage);
        };
    }, [hydrateFromBackend, syncFromStorage]);

    const isPaid = useCallback((key: PaymentKey) => set.has(key), [set]);

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
                const { purchased } = await getPurchasedAssessments(email);
                if (cancelled) return;
                const current = readSet(PAID_KEY);
                let changed = false;
                for (const code of purchased) {
                    if (!current.has(code)) {
                        current.add(code);
                        changed = true;
                    }
                }
                if (changed) {
                    writeSet(PAID_KEY, PAID_EVENT, current);
                }
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
        markPaid,
        clearPaid,
        refreshPurchases: hydrateFromBackend,
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
