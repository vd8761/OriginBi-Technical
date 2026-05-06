"use client";

import React from "react";

export interface FileTab {
    path: string;
    dirty?: boolean;
    readOnly?: boolean;
}

interface FileTabsProps {
    tabs: FileTab[];
    active: string;
    onActivate: (path: string) => void;
    onClose?: (path: string) => void;
    theme: "dark" | "light";
}

const baseName = (path: string) => {
    const idx = path.lastIndexOf("/");
    return idx >= 0 ? path.slice(idx + 1) : path;
};

const FileTabs: React.FC<FileTabsProps> = ({ tabs, active, onActivate, onClose, theme }) => {
    const isLight = theme === "light";
    const stripBg = isLight ? "rgba(15,23,18,0.04)" : "rgba(0,0,0,0.25)";
    const stripBorder = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)";

    return (
        <div
            className="flex flex-shrink-0 items-stretch overflow-x-auto"
            style={{
                background: stripBg,
                borderBottom: `1px solid ${stripBorder}`,
                minHeight: 32,
            }}
        >
            {tabs.map((t) => {
                const isActive = t.path === active;
                const tabBg = isActive
                    ? isLight
                        ? "#FFFFFF"
                        : "#111814"
                    : "transparent";
                const tabBorder = isActive
                    ? isLight
                        ? "rgba(15,23,18,0.1)"
                        : "rgba(255,255,255,0.08)"
                    : "transparent";
                const tabColor = isActive
                    ? isLight
                        ? "#0F1712"
                        : "#FFFFFF"
                    : isLight
                        ? "rgba(15,23,18,0.55)"
                        : "rgba(255,255,255,0.55)";
                return (
                    <div
                        key={t.path}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onActivate(t.path)}
                        className="group relative flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors"
                        style={{
                            background: tabBg,
                            borderRight: `1px solid ${stripBorder}`,
                            borderTop: `2px solid ${isActive ? "#1ED36A" : "transparent"}`,
                            borderLeft: `1px solid ${tabBorder}`,
                            color: tabColor,
                            fontWeight: isActive ? 700 : 500,
                        }}
                        title={t.path}
                    >
                        <FileGlyph path={t.path} active={isActive} />
                        <span className="select-none whitespace-nowrap">{baseName(t.path)}</span>
                        {t.readOnly && (
                            <span
                                className="ml-1 rounded px-1 py-px text-[8.5px] font-bold uppercase tracking-wider"
                                style={{
                                    background: "rgba(255,183,3,0.18)",
                                    color: "#B5710F",
                                }}
                                title="Read-only"
                            >
                                RO
                            </span>
                        )}
                        {t.dirty && (
                            <span
                                className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: isLight ? "#0FA255" : "#1ED36A" }}
                                title="Unsaved changes"
                            />
                        )}
                        {onClose && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(t.path);
                                }}
                                aria-label={`Close ${baseName(t.path)}`}
                                className="ml-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded text-[12px] leading-none transition-colors"
                                style={{
                                    color: tabColor,
                                    opacity: isActive ? 0.65 : 0,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = "1";
                                    e.currentTarget.style.background = isLight
                                        ? "rgba(15,23,18,0.08)"
                                        : "rgba(255,255,255,0.12)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = isActive ? "0.65" : "0";
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                );
            })}
            <div
                aria-hidden
                style={{ flex: 1, borderBottom: `1px solid ${stripBorder}` }}
            />
        </div>
    );
};

const EXT_COLORS: Record<string, string> = {
    py: "#4AC6EA",
    js: "#FFB703",
    mjs: "#FFB703",
    ts: "#3178C6",
    tsx: "#3178C6",
    jsx: "#FFB703",
    java: "#ED2F34",
    cpp: "#5337BC",
    c: "#A8B9CC",
    h: "#A8B9CC",
    md: "#9CA8B0",
    json: "#FFB703",
    yaml: "#9CA8B0",
    yml: "#9CA8B0",
};

const FileGlyph: React.FC<{ path: string; active: boolean }> = ({ path, active }) => {
    const ext = (path.split(".").pop() || "").toLowerCase();
    const color = EXT_COLORS[ext] || "#1ED36A";
    return (
        <span
            className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] font-mono text-[8px] font-bold"
            style={{
                background: active ? `${color}30` : `${color}1F`,
                color,
                letterSpacing: 0,
            }}
        >
            {ext.slice(0, 2).toUpperCase() || "·"}
        </span>
    );
};

export default FileTabs;
