"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssessmentId } from "./exams";

const STORAGE_KEY = "originbi:paid-assessments";

export type PaymentKey = AssessmentId | `coding:${string}`;

const readPaid = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
        return new Set();
    } catch {
        return new Set();
    }
};

const writePaid = (set: Set<string>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent("originbi:paid-changed"));
};

export const codingPaymentKey = (languageId: string): PaymentKey =>
    `coding:${languageId}` as PaymentKey;

export function usePaidAssessments() {
    const [paid, setPaid] = useState<Set<string>>(() => readPaid());

    useEffect(() => {
        const sync = () => setPaid(readPaid());
        window.addEventListener("storage", sync);
        window.addEventListener("originbi:paid-changed", sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("originbi:paid-changed", sync);
        };
    }, []);

    const isPaid = useCallback(
        (key: PaymentKey) => paid.has(key),
        [paid],
    );

    const markPaid = useCallback((key: PaymentKey) => {
        const next = readPaid();
        next.add(key);
        writePaid(next);
        setPaid(next);
    }, []);

    const clearPaid = useCallback((key: PaymentKey) => {
        const next = readPaid();
        next.delete(key);
        writePaid(next);
        setPaid(next);
    }, []);

    return { isPaid, markPaid, clearPaid };
}
