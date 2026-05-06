"use client";

import React, { useMemo, useState } from "react";

export interface TreeFile {
    path: string;
    readOnly?: boolean;
}

interface FileTreeProps {
    files: TreeFile[];
    activePath: string;
    onOpen: (path: string) => void;
    theme: "dark" | "light";
}

interface FolderNode {
    type: "folder";
    name: string;
    path: string;
    children: TreeNode[];
}

interface FileLeaf {
    type: "file";
    name: string;
    path: string;
    readOnly?: boolean;
}

type TreeNode = FolderNode | FileLeaf;

const buildTree = (files: TreeFile[]): TreeNode[] => {
    const root: FolderNode = { type: "folder", name: "", path: "", children: [] };
    const byPath = new Map<string, FolderNode>();
    byPath.set("", root);

    for (const f of files) {
        const parts = f.path.split("/").filter(Boolean);
        let parentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
            const segment = parts[i];
            const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
            let folder = byPath.get(folderPath);
            if (!folder) {
                folder = { type: "folder", name: segment, path: folderPath, children: [] };
                byPath.set(folderPath, folder);
                byPath.get(parentPath)!.children.push(folder);
            }
            parentPath = folderPath;
        }
        const fileName = parts[parts.length - 1] ?? f.path;
        byPath.get(parentPath)!.children.push({
            type: "file",
            name: fileName,
            path: f.path,
            readOnly: f.readOnly,
        });
    }

    const sortRecursive = (node: FolderNode) => {
        node.children.sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        node.children.forEach((c) => {
            if (c.type === "folder") sortRecursive(c);
        });
    };
    sortRecursive(root);

    return root.children;
};

const ChevronIcon: React.FC<{ open: boolean; color: string }> = ({ open, color }) => (
    <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            flexShrink: 0,
        }}
    >
        <polyline points="9 6 15 12 9 18" />
    </svg>
);

const FolderIcon: React.FC<{ color: string }> = ({ color }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M3 6.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z" />
    </svg>
);

const FileIcon: React.FC<{ color: string; ext: string }> = ({ color, ext }) => (
    <span
        className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] font-mono text-[7.5px] font-bold"
        style={{ background: `${color}26`, color }}
    >
        {ext.slice(0, 2).toUpperCase() || "·"}
    </span>
);

const EXT_COLORS: Record<string, string> = {
    py: "#4AC6EA",
    js: "#FFB703",
    mjs: "#FFB703",
    ts: "#3178C6",
    java: "#ED2F34",
    cpp: "#5337BC",
    c: "#A8B9CC",
    h: "#A8B9CC",
    md: "#9CA8B0",
    json: "#FFB703",
};

interface NodeRowProps {
    node: TreeNode;
    depth: number;
    activePath: string;
    onOpen: (path: string) => void;
    theme: "dark" | "light";
    expanded: Record<string, boolean>;
    setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const NodeRow: React.FC<NodeRowProps> = ({
    node,
    depth,
    activePath,
    onOpen,
    theme,
    expanded,
    setExpanded,
}) => {
    const isLight = theme === "light";
    const muted = isLight ? "rgba(15,23,18,0.55)" : "rgba(255,255,255,0.55)";
    const text = isLight ? "rgba(15,23,18,0.85)" : "rgba(255,255,255,0.85)";
    const accentBg = isLight ? "rgba(30,211,106,0.14)" : "rgba(30,211,106,0.18)";
    const folderColor = isLight ? "#B5710F" : "#FFB703";

    if (node.type === "folder") {
        const isOpen = expanded[node.path] ?? true;
        return (
            <>
                <div
                    role="treeitem"
                    aria-expanded={isOpen}
                    onClick={() =>
                        setExpanded((s) => ({ ...s, [node.path]: !(s[node.path] ?? true) }))
                    }
                    className="flex cursor-pointer items-center gap-1.5 select-none"
                    style={{
                        paddingLeft: 6 + depth * 12,
                        paddingRight: 8,
                        paddingTop: 3,
                        paddingBottom: 3,
                        color: text,
                    }}
                >
                    <ChevronIcon open={isOpen} color={muted} />
                    <FolderIcon color={folderColor} />
                    <span className="text-[12px] font-semibold">{node.name}</span>
                </div>
                {isOpen &&
                    node.children.map((c) => (
                        <NodeRow
                            key={c.path}
                            node={c}
                            depth={depth + 1}
                            activePath={activePath}
                            onOpen={onOpen}
                            theme={theme}
                            expanded={expanded}
                            setExpanded={setExpanded}
                        />
                    ))}
            </>
        );
    }

    const ext = (node.name.split(".").pop() || "").toLowerCase();
    const color = EXT_COLORS[ext] || "#1ED36A";
    const isActive = node.path === activePath;
    return (
        <div
            role="treeitem"
            onClick={() => onOpen(node.path)}
            className="flex cursor-pointer items-center gap-1.5 select-none transition-colors"
            style={{
                paddingLeft: 6 + depth * 12 + 14,
                paddingRight: 8,
                paddingTop: 3,
                paddingBottom: 3,
                background: isActive ? accentBg : "transparent",
                color: isActive ? (isLight ? "#0FA255" : "#1ED36A") : text,
                fontWeight: isActive ? 700 : 500,
            }}
            onMouseEnter={(e) => {
                if (!isActive)
                    e.currentTarget.style.background = isLight
                        ? "rgba(15,23,18,0.04)"
                        : "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
            }}
        >
            <FileIcon color={color} ext={ext} />
            <span className="truncate text-[12px]">{node.name}</span>
            {node.readOnly && (
                <span
                    className="ml-auto rounded px-1 py-px text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(255,183,3,0.18)", color: "#B5710F" }}
                    title="Read-only"
                >
                    RO
                </span>
            )}
        </div>
    );
};

const FileTree: React.FC<FileTreeProps> = ({ files, activePath, onOpen, theme }) => {
    const tree = useMemo(() => buildTree(files), [files]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const isLight = theme === "light";
    const headerColor = isLight ? "rgba(15,23,18,0.5)" : "rgba(255,255,255,0.5)";
    const borderColor = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)";
    const bg = isLight ? "#F8FBF9" : "#0F1712";

    return (
        <div
            className="flex h-full flex-col overflow-hidden"
            style={{
                background: bg,
                borderLeft: `1px solid ${borderColor}`,
                width: 220,
            }}
        >
            <div
                className="flex h-8 flex-shrink-0 items-center px-3"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <span
                    className="text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: headerColor }}
                >
                    Files
                </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
                {tree.map((node) => (
                    <NodeRow
                        key={node.path}
                        node={node}
                        depth={0}
                        activePath={activePath}
                        onOpen={onOpen}
                        theme={theme}
                        expanded={expanded}
                        setExpanded={setExpanded}
                    />
                ))}
            </div>
        </div>
    );
};

export default FileTree;
