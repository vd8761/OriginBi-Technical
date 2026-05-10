"use client";

import React, { useEffect, useRef } from "react";

type MonacoModule = typeof import("monaco-editor");
type EditorInstance = ReturnType<MonacoModule["editor"]["create"]>;
type MonacoModel = ReturnType<MonacoModule["editor"]["createModel"]>;

const MONACO_VERSION = "0.55.1";
const MONACO_CDN_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

/** Inject Monaco's main CSS (includes codicon icon-font for Find/Replace widget, suggest widget, etc). */
const ensureMonacoCss = () => {
    if (typeof document === "undefined") return;
    const MONACO_CSS_ID = "monaco-editor-css";
    if (document.getElementById(MONACO_CSS_ID)) return;
    const link = document.createElement("link");
    link.id = MONACO_CSS_ID;
    link.rel = "stylesheet";
    link.href = `${MONACO_CDN_BASE}/editor/editor.main.css`;
    document.head.appendChild(link);
};

/** Inject a style override so Monaco's fixed-position widgets (Find, Suggest, etc.)
 *  aren't clipped by the editor host's `overflow: hidden` ancestors. */
const ensureWidgetOverflowFix = () => {
    if (typeof document === "undefined") return;
    const STYLE_ID = "monaco-widget-overflow-fix";
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .monaco-editor .overflow-guard { overflow: visible !important; }
        .monaco-editor .find-widget { z-index: 50; }
        /* Tooltips for find-widget action buttons: render below the trigger. */
        .monaco-hover.find-widget-tooltip-below {
            transition: none !important;
        }
    `;
    document.head.appendChild(style);
};

/** Track the most recently mouse-entered button inside any visible find widget.
 *  Monaco renders its hover overlay asynchronously and into a DOM subtree far
 *  from the trigger, so we cannot rely on `:hover` to find it after the fact —
 *  capture the trigger up-front via a delegated mouseover listener. */
let lastFindWidgetTrigger: HTMLElement | null = null;
let lastFindWidgetTriggerAt = 0;

const HOVER_CLASS_MATCHERS = [
    "monaco-hover",
    "workbench-hover",
    "monaco-hover-content",
];

const isHoverNode = (el: HTMLElement): boolean =>
    HOVER_CLASS_MATCHERS.some((c) => el.classList.contains(c));

// Walk up from the hover content to the `.context-view` Monaco uses to position
// the overlay (or any absolutely-positioned ancestor). The hover itself is
// position: relative, so editing its top/left does nothing.
const findPositionedAncestor = (hover: HTMLElement): HTMLElement => {
    let el: HTMLElement | null = hover;
    while (el) {
        if (el.classList?.contains("context-view")) return el;
        const pos = window.getComputedStyle(el).position;
        if (pos === "absolute" || pos === "fixed") return el;
        el = el.parentElement;
    }
    return hover;
};

const flipHoverBelow = (hover: HTMLElement) => {
    const trigger = lastFindWidgetTrigger;
    if (!trigger) return;
    if (Date.now() - lastFindWidgetTriggerAt > 1500) return;
    if (!trigger.isConnected) return;
    const rect = trigger.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const positioned = findPositionedAncestor(hover);
    // Target may be inside a parent whose own bounding rect is the one we need
    // to align with — measure positioned element itself for width.
    const offsetParent = (positioned.offsetParent as HTMLElement | null) ?? document.body;
    const parentRect = offsetParent.getBoundingClientRect();

    const top = rect.bottom - parentRect.top + 6;
    positioned.style.setProperty("top", `${top}px`, "important");
    positioned.style.setProperty("bottom", "auto", "important");

    const pRect = positioned.getBoundingClientRect();
    const desiredLeftViewport = Math.max(
        8,
        rect.left + rect.width / 2 - pRect.width / 2,
    );
    const left = desiredLeftViewport - parentRect.left;
    positioned.style.setProperty("left", `${left}px`, "important");

    // Strip Monaco's "bottom"/"top" anchor classes that would re-pull it above.
    positioned.classList.remove("bottom");
    positioned.classList.add("find-widget-tooltip-below");
    hover.classList.add("find-widget-tooltip-below");
};

const installFindTooltipObserver = (): (() => void) => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
        return () => {};
    }

    // Capture which find-widget button the cursor is currently over.
    const onMouseOver = (e: MouseEvent) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const widget = t.closest(".find-widget");
        if (!widget) return;
        const btn = t.closest<HTMLElement>(
            ".monaco-custom-toggle, .button, .action-item, .action-label, .codicon",
        );
        if (btn) {
            lastFindWidgetTrigger = btn;
            lastFindWidgetTriggerAt = Date.now();
            // Schedule several flip attempts since Monaco lazily toggles the
            // tooltip visibility (no DOM insertion event to react to).
            scheduleFlipAttempts();
        }
    };
    document.addEventListener("mouseover", onMouseOver, true);

    const findVisibleHovers = (): HTMLElement[] => {
        const candidates = Array.from(
            document.querySelectorAll<HTMLElement>(
                HOVER_CLASS_MATCHERS.map((c) => `.${c}`).join(","),
            ),
        );
        return candidates.filter((h) => {
            const r = h.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && !h.classList.contains("hidden");
        });
    };

    const tryFlipNow = () => {
        if (!lastFindWidgetTrigger) return;
        const visible = findVisibleHovers();
        for (const h of visible) {
            // Only flip if this hover's text matches the trigger's aria-label —
            // avoids accidentally flipping editor hovers (parameter hints etc.).
            const label = lastFindWidgetTrigger.getAttribute("aria-label") || "";
            if (label && !(h.textContent || "").includes(label.split(" (")[0])) continue;
            flipHoverBelow(h);
        }
    };

    let scheduledFrames = 0;
    const scheduleFlipAttempts = () => {
        if (scheduledFrames > 0) return;
        scheduledFrames = 12; // ~200ms of attempts
        const tick = () => {
            tryFlipNow();
            scheduledFrames -= 1;
            if (scheduledFrames > 0) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    // Also catch insertions (initial render of .context-view) so we flip
    // immediately for buttons that get hovered before the hover element exists.
    const treeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const added of Array.from(m.addedNodes)) {
                if (!(added instanceof HTMLElement)) continue;
                if (
                    isHoverNode(added) ||
                    added.querySelector?.(HOVER_CLASS_MATCHERS.map((c) => `.${c}`).join(","))
                ) {
                    scheduleFlipAttempts();
                    return;
                }
            }
        }
    });
    treeObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
        document.removeEventListener("mouseover", onMouseOver, true);
        treeObserver.disconnect();
    };
};

let monacoLoader: Promise<MonacoModule> | null = null;

const loadMonaco = (): Promise<MonacoModule> => {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("monaco can only load on the client"));
    }
    if (monacoLoader) return monacoLoader;

    monacoLoader = new Promise<MonacoModule>((resolve, reject) => {
        const w = window as unknown as {
            MonacoEnvironment?: Record<string, unknown>;
            require?: {
                (deps: string[], cb: (mod: MonacoModule) => void): void;
                config: (cfg: { paths: Record<string, string> }) => void;
            };
        };

        // baseUrl tells Monaco where to resolve asset paths (codicon font for the
        // find widget icons, etc). Workers come from the same CDN via a proxy script.
        if (!w.MonacoEnvironment) {
            w.MonacoEnvironment = {
                baseUrl: `${MONACO_CDN_BASE}/`,
                getWorkerUrl: () => {
                    const proxy =
                        `self.MonacoEnvironment = { baseUrl: '${MONACO_CDN_BASE}/' };\n` +
                        `importScripts('${MONACO_CDN_BASE}/base/worker/workerMain.js');\n`;
                    return URL.createObjectURL(
                        new Blob([proxy], { type: "application/javascript" }),
                    );
                },
            };
        }

        const finalize = () => {
            if (!w.require) {
                reject(new Error("monaco AMD loader did not expose require"));
                return;
            }
            w.require.config({ paths: { vs: MONACO_CDN_BASE } });
            w.require(["vs/editor/editor.main"], (mod) => resolve(mod));
        };

        const existing = document.querySelector<HTMLScriptElement>(
            'script[data-monaco-loader="true"]',
        );
        if (existing) {
            if (w.require) {
                finalize();
            } else {
                existing.addEventListener("load", finalize, { once: true });
                existing.addEventListener(
                    "error",
                    () => reject(new Error("failed to load monaco loader")),
                    { once: true },
                );
            }
            return;
        }

        const script = document.createElement("script");
        script.src = `${MONACO_CDN_BASE}/loader.js`;
        script.async = true;
        script.dataset.monacoLoader = "true";
        script.onload = finalize;
        script.onerror = () => reject(new Error("failed to load monaco loader"));
        document.head.appendChild(script);
    });

    return monacoLoader;
};

const DARK_THEME = "originbi-dark";
const LIGHT_THEME = "originbi-light";

const ensureThemes = (monaco: MonacoModule, alreadyDefined: { current: boolean }) => {
    if (alreadyDefined.current) return;
    monaco.editor.defineTheme(DARK_THEME, {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "AC96FF", fontStyle: "bold" },
            { token: "keyword.control", foreground: "AC96FF", fontStyle: "bold" },
            { token: "string", foreground: "1ED36A" },
            { token: "string.escape", foreground: "1ED36A" },
            { token: "number", foreground: "FFB703" },
            { token: "comment", foreground: "5F6E66", fontStyle: "italic" },
            { token: "type", foreground: "4AC6EA" },
            { token: "type.identifier", foreground: "4AC6EA" },
            { token: "identifier", foreground: "E5E7E5" },
            { token: "delimiter", foreground: "B7BFB9" },
            { token: "operator", foreground: "B7BFB9" },
        ],
        colors: {
            "editor.background": "#111814",
            "editor.foreground": "#E5E7E5",
            "editor.lineHighlightBackground": "#19211C",
            "editor.lineHighlightBorder": "#19211C",
            "editorLineNumber.foreground": "#FFFFFF33",
            "editorLineNumber.activeForeground": "#1ED36A",
            "editorCursor.foreground": "#1ED36A",
            "editor.selectionBackground": "#1ED36A33",
            "editor.inactiveSelectionBackground": "#1ED36A1F",
            "editorIndentGuide.background": "#FFFFFF0F",
            "editorIndentGuide.activeBackground": "#1ED36A55",
            "editorWhitespace.foreground": "#FFFFFF1F",
            "editorBracketMatch.background": "#1ED36A22",
            "editorBracketMatch.border": "#1ED36A66",
            "scrollbarSlider.background": "#1ED36A33",
            "scrollbarSlider.hoverBackground": "#1ED36A55",
            "scrollbarSlider.activeBackground": "#1ED36A77",
            "editorWidget.background": "#0F1712",
            "editorWidget.border": "#1ED36A33",
            "editorSuggestWidget.background": "#0F1712",
            "editorSuggestWidget.border": "#1ED36A33",
            "editorSuggestWidget.selectedBackground": "#1ED36A22",
        },
    });

    monaco.editor.defineTheme(LIGHT_THEME, {
        base: "vs",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "5337BC", fontStyle: "bold" },
            { token: "string", foreground: "157A45" },
            { token: "number", foreground: "B5710F" },
            { token: "comment", foreground: "8A958F", fontStyle: "italic" },
            { token: "type", foreground: "1F6FA8" },
        ],
        colors: {
            "editor.background": "#F8FBF9",
            "editor.foreground": "#1F2A23",
            "editor.lineHighlightBackground": "#EBF5EE",
            "editor.lineHighlightBorder": "#EBF5EE",
            "editorLineNumber.foreground": "#1F2A2333",
            "editorLineNumber.activeForeground": "#0FA255",
            "editorCursor.foreground": "#0FA255",
            "editor.selectionBackground": "#1ED36A2A",
            "editor.inactiveSelectionBackground": "#1ED36A1A",
            "editorIndentGuide.background": "#1F2A231F",
            "editorIndentGuide.activeBackground": "#0FA25555",
            "editorBracketMatch.border": "#0FA25588",
            "scrollbarSlider.background": "#1ED36A33",
            "scrollbarSlider.hoverBackground": "#1ED36A55",
            "scrollbarSlider.activeBackground": "#1ED36A77",
        },
    });
    alreadyDefined.current = true;
};

export const LANG_TO_MONACO: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    java: "java",
    cpp: "cpp",
    c: "c",
};

const EXT_TO_MONACO: Record<string, string> = {
    py: "python",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    java: "java",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    h: "cpp",
    hpp: "cpp",
    c: "c",
    md: "markdown",
    markdown: "markdown",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    txt: "plaintext",
    sh: "shell",
    css: "css",
    html: "html",
};

export const detectLanguageForPath = (path: string, fallbackLang: string): string => {
    const dot = path.lastIndexOf(".");
    if (dot < 0) return LANG_TO_MONACO[fallbackLang] ?? "plaintext";
    const ext = path.slice(dot + 1).toLowerCase();
    return EXT_TO_MONACO[ext] ?? LANG_TO_MONACO[fallbackLang] ?? "plaintext";
};

interface MonacoEditorProps {
    /** Stable identifier for the open file. Used as the model URI so undo history is preserved per file. */
    path: string;
    value: string;
    /** Question language ("python", "javascript", …). Used as fallback when the path has no extension. */
    language: string;
    fontSize: number;
    /** Spaces per indent. Default 4. */
    tabSize?: number;
    theme: "dark" | "light";
    readOnly?: boolean;
    onChange?: (value: string) => void;
    /** Optional Shift+Alt+F handler — re-indent / format the active file. */
    onFormat?: () => void;
    /** When false, Ctrl+F find widget is disabled. Default true. */
    findEnabled?: boolean;
    /** When false, autocomplete / quick suggestions are disabled. Default true. */
    suggestionsEnabled?: boolean;
    /** When false, language-service diagnostics (squiggles) are hidden. Default true. */
    lintsEnabled?: boolean;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
    path,
    value,
    language,
    fontSize,
    tabSize = 4,
    theme,
    readOnly,
    onChange,
    onFormat,
    findEnabled = true,
    suggestionsEnabled = true,
    lintsEnabled = true,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<EditorInstance | null>(null);
    const monacoRef = useRef<MonacoModule | null>(null);
    const modelsRef = useRef<Map<string, MonacoModel>>(new Map());
    const themesDefined = useRef(false);
    const onChangeRef = useRef(onChange);
    const onFormatRef = useRef(onFormat);
    const valueRef = useRef(value);
    const pathRef = useRef(path);
    const suppressOnChange = useRef(false);
    const changeListenerRef = useRef<{ dispose: () => void } | null>(null);
    const tooltipTeardownRef = useRef<(() => void) | null>(null);

    onChangeRef.current = onChange;
    valueRef.current = value;
    pathRef.current = path;

    useEffect(() => {
        onFormatRef.current = onFormat;
    }, [onFormat]);

    const ensureModel = (
        monaco: MonacoModule,
        modelPath: string,
        modelValue: string,
        fallbackLang: string,
    ): MonacoModel => {
        const existing = modelsRef.current.get(modelPath);
        if (existing && !existing.isDisposed()) {
            existing.updateOptions({ tabSize, insertSpaces: true });
            return existing;
        }
        const uri = monaco.Uri.parse(`originbi://workspace/${modelPath}`);
        const monacoLang = detectLanguageForPath(modelPath, fallbackLang);
        const model = monaco.editor.createModel(modelValue, monacoLang, uri);
        // Per-model indent overrides Monaco's auto-detection — needed because each
        // model otherwise re-detects from its content and ignores editor options.
        model.updateOptions({ tabSize, insertSpaces: true });
        modelsRef.current.set(modelPath, model);
        return model;
    };

    const attachChangeListener = (editor: EditorInstance) => {
        changeListenerRef.current?.dispose();
        const subscription = editor.onDidChangeModelContent(() => {
            if (suppressOnChange.current) return;
            const v = editor.getValue();
            onChangeRef.current?.(v);
        });
        changeListenerRef.current = subscription;
    };

    useEffect(() => {
        let disposed = false;

        ensureMonacoCss();
        ensureWidgetOverflowFix();

        loadMonaco().then((monaco) => {
            if (disposed || !containerRef.current) return;
            ensureThemes(monaco, themesDefined);
            monacoRef.current = monaco;

            const initialModel = ensureModel(monaco, pathRef.current, valueRef.current, language);

            const editor = monaco.editor.create(containerRef.current, {
                model: initialModel,
                theme: theme === "light" ? LIGHT_THEME : DARK_THEME,
                fontSize,
                fontFamily:
                    "'Cascadia Code', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                automaticLayout: true,
                tabSize,
                insertSpaces: true,
                detectIndentation: false,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                renderLineHighlight: "all",
                roundedSelection: true,
                padding: { top: 14, bottom: 14 },
                lineNumbersMinChars: 3,
                lineDecorationsWidth: 8,
                folding: true,
                glyphMargin: false,
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                wordWrap: "off",
                readOnly: !!readOnly,
                fixedOverflowWidgets: true,
                quickSuggestions: suggestionsEnabled
                    ? { other: true, comments: false, strings: false }
                    : false,
                suggestOnTriggerCharacters: suggestionsEnabled,
                wordBasedSuggestions: suggestionsEnabled ? "currentDocument" : "off",
                parameterHints: { enabled: suggestionsEnabled },
                find: {
                    addExtraSpaceOnTop: false,
                    seedSearchStringFromSelection: findEnabled ? "always" : "never",
                },
                renderValidationDecorations: lintsEnabled ? "on" : "off",
                scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false,
                },
            });

            attachChangeListener(editor);
            editorRef.current = editor;

            editor.addAction({
                id: "originbi.formatActiveFile",
                label: "Format / Re-indent Active File",
                keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
                contextMenuGroupId: "1_modification",
                contextMenuOrder: 1,
                run: () => {
                    onFormatRef.current?.();
                },
            });

            tooltipTeardownRef.current = installFindTooltipObserver();
        });

        return () => {
            disposed = true;
            changeListenerRef.current?.dispose();
            changeListenerRef.current = null;
            tooltipTeardownRef.current?.();
            tooltipTeardownRef.current = null;
            editorRef.current?.dispose();
            editorRef.current = null;
            modelsRef.current.forEach((m) => {
                if (!m.isDisposed()) m.dispose();
            });
            modelsRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Switch model when path changes (preserves undo history per file).
    useEffect(() => {
        const monaco = monacoRef.current;
        const editor = editorRef.current;
        if (!monaco || !editor) return;
        const current = editor.getModel();
        const next = ensureModel(monaco, path, value, language);
        if (current !== next) {
            editor.setModel(next);
            attachChangeListener(editor);
            // Sync content if the parent has authoritative state newer than the cached model.
            if (next.getValue() !== value) {
                suppressOnChange.current = true;
                next.setValue(value);
                suppressOnChange.current = false;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    // Sync incoming value into the active model without thrashing the undo stack.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;
        if (model.getValue() !== value) {
            suppressOnChange.current = true;
            const pos = editor.getPosition();
            model.setValue(value);
            if (pos) editor.setPosition(pos);
            suppressOnChange.current = false;
        }
    }, [value]);

    useEffect(() => {
        const monaco = monacoRef.current;
        if (!monaco) return;
        monaco.editor.setTheme(theme === "light" ? LIGHT_THEME : DARK_THEME);
    }, [theme]);

    useEffect(() => {
        editorRef.current?.updateOptions({ fontSize });
    }, [fontSize]);

    useEffect(() => {
        editorRef.current?.updateOptions({ readOnly: !!readOnly });
    }, [readOnly]);

    useEffect(() => {
        editorRef.current?.updateOptions({ tabSize, insertSpaces: true });
        modelsRef.current.forEach((m) => {
            if (!m.isDisposed()) m.updateOptions({ tabSize, insertSpaces: true });
        });
    }, [tabSize]);

    useEffect(() => {
        editorRef.current?.updateOptions({
            quickSuggestions: suggestionsEnabled
                ? { other: true, comments: false, strings: false }
                : false,
            suggestOnTriggerCharacters: suggestionsEnabled,
            wordBasedSuggestions: suggestionsEnabled ? "currentDocument" : "off",
            parameterHints: { enabled: suggestionsEnabled },
        });
    }, [suggestionsEnabled]);

    useEffect(() => {
        editorRef.current?.updateOptions({
            renderValidationDecorations: lintsEnabled ? "on" : "off",
        });
    }, [lintsEnabled]);

    // Disable the find widget by closing it whenever it's opened, and stop
    // Ctrl+F at the keydown phase so the widget never shows.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (findEnabled) return;
        const monaco = monacoRef.current;
        const dom = editor.getDomNode();
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F" || e.key === "h" || e.key === "H")) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        dom?.addEventListener("keydown", handler, true);
        // Close any already-visible find widget.
        if (monaco) {
            editor.trigger("dev-controls", "closeFindWidget", null);
        }
        return () => {
            dom?.removeEventListener("keydown", handler, true);
        };
    }, [findEnabled]);

    return (
        <div
            ref={containerRef}
            className="monaco-host h-full w-full"
            style={{ minHeight: 0 }}
        />
    );
};

export default MonacoEditor;
