"use client";

import React from "react";

const formatTime = (secs: number) => {
    const safe = Math.max(0, secs);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) => {
    const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
    return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
};

const colorForRatio = (ratio: number) => {
    const r = Math.max(0, Math.min(1, ratio));
    const red: [number, number, number] = [237, 47, 52];
    const yellow: [number, number, number] = [255, 183, 3];
    const green: [number, number, number] = [30, 211, 106];
    if (r < 0.5) return lerpColor(red, yellow, r / 0.5);
    return lerpColor(yellow, green, (r - 0.5) / 0.5);
};

interface TimerDisplayProps {
    time: number;
    total: number;
    theme: "dark" | "light";
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
    time,
    total,
    theme,
}) => {
    const ratio = total > 0 ? Math.max(0, Math.min(1, time / total)) : 0;
    const critical = ratio < 0.08;
    const stroke = colorForRatio(ratio);
    const isLight = theme === "light";
    const trackColor = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.08)";

    const w = 112;
    const h = 36;
    const r = 18;
    const perim = 2 * (w + h) - 8 * r + 2 * Math.PI * r;

    return (
        <div
            className="relative flex h-9 items-center justify-center"
            style={{ width: w }}
        >
            <svg
                width={w}
                height={h}
                viewBox={`0 0 ${w} ${h}`}
                className="absolute inset-0"
                style={{ pointerEvents: "none" }}
            >
                <rect
                    x="1"
                    y="1"
                    width={w - 2}
                    height={h - 2}
                    rx={r - 1}
                    ry={r - 1}
                    fill={isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)"}
                    stroke={trackColor}
                    strokeWidth="1.5"
                />
                <rect
                    x="1"
                    y="1"
                    width={w - 2}
                    height={h - 2}
                    rx={r - 1}
                    ry={r - 1}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={perim}
                    strokeDashoffset={perim * (1 - ratio)}
                    style={{
                        transition: "stroke-dashoffset 1s linear, stroke 0.4s ease",
                        transformOrigin: "center",
                    }}
                />
            </svg>
            <span
                className={`relative text-[14px] font-extrabold leading-none tracking-tight tabular-nums ${critical ? "animate-pulse" : ""}`}
                style={{ color: stroke }}
            >
                {formatTime(time)}
            </span>
        </div>
    );
};

export default TimerDisplay;
