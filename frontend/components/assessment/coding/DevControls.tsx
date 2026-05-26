"use client";

import React, { useState } from "react";
import type { Question } from "./data";
import type { QStatus } from "./SubmitModal";
import type {
    ProctoringCounters,
    ProctoringSettings,
} from "./proctoring";

interface DevControlsProps {
    questions: Question[];
    currentQ: number;
    statuses: Record<number, QStatus>;
    timeRemaining: number;
    timerRunning: boolean;
    tabSwitches: number;
    fontSize: number;
    splitPct: number;
    saved: boolean;
    proctoringSettings: ProctoringSettings;
    proctoringCounters: ProctoringCounters;
    /** Editor feature toggles, surfaced for dev-mode override. */
    editorFindEnabled: boolean;
    editorSuggestionsEnabled: boolean;
    editorLintsEnabled: boolean;
    onJumpTo: (idx: number) => void;
    onSetStatus: (qId: number, status: QStatus) => void;
    onMarkAllSolved: () => void;
    onClearStatuses: () => void;
    onAddTime: (seconds: number) => void;
    onForceSubmit: () => void;
    onClearStorage: () => void;
    onTimerToggle: () => void;
    onClearTabSwitches: () => void;
    onFontSize: (n: number) => void;
    onSplitPct: (n: number) => void;
    onProctorSettingChange: <K extends keyof ProctoringSettings>(
        key: K,
        value: ProctoringSettings[K],
    ) => void;
    onProctorReset: () => void;
    onResetCounters: () => void;
    onRequestFullscreen: () => void;
    onExitFullscreen: () => void;
    onEditorFindToggle: (v: boolean) => void;
    onEditorSuggestionsToggle: (v: boolean) => void;
    onEditorLintsToggle: (v: boolean) => void;
}

const formatRemaining = (secs: number) => {
    const safe = Math.max(0, secs);
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col gap-2">
        <div
            className="text-[9.5px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--c-text-muted)" }}
        >
            {label}
        </div>
        {children}
    </div>
);

const Toggle: React.FC<{
    label: string;
    value: boolean;
    count?: number;
    onChange: (v: boolean) => void;
}> = ({ label, value, count, onChange }) => (
    <label
        className="dev-row flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5"
        style={{
            background: "var(--c-surface-raised)",
            border: "1px solid var(--c-border)",
        }}
    >
        <div className="flex min-w-0 items-center gap-1.5">
            <span
                className="truncate text-[10.5px] font-semibold"
                style={{ color: "var(--c-text-soft)" }}
            >
                {label}
            </span>
            {typeof count === "number" && count > 0 && (
                <span
                    className="rounded-full px-1.5 py-px font-mono text-[9px] font-bold"
                    style={{
                        background: "rgba(255,183,3,0.15)",
                        color: "#FFB703",
                    }}
                >
                    {count}
                </span>
            )}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className="relative h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors"
            style={{
                background: value ? "#1ED36A" : "var(--c-track-off)",
            }}
        >
            <span
                className="absolute top-0.5 h-3 w-3 rounded-full transition-all"
                style={{
                    left: value ? "calc(100% - 14px)" : "2px",
                    background: "var(--c-thumb)",
                    boxShadow: "0 1px 2px var(--c-thumb-shadow)",
                }}
            />
        </button>
    </label>
);

