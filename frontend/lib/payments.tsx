"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "./contexts/SessionContext";
import type { AssessmentId } from "./exams";

export type PaymentKey = AssessmentId | `coding:${string}`;

export const codingPaymentKey = (languageId: string): PaymentKey =>
    `coding:${languageId}` as PaymentKey;

const PAID_KEY = "originbi:paid-assessments";
const PAID_EVENT = "originbi:paid-changed";
const COMPLETED_KEY = "originbi:completed-assessments";
const COMPLETED_EVENT = "originbi:completed-changed";

// Helper functions for localStorage
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

interface PaymentContextType {
    paidKeys: Set<string>;
    completedKeys: Set<string>;
    isLoading: boolean;
    isPaid: (key: PaymentKey) => boolean;
    markPaid: (key: PaymentKey) => Promise<void>;
    clearPaid: (key: PaymentKey) => void;
    isCompleted: (key: PaymentKey) => boolean;
    markCompleted: (key: PaymentKey) => void;
    clearCompleted: (key: PaymentKey) => void;
    refreshPurchases: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoggedIn } = useSession();
    const [paidKeys, setPaidKeys] = useState<Set<string>>(() => readSet(PAID_KEY));
    const [completedKeys, setCompletedKeys] = useState<Set<string>>(() => readSet(COMPLETED_KEY));
    const [isLoading, setIsLoading] = useState(true);

    const refreshPurchases = useCallback(async () => {
        if (!isLoggedIn || !user?.email) {
            setIsLoading(false);
            return;
        }

        try {
            const TECH_API_URL = process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000";
            const res = await fetch(`${TECH_API_URL}/api/assessment/purchase/purchases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.purchased)) {
                    const localSet = readSet(PAID_KEY);
                    data.purchased.forEach((code: string) => {
                        if (code) localSet.add(code);
                    });
                    writeSet(PAID_KEY, PAID_EVENT, localSet);
                    setPaidKeys(localSet);
                }
            }
        } catch (err) {
            console.error("Error fetching purchases from backend:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn, user?.email]);

    useEffect(() => {
        refreshPurchases();
    }, [refreshPurchases]);

    useEffect(() => {
        const handlePaidStorage = () => setPaidKeys(readSet(PAID_KEY));
        const handleCompletedStorage = () => setCompletedKeys(readSet(COMPLETED_KEY));

        window.addEventListener("storage", handlePaidStorage);
        window.addEventListener("storage", handleCompletedStorage);
        window.addEventListener(PAID_EVENT, handlePaidStorage);
        window.addEventListener(COMPLETED_EVENT, handleCompletedStorage);

        return () => {
            window.removeEventListener("storage", handlePaidStorage);
            window.removeEventListener("storage", handleCompletedStorage);
            window.removeEventListener(PAID_EVENT, handlePaidStorage);
            window.removeEventListener(COMPLETED_EVENT, handleCompletedStorage);
        };
    }, []);

    const isPaid = useCallback((key: PaymentKey) => paidKeys.has(key), [paidKeys]);
    const isCompleted = useCallback((key: PaymentKey) => completedKeys.has(key), [completedKeys]);

    const markPaid = useCallback(async (key: PaymentKey) => {
        const next = readSet(PAID_KEY);
        next.add(key);
        writeSet(PAID_KEY, PAID_EVENT, next);
        setPaidKeys(next);
    }, []);

    const clearPaid = useCallback((key: PaymentKey) => {
        const next = readSet(PAID_KEY);
        next.delete(key);
        writeSet(PAID_KEY, PAID_EVENT, next);
        setPaidKeys(next);
    }, []);

    const markCompleted = useCallback((key: PaymentKey) => {
        const next = readSet(COMPLETED_KEY);
        next.add(key);
        writeSet(COMPLETED_KEY, COMPLETED_EVENT, next);
        setCompletedKeys(next);
    }, []);

    const clearCompleted = useCallback((key: PaymentKey) => {
        const next = readSet(COMPLETED_KEY);
        next.delete(key);
        writeSet(COMPLETED_KEY, COMPLETED_EVENT, next);
        setCompletedKeys(next);
    }, []);

    return (
        <PaymentContext.Provider
            value={{
                paidKeys,
                completedKeys,
                isLoading,
                isPaid,
                markPaid,
                clearPaid,
                isCompleted,
                markCompleted,
                clearCompleted,
                refreshPurchases,
            }}
        >
            {children}
        </PaymentContext.Provider>
    );
};

export function usePaidAssessments() {
    const context = useContext(PaymentContext);
    if (!context) {
        // Fallback for non-provider usage (backward compatibility)
        const [set, setLocal] = useState<Set<string>>(() => readSet(PAID_KEY));
        useEffect(() => {
            const sync = () => setLocal(readSet(PAID_KEY));
            window.addEventListener("storage", sync);
            window.addEventListener(PAID_EVENT, sync);
            return () => {
                window.removeEventListener("storage", sync);
                window.removeEventListener(PAID_EVENT, sync);
            };
        }, []);
        const has = useCallback((key: PaymentKey) => set.has(key), [set]);
        const add = useCallback(async (key: PaymentKey) => {
            const next = readSet(PAID_KEY);
            next.add(key);
            writeSet(PAID_KEY, PAID_EVENT, next);
            setLocal(next);
        }, []);
        const remove = useCallback((key: PaymentKey) => {
            const next = readSet(PAID_KEY);
            next.delete(key);
            writeSet(PAID_KEY, PAID_EVENT, next);
            setLocal(next);
        }, []);

        return { isPaid: has, markPaid: add, clearPaid: remove, isLoading: false, refreshPurchases: async () => {} };
    }
    return {
        isPaid: context.isPaid,
        markPaid: context.markPaid,
        clearPaid: context.clearPaid,
        isLoading: context.isLoading,
        refreshPurchases: context.refreshPurchases,
    };
}

export function useCompletedAssessments() {
    const context = useContext(PaymentContext);
    if (!context) {
        const [set, setLocal] = useState<Set<string>>(() => readSet(COMPLETED_KEY));
        useEffect(() => {
            const sync = () => setLocal(readSet(COMPLETED_KEY));
            window.addEventListener("storage", sync);
            window.addEventListener(COMPLETED_EVENT, sync);
            return () => {
                window.removeEventListener("storage", sync);
                window.removeEventListener(COMPLETED_EVENT, sync);
            };
        }, []);
        const has = useCallback((key: PaymentKey) => set.has(key), [set]);
        const add = useCallback((key: PaymentKey) => {
            const next = readSet(COMPLETED_KEY);
            next.add(key);
            writeSet(COMPLETED_KEY, COMPLETED_EVENT, next);
            setLocal(next);
        }, []);
        const remove = useCallback((key: PaymentKey) => {
            const next = readSet(COMPLETED_KEY);
            next.delete(key);
            writeSet(COMPLETED_KEY, COMPLETED_EVENT, next);
            setLocal(next);
        }, []);

        return { isCompleted: has, markCompleted: add, clearCompleted: remove };
    }
    return {
        isCompleted: context.isCompleted,
        markCompleted: context.markCompleted,
        clearCompleted: context.clearCompleted,
    };
}
