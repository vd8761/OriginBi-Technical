"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    dragAndDropFeature,
    hotkeysCoreFeature,
    keyboardDragAndDropFeature,
    selectionFeature,
    syncDataLoaderFeature,
    type ItemInstance,
} from "@headless-tree/core";
import { AssistiveTreeDescription, useTree } from "@headless-tree/react";
import {
    ChevronRight,
    Copy,
    FilePlus,
    Folder,
    FolderOpen,
    FolderPlus,
    PencilLine,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { Tree, TreeItem, TreeItemLabel } from "@/components/ui/tree";
import SetiFileIcon from "./SetiFileIcon";
import type { FileNode } from "./data";

const ROOT_ID = "__root__";
const WORKSPACE_LABEL = "Workspace";

interface TreeData {
    name: string;
    isFolder: boolean;
    children?: string[];
    fileExtension?: string;
    readOnly?: boolean;
    /** True for paths that exist only as folder containers — not in the original FileNode list. */
    derived?: boolean;
}

interface FileTreePanelProps {
    files: FileNode[];
    activePath: string;
    theme: "dark" | "light";
    onOpen: (path: string) => void;
    onFilesChange: (files: FileNode[]) => void;
    onPathRename?: (oldPath: string, newPath: string) => void;
    onPathDelete?: (path: string) => void;
}

const dirOf = (p: string) => {
    const i = p.lastIndexOf("/");
    return i < 0 ? "" : p.slice(0, i);
};

const baseOf = (p: string) => {
    const i = p.lastIndexOf("/");
    return i < 0 ? p : p.slice(i + 1);
};

const extOf = (name: string) => {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
};

/** Build the headless-tree records from a flat file list. Folders are derived from path segments. */
const buildItems = (files: FileNode[]): Record<string, TreeData> => {
    const items: Record<string, TreeData> = {
        [ROOT_ID]: {
            name: WORKSPACE_LABEL,
            isFolder: true,
            children: [],
        },
    };

    const ensureFolder = (folderPath: string): string => {
        if (folderPath === "") return ROOT_ID;
        if (items[folderPath]) return folderPath;

        const parent = dirOf(folderPath);
        const parentId = ensureFolder(parent);
        items[folderPath] = {
            name: baseOf(folderPath),
            isFolder: true,
            children: [],
            derived: true,
        };
        items[parentId].children = items[parentId].children ?? [];
        if (!items[parentId].children!.includes(folderPath)) {
            items[parentId].children!.push(folderPath);
        }
        return folderPath;
    };

    for (const f of files) {
        const parentPath = dirOf(f.path);
        const parentId = ensureFolder(parentPath);
        items[f.path] = {
            name: baseOf(f.path),
            isFolder: false,
            fileExtension: extOf(f.path),
            readOnly: f.readOnly,
        };
        items[parentId].children = items[parentId].children ?? [];
        if (!items[parentId].children!.includes(f.path)) {
            items[parentId].children!.push(f.path);
        }
    }

    // Sort each folder's children: folders first, then files, alphabetically.
    Object.values(items).forEach((it) => {
        if (it.children && it.children.length > 0) {
            it.children.sort((a, b) => {
                const ai = items[a];
                const bi = items[b];
                if (ai.isFolder !== bi.isFolder) return ai.isFolder ? -1 : 1;
                return ai.name.localeCompare(bi.name);
            });
        }
    });

    return items;
};

interface ContextMenuState {
    open: boolean;
    x: number;
    y: number;
    path: string;
    isFolder: boolean;
    readOnly: boolean;
}

const FileTreePanel: React.FC<FileTreePanelProps> = ({
    files,
    activePath,
    theme,
    onOpen,
    onFilesChange,
    onPathRename,
    onPathDelete,
}) => {
    const items = useMemo(() => buildItems(files), [files]);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const itemsVersion = useMemo(() => Object.keys(items).join("|"), [items]);

    const [search, setSearch] = useState("");
    const [renaming, setRenaming] = useState<{ path: string; draft: string } | null>(null);
    const [creating, setCreating] = useState<
        | { parent: string; kind: "file" | "folder"; draft: string }
        | null
    >(null);
    const [menu, setMenu] = useState<ContextMenuState | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const isLight = theme === "light";

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), 1600);
    }, []);

    const closeMenu = useCallback(() => setMenu(null), []);

    useEffect(() => {
        if (!menu) return;
        const onClick = () => closeMenu();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeMenu();
        };
        window.addEventListener("click", onClick);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", onClick);
            window.removeEventListener("keydown", onKey);
        };
    }, [menu, closeMenu]);

    const onOpenRef = useRef(onOpen);
    onOpenRef.current = onOpen;

    // Ref to the tree instance so we can call rebuildTree() synchronously from onDrop.
    const treeInstanceRef = useRef<ReturnType<typeof useTree<TreeData>> | null>(null);

    // Build a synthetic `items` map mutable enough to feed the headless-tree.
    // Tree data is read from `itemsRef.current` so we can mutate via setFiles -> rebuild.
    const tree = useTree<TreeData>({
        rootItemId: ROOT_ID,
        getItemName: (it) => it.getItemData()?.name ?? "(unknown)",
        isItemFolder: (it) => it.getItemData()?.isFolder ?? false,
        canReorder: true,
        initialState: {
            expandedItems: Object.entries(items)
                .filter(([, v]) => v.isFolder)
                .map(([k]) => k),
        },
        indent: 14,
        dataLoader: {
            getItem: (itemId) => itemsRef.current[itemId],
            getChildren: (itemId) => itemsRef.current[itemId]?.children ?? [],
        },
        onPrimaryAction: (item) => {
            const id = item.getId();
            const data = itemsRef.current[id];
            if (!data || data.isFolder) return;
            if (data.name === ".keep") return;
            onOpenRef.current(id);
        },
        onDrop: (draggedItems, target) => {
            // Determine the target folder from the drop target.
            const targetItem = target.item;
            const targetId = targetItem.getId();
            const targetData = itemsRef.current[targetId];

            // Resolve the actual parent folder path we're dropping into.
            let parentPath: string;
            if ("childIndex" in target) {
                // Ordered drop (between items) — targetItem IS the parent folder.
                parentPath = targetId === ROOT_ID ? "" : targetId;
            } else {
                // Unordered drop (onto an item) — if it's a folder drop into it, otherwise into its parent.
                if (targetData?.isFolder) {
                    parentPath = targetId === ROOT_ID ? "" : targetId;
                } else {
                    parentPath = dirOf(targetId);
                }
            }

            // Build moves for each dragged item (file or folder).
            const moves: { from: string; to: string }[] = [];
            for (const draggedItem of draggedItems) {
                const oldPath = draggedItem.getId();
                if (oldPath === ROOT_ID) continue;
                const data = itemsRef.current[oldPath];
                if (!data) continue;

                const newPath = parentPath ? `${parentPath}/${data.name}` : data.name;
                if (oldPath === newPath) continue;

                // Prevent circular moves: don't drop a folder into itself or its descendants.
                if (data.isFolder && (parentPath === oldPath || parentPath.startsWith(`${oldPath}/`))) {
                    continue;
                }

                // Prevent dropping onto the same parent (no-op).
                if (dirOf(oldPath) === parentPath) continue;

                moves.push({ from: oldPath, to: newPath });
            }

            if (moves.length === 0) return;

            // Apply moves to the flat file list (handles nested files inside moved folders).
            const next = files.map((f) => {
                const move = moves.find(
                    (m) => f.path === m.from || f.path.startsWith(`${m.from}/`),
                );
                if (!move) return f;
                const suffix = f.path.slice(move.from.length);
                return { ...f, path: `${move.to}${suffix}` };
            });

            // Synchronously update itemsRef so the data loader returns valid data
            // when headless-tree rebuilds internally before the React state update.
            // IMPORTANT: Merge old items INTO the new map. After our handler returns,
            // the tree library calls `draggedItems[0].setFocused()` using the OLD
            // item ID. If old IDs are gone from the data loader, getItemData()
            // returns undefined and the tree crashes. Keeping stale entries is safe
            // because the next render will run buildItems(next) via useMemo and
            // replace itemsRef.current with a clean map.
            const newItems = buildItems(next);
            itemsRef.current = { ...itemsRef.current, ...newItems };

            // Rebuild the tree's internal structure NOW so the next render sees
            // consistent data — new parent-child relationships from the data loader.
            if (typeof treeInstanceRef.current?.rebuildTree === "function") {
                treeInstanceRef.current.rebuildTree();
            }

            moves.forEach((m) => onPathRename?.(m.from, m.to));
            onFilesChange(next);
        },
        features: [
            syncDataLoaderFeature,
            selectionFeature,
            hotkeysCoreFeature,
            dragAndDropFeature,
            keyboardDragAndDropFeature,
        ],
    });

    // Keep ref in sync so onDrop (defined above) can call tree.rebuildTree().
    treeInstanceRef.current = tree;

    // headless-tree caches its tree structure internally — calling rebuildTree() picks up new
    // items/children from the dataLoader so creates, renames and deletes show up immediately.
    useEffect(() => {
        if (typeof tree?.rebuildTree === "function") {
            tree.rebuildTree();
        }
    }, [itemsVersion, tree]);

    // Apply search match using item-level data, since headless-tree's setSearch is part of optional features.
    const lowerSearch = search.trim().toLowerCase();
    const matchesSearch = (path: string): boolean => {
        if (!lowerSearch) return false;
        return path.toLowerCase().includes(lowerSearch);
    };
    // Also collapse folders that have no matching descendants when searching, expand the ones that do.
    useEffect(() => {
        if (!lowerSearch) return;
        // Auto-expand folders containing matches
        Object.entries(itemsRef.current).forEach(([id, data]) => {
            if (!data.isFolder) return;
            const hasMatch = Object.keys(itemsRef.current).some(
                (k) => k.startsWith(`${id}/`) && matchesSearch(k),
            );
            if (hasMatch) {
                const item = tree.getItemInstance(id);
                if (item && !item.isExpanded()) item.expand();
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lowerSearch]);

    /* ──────────────── File operations ──────────────── */

    const isPathTaken = (path: string) =>
        files.some((f) => f.path === path) || itemsRef.current[path] !== undefined;

    const createFile = useCallback(
        (parentFolder: string, name: string) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const path = parentFolder ? `${parentFolder}/${trimmed}` : trimmed;
            if (isPathTaken(path)) {
                showToast(`"${path}" already exists`);
                return;
            }
            onFilesChange([...files, { path, content: "" }]);
            onOpen(path);
            showToast(`Created ${path}`);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [files, onFilesChange, onOpen, showToast],
    );

    const createFolder = useCallback(
        (parentFolder: string, name: string) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const path = parentFolder ? `${parentFolder}/${trimmed}` : trimmed;
            // Folders only exist as derived containers — add a placeholder hidden file so tree shows it.
            // To create a true empty folder, we add an .gitkeep-style placeholder we hide from UI? Simpler: just open creation prompt with a placeholder file inside.
            // We'll create a `<folder>/.keep` empty file so the folder appears.
            const keep = `${path}/.keep`;
            if (isPathTaken(keep)) {
                showToast(`"${path}" already exists`);
                return;
            }
            onFilesChange([...files, { path: keep, content: "", readOnly: true }]);
            showToast(`Created folder ${path}`);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [files, onFilesChange, showToast],
    );

    const deletePath = useCallback(
        (path: string) => {
            const data = itemsRef.current[path];
            if (!data) return;
            let remaining: FileNode[];
            if (data.isFolder) {
                const prefix = path === ROOT_ID ? "" : `${path}/`;
                remaining = files.filter(
                    (f) => f.path !== path && !f.path.startsWith(prefix),
                );
                files.forEach((f) => {
                    if (f.path === path || f.path.startsWith(prefix)) onPathDelete?.(f.path);
                });
            } else {
                remaining = files.filter((f) => f.path !== path);
                onPathDelete?.(path);
            }

            // Synchronously update itemsRef — keep old items resolvable so
            // the tree library doesn't crash when referencing stale IDs
            // (e.g. focused item) during the transition.
            const newItems = buildItems(remaining);
            itemsRef.current = { ...itemsRef.current, ...newItems };

            if (typeof treeInstanceRef.current?.rebuildTree === "function") {
                treeInstanceRef.current.rebuildTree();
            }

            onFilesChange(remaining);
            showToast(`Deleted ${path}`);
        },
        [files, onFilesChange, onPathDelete, showToast],
    );

    const renamePath = useCallback(
        (oldPath: string, newName: string) => {
            const trimmed = newName.trim();
            if (!trimmed || trimmed === baseOf(oldPath)) return;
            const parent = dirOf(oldPath);
            const newPath = parent ? `${parent}/${trimmed}` : trimmed;
            if (newPath === oldPath) return;
            if (isPathTaken(newPath)) {
                showToast(`"${newPath}" already exists`);
                return;
            }
            const data = itemsRef.current[oldPath];
            const isFolder = data?.isFolder ?? false;
            let next: FileNode[];
            if (isFolder) {
                const prefix = `${oldPath}/`;
                next = files.map((f) =>
                    f.path === oldPath
                        ? { ...f, path: newPath }
                        : f.path.startsWith(prefix)
                            ? { ...f, path: `${newPath}/${f.path.slice(prefix.length)}` }
                            : f,
                );
                files.forEach((f) => {
                    if (f.path === oldPath) onPathRename?.(oldPath, newPath);
                    else if (f.path.startsWith(prefix)) {
                        onPathRename?.(f.path, `${newPath}/${f.path.slice(prefix.length)}`);
                    }
                });
            } else {
                next = files.map((f) => (f.path === oldPath ? { ...f, path: newPath } : f));
                onPathRename?.(oldPath, newPath);
            }

            // Synchronously update itemsRef so the data loader keeps old IDs
            // resolvable while the tree transitions. Same pattern as onDrop —
            // the tree library may still reference the old path internally
            // (e.g. via focused item) before the React re-render replaces the map.
            const newItems = buildItems(next);
            itemsRef.current = { ...itemsRef.current, ...newItems };

            if (typeof treeInstanceRef.current?.rebuildTree === "function") {
                treeInstanceRef.current.rebuildTree();
            }

            onFilesChange(next);
            showToast(`Renamed to ${newPath}`);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [files, onFilesChange, onPathRename, showToast],
    );

    const copyToClipboard = useCallback(
        async (text: string, label: string) => {
            try {
                await navigator.clipboard.writeText(text);
                showToast(`${label} copied`);
            } catch {
                showToast("Copy failed");
            }
        },
        [showToast],
    );

    /* ──────────────── Keyboard shortcuts ──────────────── */

    const treeRef = useRef<HTMLDivElement | null>(null);

    const focusedPath = useCallback(() => {
        const focused = tree.getFocusedItem?.();
        return focused?.getId() ?? activePath;
    }, [tree, activePath]);

    useEffect(() => {
        const node = treeRef.current;
        if (!node) return;
        const onKey = (e: KeyboardEvent) => {
            if (renaming || creating) return;
            const path = focusedPath();
            const data = itemsRef.current[path];
            if (!data || path === ROOT_ID) return;
            if (e.key === "F2") {
                e.preventDefault();
                if (!data.readOnly) setRenaming({ path, draft: data.name });
            } else if (e.key === "Delete" || e.key === "Backspace") {
                if (data.readOnly) return;
                e.preventDefault();
                deletePath(path);
            }
        };
        node.addEventListener("keydown", onKey);
        return () => node.removeEventListener("keydown", onKey);
    }, [renaming, creating, focusedPath, deletePath]);

    /* ──────────────── Toolbar handlers ──────────────── */

    const startCreate = (kind: "file" | "folder", parentPathOverride?: string) => {
        const parent =
            parentPathOverride !== undefined
                ? parentPathOverride
                : (() => {
                    const path = focusedPath();
                    const data = itemsRef.current[path];
                    if (!data) return "";
                    if (path === ROOT_ID) return "";
                    return data.isFolder ? path : dirOf(path);
                })();

        if (parent && parent !== "") {
            const it = tree.getItemInstance(parent);
            if (it && !it.isExpanded()) it.expand();
        }
        setCreating({ parent, kind, draft: kind === "file" ? "untitled.txt" : "new-folder" });
    };

    /* ──────────────── Theme tokens injected onto tree wrapper ──────────────── */

    const wrapperVars = useMemo(
        () =>
            ({
                "--tree-hover": isLight ? "rgba(15,23,18,0.06)" : "rgba(255,255,255,0.06)",
                "--tree-selected": "rgba(30,211,106,0.18)",
                "--tree-selected-fg": isLight ? "#0FA255" : "#1ED36A",
                "--tree-match": isLight
                    ? "rgba(255,183,3,0.20)"
                    : "rgba(255,183,3,0.18)",
                "--border": isLight
                    ? "rgba(15,23,18,0.08)"
                    : "rgba(255,255,255,0.06)",
            }) as React.CSSProperties,
        [isLight],
    );

    const headerColor = isLight ? "rgba(15,23,18,0.5)" : "rgba(255,255,255,0.5)";
    const borderColor = isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.06)";
    const subtleText = isLight ? "rgba(15,23,18,0.65)" : "rgba(255,255,255,0.7)";
    const inputBg = isLight ? "#FFFFFF" : "rgba(255,255,255,0.04)";
    const bg = isLight ? "#F8FBF9" : "#0F1712";

    /* ──────────────── Rendering tree items ──────────────── */

    const renderItem = (item: ItemInstance<TreeData>) => {
        const id = item.getId();
        if (id === ROOT_ID) return null;
        const data = item.getItemData();
        if (!data) return null;
        // Hide .keep placeholder files
        if (!data.isFolder && data.name === ".keep") return null;

        const matched = matchesSearch(id);
        const isRenaming = renaming?.path === id;

        return (
            <TreeItem
                key={id}
                item={item}
                className="pb-0!"
                onContextMenu={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenu({
                        open: true,
                        x: e.clientX,
                        y: e.clientY,
                        path: id,
                        isFolder: data.isFolder,
                        readOnly: data.readOnly ?? false,
                    });
                }}
                onDoubleClick={(e: React.MouseEvent) => {
                    if (data.readOnly || data.isFolder) return;
                    e.stopPropagation();
                    setRenaming({ path: id, draft: data.name });
                }}
                data-search-match={matched ? true : undefined}
                data-selected={id === activePath ? true : undefined}
            >
                <TreeItemLabel
                    className="rounded-sm py-0.5"
                    style={{ paddingInlineStart: data.isFolder ? undefined : 22 }}
                >
                    <span className="flex w-full items-center gap-1.5 min-w-0">
                        {!data.isFolder && (
                            <FileGlyph ext={data.fileExtension ?? ""} filename={data.name} />
                        )}
                        {data.isFolder && (
                            <FolderGlyph isOpen={item.isExpanded()} />
                        )}
                        {isRenaming ? (
                            <input
                                autoFocus
                                value={renaming!.draft}
                                onChange={(e) =>
                                    setRenaming((r) => (r ? { ...r, draft: e.target.value } : r))
                                }
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => {
                                    renamePath(renaming!.path, renaming!.draft);
                                    setRenaming(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        renamePath(renaming!.path, renaming!.draft);
                                        setRenaming(null);
                                    } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        setRenaming(null);
                                    }
                                }}
                                className="flex-1 min-w-0 rounded px-1 py-0 text-[12.5px] outline-none"
                                style={{
                                    background: inputBg,
                                    border: `1px solid #1ED36A`,
                                    color: isLight ? "#0F1712" : "#FFFFFF",
                                }}
                            />
                        ) : (
                            <span className="truncate">{data.name}</span>
                        )}
                        {data.readOnly && !isRenaming && (
                            <span
                                className="ml-auto rounded px-1 py-px text-[8.5px] font-bold uppercase tracking-wider"
                                style={{ background: "rgba(255,183,3,0.18)", color: "#B5710F" }}
                                title="Read-only"
                            >
                                RO
                            </span>
                        )}
                    </span>
                </TreeItemLabel>
                {creating?.parent === id && data.isFolder && (
                    <div
                        className="mt-0.5 flex items-center gap-1.5 rounded px-2 py-0.5 text-[12.5px]"
                        style={{ paddingInlineStart: 22 + (item.getItemMeta().level + 1) * 14 }}
                    >
                        {creating.kind === "file" ? (
                            <FileGlyph ext={extOf(creating.draft)} />
                        ) : (
                            <FolderGlyph isOpen={false} />
                        )}
                        <input
                            autoFocus
                            value={creating.draft}
                            onChange={(e) => setCreating((c) => (c ? { ...c, draft: e.target.value } : c))}
                            onBlur={() => {
                                if (creating.kind === "file") createFile(creating.parent, creating.draft);
                                else createFolder(creating.parent, creating.draft);
                                setCreating(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (creating.kind === "file")
                                        createFile(creating.parent, creating.draft);
                                    else createFolder(creating.parent, creating.draft);
                                    setCreating(null);
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setCreating(null);
                                }
                            }}
                            className="flex-1 min-w-0 rounded px-1 py-0 text-[12.5px] outline-none"
                            style={{
                                background: inputBg,
                                border: `1px solid #1ED36A`,
                                color: isLight ? "#0F1712" : "#FFFFFF",
                            }}
                        />
                    </div>
                )}
            </TreeItem>
        );
    };

    return (
        <div
            className="flex h-full flex-col overflow-hidden"
            style={{
                background: bg,
                borderLeft: `1px solid ${borderColor}`,
                width: 240,
                ...wrapperVars,
            }}
        >
            {/* Toolbar */}
            <div
                className="flex h-8 flex-shrink-0 items-center gap-1 px-2"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <span
                    className="flex-1 truncate px-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: headerColor }}
                >
                    Explorer
                </span>
                <ToolbarBtn
                    onClick={() => startCreate("file", "")}
                    title="New file (root)"
                    isLight={isLight}
                >
                    <FilePlus size={13} />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => startCreate("folder", "")}
                    title="New folder (root)"
                    isLight={isLight}
                >
                    <FolderPlus size={13} />
                </ToolbarBtn>
                <ToolbarBtn
                    onClick={() => {
                        Object.keys(itemsRef.current).forEach((id) => {
                            const data = itemsRef.current[id];
                            if (data?.isFolder && id !== ROOT_ID) {
                                const it = tree.getItemInstance(id);
                                if (it?.isExpanded()) it.collapse();
                            }
                        });
                    }}
                    title="Collapse all folders"
                    isLight={isLight}
                >
                    <ChevronRight size={13} />
                </ToolbarBtn>
            </div>

            {/* Search */}
            <div
                className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1.5"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <Search size={12} style={{ color: headerColor, flexShrink: 0 }} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search files…"
                    className="flex-1 min-w-0 rounded border-0 bg-transparent px-1 py-0.5 text-[11.5px] outline-none"
                    style={{ color: isLight ? "#0F1712" : "#FFFFFF" }}
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="cursor-pointer"
                        style={{ color: headerColor }}
                        aria-label="Clear search"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Tree */}
            <div
                ref={treeRef}
                className="relative flex-1 overflow-y-auto py-1 outline-none"
                tabIndex={0}
                onContextMenu={(e) => {
                    if (e.target === e.currentTarget) {
                        e.preventDefault();
                        setMenu({
                            open: true,
                            x: e.clientX,
                            y: e.clientY,
                            path: ROOT_ID,
                            isFolder: true,
                            readOnly: false,
                        });
                    }
                }}
            >
                <Tree
                    indent={14}
                    tree={tree}
                    className="relative"
                >
                    <AssistiveTreeDescription tree={tree} />
                    {tree.getItems().map(renderItem)}
                    {/* Inline create-at-root */}
                    {creating?.parent === "" && (
                        <div
                            className="mt-0.5 flex items-center gap-1.5 rounded px-2 py-0.5 text-[12.5px]"
                            style={{ paddingInlineStart: 22 }}
                        >
                            {creating.kind === "file" ? (
                                <FileGlyph ext={extOf(creating.draft)} />
                            ) : (
                                <FolderGlyph isOpen={false} />
                            )}
                            <input
                                autoFocus
                                value={creating.draft}
                                onChange={(e) => setCreating((c) => (c ? { ...c, draft: e.target.value } : c))}
                                onBlur={() => {
                                    if (creating.kind === "file") createFile(creating.parent, creating.draft);
                                    else createFolder(creating.parent, creating.draft);
                                    setCreating(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (creating.kind === "file")
                                            createFile(creating.parent, creating.draft);
                                        else createFolder(creating.parent, creating.draft);
                                        setCreating(null);
                                    } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        setCreating(null);
                                    }
                                }}
                                className="flex-1 min-w-0 rounded px-1 py-0 text-[12.5px] outline-none"
                                style={{
                                    background: inputBg,
                                    border: `1px solid #1ED36A`,
                                    color: isLight ? "#0F1712" : "#FFFFFF",
                                }}
                            />
                        </div>
                    )}
                </Tree>
            </div>

            {/* Status footer */}
            <div
                className="flex h-6 flex-shrink-0 items-center justify-between px-2 text-[10px]"
                style={{
                    borderTop: `1px solid ${borderColor}`,
                    color: subtleText,
                }}
            >
                <span>{files.length} files</span>
                <span style={{ opacity: 0.7 }}>F2 rename · Del delete</span>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className="pointer-events-none absolute bottom-7 right-2 max-w-[220px] rounded-md px-2 py-1 text-[11px] shadow-lg"
                    style={{
                        background: isLight ? "rgba(15,23,18,0.92)" : "rgba(15,23,18,0.95)",
                        color: "#1ED36A",
                        border: "1px solid rgba(30,211,106,0.4)",
                    }}
                >
                    {toast}
                </div>
            )}

            {/* Context menu */}
            {menu?.open && (
                <ContextMenu
                    state={menu}
                    isLight={isLight}
                    onClose={closeMenu}
                    onAction={(action) => {
                        const { path, isFolder, readOnly } = menu;
                        if (action === "new-file") {
                            const parent = path === ROOT_ID ? "" : isFolder ? path : dirOf(path);
                            startCreate("file", parent);
                        } else if (action === "new-folder") {
                            const parent = path === ROOT_ID ? "" : isFolder ? path : dirOf(path);
                            startCreate("folder", parent);
                        } else if (action === "rename") {
                            if (readOnly || path === ROOT_ID) return;
                            const data = itemsRef.current[path];
                            if (data) setRenaming({ path, draft: data.name });
                        } else if (action === "delete") {
                            if (readOnly || path === ROOT_ID) return;
                            deletePath(path);
                        } else if (action === "copy-path") {
                            if (path === ROOT_ID) return;
                            copyToClipboard(`/${path}`, "Path");
                        } else if (action === "copy-relative-path") {
                            if (path === ROOT_ID) return;
                            copyToClipboard(path, "Relative path");
                        }
                        closeMenu();
                    }}
                />
            )}
        </div>
    );
};

