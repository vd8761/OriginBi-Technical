"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Construction, Eye, EyeOff } from "lucide-react";

interface Props {
    title: string;
    note?: string;
    dummy: ReactNode;
}

// UnderDevelopment wraps a page whose UI exists but isn't backed by a real
// API yet. By default the admin sees a clear "Under Development" card so the
// dummy data is never mistaken for live data. A "Show dummy preview" button
// reveals the mock UI on demand for design feedback. Toggle state is
// session-scoped per path — refresh holds the choice, navigating away resets.
export function UnderDevelopment({ title, note, dummy }: Props) {
    const pathname = usePathname();
    const storageKey = `originbi:admin:show-dummy:${pathname}`;
    const [showDummy, setShowDummy] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.sessionStorage.getItem(storageKey);
        if (stored === "true") setShowDummy(true);
    }, [storageKey]);

    const toggle = useCallback(
        (next: boolean) => {
            setShowDummy(next);
            if (typeof window !== "undefined") {
                if (next) window.sessionStorage.setItem(storageKey, "true");
                else window.sessionStorage.removeItem(storageKey);
            }
        },
        [storageKey],
    );

    if (showDummy) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                    className="admin-row"
                    style={{
                        gap: 12,
                        padding: "10px 14px",
                        borderRadius: "var(--admin-r-md)",
                        border: "1px solid rgba(255, 183, 3, 0.32)",
                        background: "var(--admin-amber-soft, rgba(255, 183, 3, 0.12))",
                        color: "var(--admin-amber, #ffb703)",
                        justifyContent: "space-between",
                    }}
                >
                    <div className="admin-row" style={{ gap: 8, fontSize: 12, fontWeight: 700 }}>
                        <Construction size={14} />
                        Dummy preview — not real data
                    </div>
                    <button
                        type="button"
                        onClick={() => toggle(false)}
                        className="admin-btn admin-btn-secondary"
                        style={{
                            minHeight: 30,
                            padding: "4px 10px",
                            fontSize: 11.5,
                        }}
                    >
                        <EyeOff size={12} /> Hide dummy
                    </button>
                </div>
                <div>{dummy}</div>
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: "60px 24px",
                textAlign: "center",
                border: "1px solid var(--admin-border-strong)",
                borderRadius: "var(--admin-r-xl)",
                background: "var(--admin-card)",
            }}
        >
            <div
                style={{
                    display: "grid",
                    placeItems: "center",
                    width: 56,
                    height: 56,
                    borderRadius: "var(--admin-r-lg)",
                    background: "var(--admin-amber-soft, rgba(255, 183, 3, 0.12))",
                    color: "var(--admin-amber, #ffb703)",
                }}
            >
                <Construction size={26} />
            </div>
            <div>
                <p
                    style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--admin-amber, #ffb703)",
                        margin: 0,
                    }}
                >
                    Under Development
                </p>
                <h2
                    className="admin-card-title"
                    style={{ fontSize: 22, marginTop: 6 }}
                >
                    {title}
                </h2>
                {note && (
                    <p
                        className="admin-card-subtitle"
                        style={{
                            marginTop: 8,
                            maxWidth: 540,
                            fontSize: 13,
                            lineHeight: 1.55,
                        }}
                    >
                        {note}
                    </p>
                )}
            </div>
            <button
                type="button"
                onClick={() => toggle(true)}
                className="admin-btn admin-btn-secondary"
            >
                <Eye size={14} /> Show dummy preview
            </button>
        </div>
    );
}
