"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssessmentId } from "./exams";

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
    return { isPaid: has, markPaid: add, clearPaid: remove };
}

export function useCompletedAssessments() {
    const { has, add, remove } = useKeyedSet(COMPLETED_KEY, COMPLETED_EVENT);
    return { isCompleted: has, markCompleted: add, clearCompleted: remove };
}
