"use client";

import React, { useEffect, useRef } from "react";

type MonacoModule = typeof import("monaco-editor");
type EditorInstance = ReturnType<MonacoModule["editor"]["create"]>;

let monacoLoader: Promise<MonacoModule> | null = null;
let environmentConfigured = false;

const configureEnvironment = () => {
    if (environmentConfigured || typeof window === "undefined") return;
    const w = window as unknown as {
        MonacoEnvironment?: { getWorker?: (...args: unknown[]) => Worker };
    };
    if (!w.MonacoEnvironment) {
        w.MonacoEnvironment = {
            getWorker() {
                const stub =
                    "self.onmessage = function () {};\n" +
                    "self.postMessage({});\n";
                const blob = new Blob([stub], { type: "application/javascript" });
                return new Worker(URL.createObjectURL(blob));
            },
        };
    }
    environmentConfigured = true;
};

const loadMonaco = (): Promise<MonacoModule> => {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("monaco can only load on the client"));
    }
    configureEnvironment();
    if (!monacoLoader) {
        monacoLoader = import("monaco-editor");
    }
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

const LANG_TO_MONACO: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    java: "java",
    cpp: "cpp",
    c: "c",
};

interface MonacoEditorProps {
    value: string;
    language: string;
    fontSize: number;
    theme: "dark" | "light";
    readOnly?: boolean;
    onChange?: (value: string) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
    value,
    language,
    fontSize,
    theme,
    readOnly,
    onChange,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<EditorInstance | null>(null);
    const monacoRef = useRef<MonacoModule | null>(null);
    const themesDefined = useRef(false);
    const onChangeRef = useRef(onChange);
    const valueRef = useRef(value);
    const suppressOnChange = useRef(false);

    onChangeRef.current = onChange;
    valueRef.current = value;

    useEffect(() => {
        let disposed = false;

        loadMonaco().then((monaco) => {
            if (disposed || !containerRef.current) return;
            ensureThemes(monaco, themesDefined);
            monacoRef.current = monaco;

            const editor = monaco.editor.create(containerRef.current, {
                value: valueRef.current,
                language: LANG_TO_MONACO[language] ?? "plaintext",
                theme: theme === "light" ? LIGHT_THEME : DARK_THEME,
                fontSize,
                fontFamily:
                    "'Cascadia Code', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                automaticLayout: true,
                tabSize: 4,
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
                quickSuggestions: { other: true, comments: false, strings: false },
                scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false,
                },
            });

            editor.onDidChangeModelContent(() => {
                if (suppressOnChange.current) return;
                const v = editor.getValue();
                onChangeRef.current?.(v);
            });

            editorRef.current = editor;
        });

        return () => {
            disposed = true;
            editorRef.current?.dispose();
            editorRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (editor.getValue() !== value) {
            suppressOnChange.current = true;
            const pos = editor.getPosition();
            editor.setValue(value);
            if (pos) editor.setPosition(pos);
            suppressOnChange.current = false;
        }
    }, [value]);

    useEffect(() => {
        const monaco = monacoRef.current;
        const editor = editorRef.current;
        if (!monaco || !editor) return;
        const model = editor.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, LANG_TO_MONACO[language] ?? "plaintext");
        }
    }, [language]);

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

    return (
        <div
            ref={containerRef}
            className="monaco-host h-full w-full"
            style={{ minHeight: 0 }}
        />
    );
};

export default MonacoEditor;
