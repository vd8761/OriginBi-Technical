// Dependency-free markdown → HTML renderer for question prompts. Handles the
// subset admin authoring produces: headings, bold/italic, inline code, fenced
// code blocks, unordered/ordered lists, blockquotes, links, and paragraphs.
// All text is HTML-escaped first, so admin content can't inject markup.

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));

// Private-use sentinels park code-span output so later inline passes (and the
// math in the prose, e.g. "10^5") can't disturb or be disturbed by it.
const S0 = "";
const S1 = "";

const renderInline = (text: string): string => {
    const codeSpans: string[] = [];
    let s = text.replace(/`([^`]+)`/g, (_, code: string) => {
        codeSpans.push("<code>" + escapeHtml(code) + "</code>");
        return S0 + (codeSpans.length - 1) + S1;
    });
    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
        const safe = /^https?:\/\//i.test(href) ? href : "#";
        return '<a href="' + escapeHtml(safe) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
    });
    s = s.replace(new RegExp(S0 + "(\\d+)" + S1, "g"), (_, i: string) => codeSpans[Number(i)] ?? "");
    return s;
};

export function renderMarkdown(md: string): string {
    if (!md || typeof md !== "string") return "";
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];
    let i = 0;
    let para: string[] = [];

    const flushPara = () => {
        if (para.length) {
            out.push("<p>" + renderInline(para.join(" ")) + "</p>");
            para = [];
        }
    };

    while (i < lines.length) {
        const line = lines[i];

        const fence = line.match(/^\s*```(\w*)\s*$/);
        if (fence) {
            flushPara();
            const buf: string[] = [];
            i++;
            while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
                buf.push(lines[i]);
                i++;
            }
            i++;
            out.push(
                '<pre data-lang="' + escapeHtml(fence[1] || "") + '"><code>' +
                    escapeHtml(buf.join("\n")) + "</code></pre>",
            );
            continue;
        }

        const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
        if (h) {
            flushPara();
            const level = h[1].length;
            out.push("<h" + level + ">" + renderInline(h[2].trim()) + "</h" + level + ">");
            i++;
            continue;
        }

        if (/^\s*>\s?/.test(line)) {
            flushPara();
            const buf: string[] = [];
            while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
                buf.push(lines[i].replace(/^\s*>\s?/, ""));
                i++;
            }
            out.push("<blockquote>" + renderInline(buf.join(" ")) + "</blockquote>");
            continue;
        }

        if (/^\s*[-*+]\s+/.test(line)) {
            flushPara();
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
                items.push("<li>" + renderInline(lines[i].replace(/^\s*[-*+]\s+/, "")) + "</li>");
                i++;
            }
            out.push("<ul>" + items.join("") + "</ul>");
            continue;
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
            flushPara();
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
                items.push("<li>" + renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, "")) + "</li>");
                i++;
            }
            out.push("<ol>" + items.join("") + "</ol>");
            continue;
        }

        if (/^\s*$/.test(line)) {
            flushPara();
            i++;
            continue;
        }

        para.push(line.trim());
        i++;
    }
    flushPara();
    return out.join("\n");
}

// A question "format" field is either a plain string or a { kind, content }
// object (kind = "markdown" | "html" | "plain").
export function renderFormat(fmt: unknown): string {
    if (!fmt) return "";
    if (typeof fmt === "string") return renderMarkdown(fmt);
    const f = fmt as { kind?: string; content?: string };
    if (!f.content) return "";
    if (String(f.kind).toLowerCase() === "html") return f.content;
    return renderMarkdown(f.content);
}

// buildQuestionHtml assembles the full question description: the main prompt
// (respecting promptFormat) plus optional Input / Output / Constraints sections.
export function buildQuestionHtml(body: {
    prompt?: string;
    promptFormat?: string;
    inputFormat?: unknown;
    outputFormat?: unknown;
    constraintsFormat?: unknown;
}): string {
    const parts: string[] = [];
    if (body.prompt) {
        parts.push(
            String(body.promptFormat).toLowerCase() === "html"
                ? body.prompt
                : renderMarkdown(body.prompt),
        );
    }
    const section = (label: string, fmt: unknown) => {
        const html = renderFormat(fmt);
        if (html) parts.push('<h4 class="obi-q-section">' + label + "</h4>" + html);
    };
    section("Input", body.inputFormat);
    section("Output", body.outputFormat);
    section("Constraints", body.constraintsFormat);
    return parts.join("\n");
}
