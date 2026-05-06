const KEYWORDS: Record<string, string[]> = {
    python: ["def", "return", "if", "else", "elif", "for", "while", "in", "not", "and", "or", "import", "from", "class", "pass", "None", "True", "False", "len", "range", "print", "lambda", "with", "as", "try", "except", "finally", "raise", "yield", "global", "nonlocal", "del", "is", "assert"],
    javascript: ["function", "return", "if", "else", "for", "while", "let", "const", "var", "class", "new", "this", "null", "true", "false", "typeof", "instanceof", "import", "export", "default", "from", "async", "await", "switch", "case", "break", "continue"],
    java: ["public", "private", "protected", "class", "return", "int", "long", "float", "double", "boolean", "void", "new", "if", "else", "for", "while", "import", "static", "final", "String", "null", "true", "false", "extends", "implements", "interface", "try", "catch", "throws"],
    cpp: ["int", "long", "float", "double", "bool", "void", "class", "return", "if", "else", "for", "while", "include", "using", "namespace", "std", "vector", "new", "delete", "public", "private", "protected", "true", "false", "nullptr", "const", "auto", "struct", "template"],
    c: ["int", "char", "float", "double", "void", "return", "if", "else", "for", "while", "include", "struct", "typedef", "const", "static", "extern", "sizeof", "switch", "case", "break", "continue", "do", "NULL"],
};

const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Pattern {
    re: RegExp;
    cls: "hl-keyword" | "hl-string" | "hl-number" | "hl-comment" | "plain" | null;
}

export function highlight(code: string, lang: string): string {
    const kws = new Set(KEYWORDS[lang] || KEYWORDS.python);
    const patterns: Pattern[] = [
        { re: /#[^\n]*|\/\/[^\n]*/y, cls: "hl-comment" },
        { re: /"""[\s\S]*?"""|'''[\s\S]*?'''/y, cls: "hl-string" },
        { re: /"[^"\n\\]*(?:\\.[^"\n\\]*)*"|'[^'\n\\]*(?:\\.[^'\n\\]*)*'/y, cls: "hl-string" },
        { re: /\b\d+(?:\.\d+)?\b/y, cls: "hl-number" },
        { re: /[A-Za-z_]\w*/y, cls: null },
        { re: /[\s\S]/y, cls: "plain" },
    ];

    let out = "";
    let pos = 0;
    const len = code.length;

    while (pos < len) {
        let matched = false;
        for (const { re, cls } of patterns) {
            re.lastIndex = pos;
            const m = re.exec(code);
            if (m && m.index === pos) {
                const raw = escapeHtml(m[0]);
                if (cls === "plain") {
                    out += raw;
                } else if (cls === null) {
                    if (kws.has(m[0])) {
                        out += `<span class="hl-keyword">${raw}</span>`;
                    } else {
                        out += raw;
                    }
                } else {
                    out += `<span class="${cls}">${raw}</span>`;
                }
                pos += m[0].length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            out += escapeHtml(code[pos]);
            pos++;
        }
    }
    return out;
}