interface ToolbarBtnProps {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    isLight: boolean;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ onClick, title, children, isLight }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors"
        style={{ color: isLight ? "rgba(15,23,18,0.6)" : "rgba(255,255,255,0.6)" }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = isLight
                ? "rgba(15,23,18,0.06)"
                : "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = isLight ? "#0F1712" : "#FFFFFF";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isLight
                ? "rgba(15,23,18,0.6)"
                : "rgba(255,255,255,0.6)";
        }}
    >
        {children}
    </button>
);

const FileGlyph: React.FC<{ ext: string; filename?: string }> = ({ ext, filename }) => {
    return <SetiFileIcon ext={ext} filename={filename} size={15} />;
};

const FolderGlyph: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const Cmp = isOpen ? FolderOpen : Folder;
    return <Cmp size={13} style={{ color: "#FFB703", flexShrink: 0 }} />;
};

interface ContextMenuProps {
    state: ContextMenuState;
    isLight: boolean;
    onClose: () => void;
    onAction: (
        action:
            | "new-file"
            | "new-folder"
            | "rename"
            | "delete"
            | "copy-path"
            | "copy-relative-path",
    ) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ state, isLight, onAction }) => {
    const bg = isLight ? "#FFFFFF" : "#1B1F23";
    const border = isLight ? "rgba(15,23,18,0.12)" : "rgba(255,255,255,0.1)";
    const text = isLight ? "#0F1712" : "#FFFFFF";
    const muted = isLight ? "rgba(15,23,18,0.5)" : "rgba(255,255,255,0.45)";
    const danger = isLight ? "#C12027" : "#F17074";

    const ItemRow: React.FC<{
        icon: React.ReactNode;
        label: string;
        shortcut?: string;
        onClick: () => void;
        disabled?: boolean;
        tone?: "default" | "danger";
    }> = ({ icon, label, shortcut, onClick, disabled, tone = "default" }) => (
        <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[12px] transition-colors"
            style={{
                color: disabled ? muted : tone === "danger" ? danger : text,
                opacity: disabled ? 0.55 : 1,
            }}
            onMouseEnter={(e) => {
                if (!disabled)
                    e.currentTarget.style.background = isLight
                        ? "rgba(15,23,18,0.06)"
                        : "rgba(255,255,255,0.07)";
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
            <span className="flex h-4 w-4 items-center justify-center" style={{ color: muted }}>
                {icon}
            </span>
            <span className="flex-1">{label}</span>
            {shortcut && (
                <span className="font-mono text-[10.5px]" style={{ color: muted }}>
                    {shortcut}
                </span>
            )}
        </button>
    );

    const isRoot = state.path === ROOT_ID;
    const canModify = !state.readOnly && !isRoot;

    // Position the menu, clamping to viewport.
    const W = 220;
    const left = Math.min(state.x, window.innerWidth - W - 4);
    const top = Math.min(state.y, window.innerHeight - 240);

    return (
        <div
            className="fixed z-[200] flex flex-col gap-px rounded-md py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm"
            style={{
                left,
                top,
                width: W,
                background: bg,
                border: `1px solid ${border}`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <ItemRow
                icon={<FilePlus size={13} />}
                label="New File"
                onClick={() => onAction("new-file")}
            />
            <ItemRow
                icon={<FolderPlus size={13} />}
                label="New Folder"
                onClick={() => onAction("new-folder")}
            />
            <Divider isLight={isLight} />
            <ItemRow
                icon={<PencilLine size={13} />}
                label="Rename"
                shortcut="F2"
                disabled={!canModify}
                onClick={() => onAction("rename")}
            />
            <ItemRow
                icon={<Copy size={13} />}
                label="Copy Path"
                disabled={isRoot}
                onClick={() => onAction("copy-path")}
            />
            <ItemRow
                icon={<Copy size={13} />}
                label="Copy Relative Path"
                disabled={isRoot}
                onClick={() => onAction("copy-relative-path")}
            />
            <Divider isLight={isLight} />
            <ItemRow
                icon={<Trash2 size={13} />}
                label="Delete"
                shortcut="Del"
                disabled={!canModify}
                onClick={() => onAction("delete")}
                tone="danger"
            />
        </div>
    );
};

const Divider: React.FC<{ isLight: boolean }> = ({ isLight }) => (
    <div
        className="my-1 h-px"
        style={{ background: isLight ? "rgba(15,23,18,0.08)" : "rgba(255,255,255,0.08)" }}
    />
);

export default FileTreePanel;
