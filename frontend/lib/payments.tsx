"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AssessmentId } from "./exams";
import { getActiveEmail, getPurchasedAssessments, getLatestSubmittedResult } from "./api";

export type PaymentKey = AssessmentId | `coding:${string}`;

export const codingPaymentKey = (languageId: string): PaymentKey =>
    `coding:${languageId}` as PaymentKey;

const PAID_KEY = "originbi:paid-assessments";
const PAID_EVENT = "originbi:paid-changed";
const COMPLETED_KEY = "originbi:completed-assessments";
const COMPLETED_EVENT = "originbi:completed-changed";

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
    const { has, add, remove } = useKeyedSet(PAID_KEY, PAID_EVENT);
    const refresh = useCallback(() => {
        window.dispatchEvent(new CustomEvent(PAID_EVENT));
    }, []);

    // Sync purchased assessments from backend on mount so clearing
    // browser cache does not erase purchase history.
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
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

    return { isPaid: has, markPaid: add, clearPaid: remove, refreshPurchases: refresh };
}

export function useCompletedAssessments() {
    const { has, add, remove } = useKeyedSet(COMPLETED_KEY, COMPLETED_EVENT);

    // Sync completed assessments from backend on mount so clearing
    // browser cache does not erase completion history.
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            const email = getActiveEmail();
            if (!email) {
                console.warn("[useCompletedAssessments] No email found; skipping completion sync.");
                return;
            }
            const modules: AssessmentId[] = ["aptitude", "communication", "mnc", "role"];
            const current = readSet(COMPLETED_KEY);
            let changed = false;

            await Promise.all(
                modules.map(async (module) => {
                    try {
                        await getLatestSubmittedResult(module, email);
                        if (!current.has(module)) {
                            current.add(module);
                            changed = true;
                        }
                    } catch (err: any) {
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