const Btn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    tone?: "default" | "danger" | "warn" | "ok";
}> = ({ onClick, children, tone = "default" }) => {
    const palette: Record<string, { bg: string; bgHover: string; color: string; border: string }> = {
        default: {
            bg: "var(--c-surface-raised)",
            bgHover: "var(--c-surface-raised-hover)",
            color: "var(--c-text-soft)",
            border: "var(--c-border-strong)",
        },
        danger: {
            bg: "rgba(237,47,52,0.12)",
            bgHover: "rgba(237,47,52,0.20)",
            color: "var(--c-danger)",
            border: "rgba(237,47,52,0.4)",
        },
        warn: {
            bg: "rgba(255,183,3,0.14)",
            bgHover: "rgba(255,183,3,0.22)",
            color: "var(--c-warn)",
            border: "rgba(255,183,3,0.45)",
        },
        ok: {
            bg: "rgba(30,211,106,0.14)",
            bgHover: "rgba(30,211,106,0.22)",
            color: "var(--c-ok)",
            border: "rgba(30,211,106,0.45)",
        },
    };
    const p = palette[tone] ?? palette.default;
    return (
        <button
            type="button"
            onClick={onClick}
            className="dev-btn cursor-pointer rounded-md px-2 py-1 text-[10.5px] font-bold transition-colors"
            style={{
                background: p.bg,
                color: p.color,
                border: `1px solid ${p.border}`,
                ["--dev-btn-hover-bg" as string]: p.bgHover,
            }}
        >
            {children}
        </button>
    );
};

