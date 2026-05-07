// Whitespace-only re-indenter. Rewrites every line's leading whitespace by
// computing its indent level (oldSpaces / fromUnit) and emitting
// (level * toUnit) spaces. Tabs in leading whitespace are treated as one
// indent level. Touches only the leading-whitespace prefix of each line so
// it's safe across Python / JS / Java / C / C++.

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const expandLeadingTabs = (line: string, tabUnit: number): { spaces: number; rest: string } => {
    let i = 0;
    let spaces = 0;
    while (i < line.length) {
        const ch = line[i];
        if (ch === " ") {
            spaces += 1;
            i += 1;
        } else if (ch === "\t") {
            spaces += tabUnit;
            i += 1;
        } else {
            break;
        }
    }
    return { spaces, rest: line.slice(i) };
};

export const detectIndentUnit = (source: string): number => {
    const counts = new Map<number, number>();
    const lines = source.split(/\r?\n/);
    for (const line of lines) {
        if (!line || /^\s*$/.test(line)) continue;
        const { spaces, rest } = expandLeadingTabs(line, 4);
        if (spaces === 0 || !rest) continue;
        counts.set(spaces, (counts.get(spaces) ?? 0) + 1);
    }
    if (counts.size === 0) return 4;
    let g = 0;
    for (const n of counts.keys()) g = gcd(g, n);
    if (g <= 1) {
        // Pick the most common small step instead.
        const candidates = [2, 4, 8];
        let best = 4;
        let bestScore = -1;
        for (const c of candidates) {
            let score = 0;
            for (const [n, freq] of counts) if (n % c === 0) score += freq;
            if (score > bestScore) {
                bestScore = score;
                best = c;
            }
        }
        return best;
    }
    if (g >= 8) return 8;
    if (g >= 4) return 4;
    return 2;
};

export const reindent = (
    source: string,
    fromUnit: number | null,
    toUnit: number,
): string => {
    if (!source) return source;
    const from = fromUnit ?? detectIndentUnit(source);
    if (from === toUnit) return source;
    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    const lines = source.split(/\r?\n/);
    const out = lines.map((line) => {
        const { spaces, rest } = expandLeadingTabs(line, from);
        if (spaces === 0) return line;
        const level = Math.round(spaces / from);
        const remainder = spaces - level * from;
        const indent = " ".repeat(Math.max(0, level * toUnit + Math.max(0, remainder)));
        return indent + rest;
    });
    return out.join(eol);
};
