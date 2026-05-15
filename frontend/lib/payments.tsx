"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AssessmentId } from "./exams";
import { listAssignments } from "./api";

export type PaymentKey = AssessmentId | `coding:${string}`;

export const codingPaymentKey = (languageId: string): PaymentKey =>
    `coding:${languageId}` as PaymentKey;

const PAID_KEY = "originbi:paid-assessments";
const PAID_EVENT = "originbi:paid-changed";
const COMPLETED_KEY = "originbi:completed-assessments";
const COMPLETED_EVENT = "originbi:completed-changed";
const LEGACY_TECH_API_URL =
    process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

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
    const [set, setLocal] = useState<Set<string>>(() => readSet(storageKey));

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
    const [set, setLocal] = useState<Set<string>>(() => readSet(PAID_KEY));

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

    return {
        isPaid,
        markPaid,
        clearPaid,
        refreshPurchases: hydrateFromBackend,
    };
}

export function useCompletedAssessments() {
    const { has, add, remove } = useKeyedSet(COMPLETED_KEY, COMPLETED_EVENT);
    return { isCompleted: has, markCompleted: add, clearCompleted: remove };
}

export function PaymentProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