const DevControls: React.FC<DevControlsProps> = (props) => {
    const [open, setOpen] = useState(false);
    const {
        questions,
        currentQ,
        statuses,
        timeRemaining,
        timerRunning,
        tabSwitches,
        fontSize,
        splitPct,
        saved,
        proctoringSettings,
        proctoringCounters,
        editorFindEnabled,
        editorSuggestionsEnabled,
        editorLintsEnabled,
        onEditorFindToggle,
        onEditorSuggestionsToggle,
        onEditorLintsToggle,
        onJumpTo,
        onSetStatus,
        onMarkAllSolved,
        onClearStatuses,
        onAddTime,
        onForceSubmit,
        onClearStorage,
        onTimerToggle,
        onClearTabSwitches,
        onFontSize,
        onSplitPct,
        onProctorSettingChange,
        onProctorReset,
        onResetCounters,
        onRequestFullscreen,
        onExitFullscreen,
    } = props;

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-3 right-3 z-[180] flex h-10 items-center gap-1.5 cursor-pointer rounded-full border border-[#FFB703]/40 bg-[#FFB703]/15 px-3 text-[11px] font-bold text-[#FFB703] backdrop-blur-md hover:bg-[#FFB703]/25"
                title="Open dev controls"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFB703] animate-pulse-soft" />
                DEV
            </button>
        );
    }

    const currentQuestion = questions[currentQ];
    const counts = {
        solved: Object.values(statuses).filter((s) => s === "solved").length,
        flagged: Object.values(statuses).filter((s) => s === "flagged").length,
        attempted: Object.values(statuses).filter((s) => s === "attempted").length,
    };

    return (
        <div
            className="fixed bottom-3 right-3 z-[180] flex max-h-[80vh] w-[300px] flex-col overflow-hidden rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            style={{
                background: "color-mix(in srgb, var(--c-card) 95%, transparent)",
                border: "1px solid rgba(255,183,3,0.35)",
                color: "var(--c-text)",
            }}
        >
            <div
                className="flex items-center justify-between px-3 py-2.5"
                style={{ borderBottom: "1px solid var(--c-border)" }}
            >
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFB703] animate-pulse-soft" />
                    <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--c-warn)" }}
                    >
                        Dev Controls
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="cursor-pointer border-0 bg-transparent text-[14px] leading-none transition-colors"
                    style={{ color: "var(--c-text-muted)" }}
                >
                    ✕
                </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-3">
                {/* Live state */}
                <Section label="Live state">
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
                        {[
                            ["currentQ", `${currentQ + 1} / ${questions.length}`, "var(--c-text)"],
                            [
                                "qStatus",
                                currentQuestion ? statuses[currentQuestion.id] ?? "unattempted" : "—",
                                "var(--c-text)",
                            ],
                            [
                                "timer",
                                `${formatRemaining(timeRemaining)} ${timerRunning ? "▶" : "⏸"}`,
                                "var(--c-text)",
                            ],
                            ["tab switches", String(tabSwitches), "var(--c-text)"],
                            ["solved", String(counts.solved), "var(--c-ok)"],
                            ["flagged", String(counts.flagged), "var(--c-warn)"],
                            ["attempted", String(counts.attempted), "#4AC6EA"],
                            [
                                "saved",
                                saved ? "true" : "saving…",
                                saved ? "var(--c-ok)" : "var(--c-text-muted)",
                            ],
                        ].map(([k, v, vc]) => (
                            <div
                                key={k}
                                className="rounded px-2 py-1.5"
                                style={{
                                    background: "var(--c-surface-raised)",
                                    border: "1px solid var(--c-border)",
                                }}
                            >
                                <div style={{ color: "var(--c-text-muted)" }}>{k}</div>
                                <div style={{ color: vc }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Question status */}
                <Section label="This question">
                    <div className="flex flex-wrap gap-1">
                        {(["unattempted", "attempted", "solved", "flagged"] as QStatus[]).map((s) => (
                            <Btn
                                key={s}
                                onClick={() => currentQuestion && onSetStatus(currentQuestion.id, s)}
                                tone={
                                    s === "solved"
                                        ? "ok"
                                        : s === "flagged"
                                            ? "warn"
                                            : s === "attempted"
                                                ? "default"
                                                : "default"
                                }
                            >
                                set {s}
                            </Btn>
                        ))}
                    </div>
                </Section>

                {/* Bulk */}
                <Section label="Bulk actions">
                    <div className="flex flex-wrap gap-1">
                        <Btn onClick={onMarkAllSolved} tone="ok">mark all solved</Btn>
                        <Btn onClick={onClearStatuses} tone="warn">clear statuses</Btn>
                        <Btn onClick={onForceSubmit} tone="danger">force submit</Btn>
                    </div>
                </Section>

                {/* Navigation */}
                <Section label="Jump to question">
                    <div className="grid grid-cols-5 gap-1">
                        {questions.map((q, i) => (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => onJumpTo(i)}
                                className="cursor-pointer rounded px-1 py-1 font-mono text-[10px] font-bold transition-colors"
                                style={
                                    i === currentQ
                                        ? {
                                            background: "rgba(30,211,106,0.15)",
                                            color: "var(--c-ok)",
                                            border: "1px solid #1ED36A",
                                        }
                                        : {
                                            background: "var(--c-surface-raised)",
                                            color: "var(--c-text-soft)",
                                            border: "1px solid var(--c-border)",
                                        }
                                }
                            >
                                {String(q.id).padStart(2, "0")}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Timer */}
                <Section label="Timer">
                    <div className="flex flex-wrap gap-1">
                        <Btn onClick={onTimerToggle}>{timerRunning ? "pause" : "resume"}</Btn>
                        <Btn onClick={() => onAddTime(60)}>+1 min</Btn>
                        <Btn onClick={() => onAddTime(300)}>+5 min</Btn>
                        <Btn onClick={() => onAddTime(-60)}>−1 min</Btn>
                        <Btn onClick={() => onAddTime(-(timeRemaining - 30))} tone="warn">
                            set 30s
                        </Btn>
                        <Btn onClick={() => onAddTime(-timeRemaining)} tone="danger">
                            zero
                        </Btn>
                    </div>
                </Section>

                {/* Proctoring */}
                <Section label="Proctoring">
                    <div className="flex flex-col gap-1">
                        <Toggle
                            label="Tab switch monitor"
                            value={proctoringSettings.tabSwitch}
                            count={tabSwitches}
                            onChange={(v) => onProctorSettingChange("tabSwitch", v)}
                        />
                        <Toggle
                            label="Tab switch toast"
                            value={proctoringSettings.tabSwitchToast}
                            onChange={(v) => onProctorSettingChange("tabSwitchToast", v)}
                        />
                        <Toggle
                            label="Block right-click"
                            value={proctoringSettings.blockRightClick}
                            count={proctoringCounters.rightClick}
                            onChange={(v) => onProctorSettingChange("blockRightClick", v)}
                        />
                        <Toggle
                            label="Block copy / paste"
                            value={proctoringSettings.blockCopyPaste}
                            count={proctoringCounters.copyPaste}
                            onChange={(v) => onProctorSettingChange("blockCopyPaste", v)}
                        />
                        <Toggle
                            label="Detect mouse leave"
                            value={proctoringSettings.detectMouseLeave}
                            count={proctoringCounters.mouseLeave}
                            onChange={(v) => onProctorSettingChange("detectMouseLeave", v)}
                        />
                        <Toggle
                            label="Detect fullscreen exit"
                            value={proctoringSettings.detectFullscreenExit}
                            count={proctoringCounters.fullscreenExit}
                            onChange={(v) => onProctorSettingChange("detectFullscreenExit", v)}
                        />
                        <Toggle
                            label="Camera / mic prompt"
                            value={proctoringSettings.requireCameraMic}
                            onChange={(v) => onProctorSettingChange("requireCameraMic", v)}
                        />
                        <Toggle
                            label="Detect focus loss"
                            value={proctoringSettings.detectFocusLoss}
                            count={proctoringCounters.focusLost}
                            onChange={(v) => onProctorSettingChange("detectFocusLoss", v)}
                        />
                        <Toggle
                            label="Detect devtools"
                            value={proctoringSettings.detectDevtools}
                            count={proctoringCounters.devtoolsOpen}
                            onChange={(v) => onProctorSettingChange("detectDevtools", v)}
                        />
                        <Toggle
                            label="Log keypress"
                            value={proctoringSettings.logKeypress}
                            count={proctoringCounters.keypress}
                            onChange={(v) => onProctorSettingChange("logKeypress", v)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <Btn onClick={onRequestFullscreen}>request fullscreen</Btn>
                        <Btn onClick={onExitFullscreen}>exit fullscreen</Btn>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <Btn onClick={onClearTabSwitches}>reset tab switches</Btn>
                        <Btn onClick={onResetCounters}>reset counters</Btn>
                        <Btn onClick={onProctorReset} tone="warn">
                            reset settings
                        </Btn>
                    </div>
                </Section>

                {/* Editor — Monaco-feature toggles surfaced for dev override. */}
                <Section label="Editor">
                    <div className="flex flex-col gap-1">
                        <Toggle
                            label="Find & Replace"
                            value={editorFindEnabled}
                            onChange={onEditorFindToggle}
                        />
                        <Toggle
                            label="Suggestions / IntelliSense"
                            value={editorSuggestionsEnabled}
                            onChange={onEditorSuggestionsToggle}
                        />
                        <Toggle
                            label="Lints / squiggles"
                            value={editorLintsEnabled}
                            onChange={onEditorLintsToggle}
                        />
                    </div>
                </Section>

                {/* Layout */}
                <Section label="Layout">
                    <label
                        className="flex flex-col gap-1 text-[10.5px]"
                        style={{ color: "var(--c-text-soft)" }}
                    >
                        <div className="flex justify-between">
                            <span>fontSize</span>
                            <span className="font-mono" style={{ color: "var(--c-text)" }}>
                                {fontSize}px
                            </span>
                        </div>
                        <input
                            type="range"
                            min={11}
                            max={20}
                            step={1}
                            value={fontSize}
                            onChange={(e) => onFontSize(parseInt(e.target.value, 10))}
                            className="w-full accent-[#1ED36A]"
                        />
                    </label>
                    <label
                        className="flex flex-col gap-1 text-[10.5px]"
                        style={{ color: "var(--c-text-soft)" }}
                    >
                        <div className="flex justify-between">
                            <span>splitPct</span>
                            <span className="font-mono" style={{ color: "var(--c-text)" }}>
                                {splitPct}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={28}
                            max={65}
                            step={1}
                            value={splitPct}
                            onChange={(e) => onSplitPct(parseInt(e.target.value, 10))}
                            className="w-full accent-[#1ED36A]"
                        />
                    </label>
                </Section>

                {/* Storage */}
                <Section label="Storage">
                    <Btn onClick={onClearStorage} tone="danger">
                        clear ob_* keys
                    </Btn>
                </Section>
            </div>
        </div>
    );
};

export default DevControls;
