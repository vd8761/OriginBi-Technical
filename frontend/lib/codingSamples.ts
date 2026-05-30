// Coding-question import helpers. Three concerns live here:
//
//   1. `SAMPLE_QUESTIONS` — three worked examples (Easy / Medium / Hard) used
//      as the canonical reference for both downloadable samples.
//   2. `downloadSampleJson` / `downloadSampleXlsx` — generate the sample
//      files at click time. SheetJS is dynamically imported so the candidate
//      bundle never carries it.
//   3. `parseImportFile` — accepts a File (xlsx or json) and returns the
//      normalized AdminQuestionInput[] the bulk-import modal feeds row-by-row
//      into the existing createAdminQuestion endpoint.
//
// XLSX layout: one "Questions" sheet, one row per question. Complex nested
// payloads (starter code map, hints, test cases) are JSON-encoded into a
// single cell — friendlier for Excel authoring than a separate sheet per
// nested array. A second "README" sheet documents column meanings.

import type { AdminQuestionInput } from "./api";

export type DifficultyWord = "easy" | "medium" | "hard";

const DIFFICULTY_TO_INT: Record<DifficultyWord, number> = { easy: 1, medium: 3, hard: 5 };
const INT_TO_DIFFICULTY: Record<number, DifficultyWord> = { 1: "easy", 3: "medium", 5: "hard" };

// ── canonical worked examples ──────────────────────────────────────────────
// The sample set mixes the three supported question types so a fresh template
// download exercises every code path through the unified importer.
// Marking convention reflected in the samples below:
//   coding   : easy=10, medium=20, hard=30
//   mcq      : easy=1,  medium=3,  hard=5
//   fillblank: easy=1,  medium=3,  hard=5
// Coding questions are each scoped to exactly one language; MCQ and
// fill-in-the-blank already required a single `language` field by design.
export const SAMPLE_MCQ: AdminQuestionInput = {
    title: "Python list reversal",
    plugin_slug: "assessment.mcq",
    difficulty: 1,
    max_score: 1,
    body: {
        type: "mcq",
        title: "Python list reversal",
        section: "Python",
        category: "Sequences",
        difficulty: "easy",
        mode: "main",
        tags: ["python", "lists"],
        promptFormat: "markdown",
        prompt: "Which expression reverses a Python list `xs` *in place*?",
        language: "language.python",
        options: [
            { id: "a", text: "`xs[::-1]`" },
            { id: "b", text: "`xs.reverse()`" },
            { id: "c", text: "`reversed(xs)`" },
            { id: "d", text: "`list(reversed(xs))`" },
        ],
        correctOptionIds: ["b"],
        multiSelect: false,
        shuffleOptions: true,
        explanation: "`list.reverse()` mutates in place. The others return a new sequence or iterator.",
    },
};

export const SAMPLE_FILLBLANK: AdminQuestionInput = {
    title: "JavaScript const vs let",
    plugin_slug: "assessment.fillblank",
    difficulty: 3,
    max_score: 3,
    body: {
        type: "fillblank",
        title: "JavaScript const vs let",
        section: "JavaScript",
        category: "Bindings",
        difficulty: "medium",
        mode: "main",
        tags: ["javascript", "es6"],
        promptFormat: "markdown",
        prompt: "Use {{1}} for values that never get reassigned and {{2}} for values that do.",
        language: "language.javascript",
        blanks: [
            { id: "1", answers: ["const"], matchMode: "ci" },
            { id: "2", answers: ["let"], matchMode: "ci" },
        ],
        explanation: "`const` is for bindings, `let` for mutable references. Neither is about deep immutability.",
    },
};

export const SAMPLE_QUESTIONS: AdminQuestionInput[] = [
    {
        title: "Sum Two Integers",
        plugin_slug: "assessment.coding",
        difficulty: 1,
        max_score: 10,
        body: {
            type: "coding",
            responseType: "code",
            title: "Sum Two Integers",
            section: "Math",
            category: "Math",
            difficulty: "easy",
            mode: "main",
            tags: ["math", "io", "warmup"],
            promptFormat: "markdown",
            prompt: "## Sum Two Integers\n\nRead two space-separated integers from stdin and print their sum.",
            inputFormat: { kind: "markdown", content: "Single line with two integers `a b`." },
            outputFormat: { kind: "markdown", content: "One integer: `a + b`." },
            constraintsFormat: { kind: "markdown", content: "`-10^9 <= a, b <= 10^9`" },
            allowedLanguages: ["language.python"],
            multiFile: false,
            starterCode: {
                "language.python": "import sys\n\nif __name__ == '__main__':\n    a, b = map(int, sys.stdin.readline().split())\n    print(a + b)\n",
            },
            hintsEnabled: true,
            hints: [
                { afterFailures: 2, text: "Split the line on whitespace, cast to int." },
            ],
        },
        test_cases: [
            { name: "sample",  is_sample: true,  is_hidden: false, weight: 1, stdin: "2 3",  expected_stdout: "5",  comparator: "trim_equal" },
            { name: "hidden1", is_sample: false, is_hidden: true,  weight: 1, stdin: "13 1", expected_stdout: "14", comparator: "trim_equal" },
        ],
    },
    {
        title: "Reverse a String",
        plugin_slug: "assessment.coding",
        difficulty: 3,
        max_score: 20,
        body: {
            type: "coding",
            responseType: "code",
            title: "Reverse a String",
            section: "Strings",
            category: "Strings",
            difficulty: "medium",
            mode: "main",
            tags: ["strings", "io"],
            promptFormat: "markdown",
            prompt: "## Reverse a String\n\nRead a single line from stdin and print it reversed.",
            inputFormat: { kind: "plain", content: "One line of text." },
            outputFormat: { kind: "plain", content: "Same characters, reverse order." },
            allowedLanguages: ["language.javascript"],
            multiFile: false,
            starterCode: {
                "language.javascript": "const data = require('fs').readFileSync(0, 'utf8').trim();\nconsole.log(data.split('').reverse().join(''));\n",
            },
            hintsEnabled: false,
        },
        test_cases: [
            { name: "sample",     is_sample: true,  is_hidden: false, weight: 1, stdin: "hello",   expected_stdout: "olleh",   comparator: "trim_equal" },
            { name: "ascii",      is_sample: false, is_hidden: true,  weight: 1, stdin: "world",   expected_stdout: "dlrow",   comparator: "trim_equal" },
            { name: "small",      is_sample: false, is_hidden: true,  weight: 1, stdin: "abcd",    expected_stdout: "dcba",    comparator: "trim_equal" },
            { name: "palindrome", is_sample: false, is_hidden: true,  weight: 1, stdin: "racecar", expected_stdout: "racecar", comparator: "trim_equal" },
        ],
    },
    {
        title: "FizzBuzz to N",
        plugin_slug: "assessment.coding",
        difficulty: 5,
        max_score: 30,
        body: {
            type: "coding",
            responseType: "code",
            title: "FizzBuzz to N",
            section: "Loops",
            category: "Control Flow",
            difficulty: "hard",
            mode: "main",
            tags: ["loops", "classic", "regex-demo"],
            promptFormat: "markdown",
            prompt: "## FizzBuzz to N\n\nRead `N` from stdin. For each `i` in `1..N` print `Fizz` if `i % 3 == 0`, `Buzz` if `i % 5 == 0`, `FizzBuzz` if both, else `i`. One per line.",
            inputFormat: { kind: "markdown", content: "Single integer `N` (1 ≤ N ≤ 100)." },
            outputFormat: { kind: "markdown", content: "`N` lines following the FizzBuzz rule." },
            allowedLanguages: ["language.python"],
            multiFile: false,
            starterCode: {
                "language.python": "import sys\n\nif __name__ == '__main__':\n    n = int(sys.stdin.readline().strip())\n    for i in range(1, n + 1):\n        if i % 15 == 0: print('FizzBuzz')\n        elif i % 3 == 0: print('Fizz')\n        elif i % 5 == 0: print('Buzz')\n        else: print(i)\n",
            },
            hintsEnabled: true,
            hints: [
                { afterFailures: 1, text: "Check %15 first so FizzBuzz fires before Fizz/Buzz alone." },
                { afterFailures: 3, text: "Print one value per line (use println / print)." },
            ],
        },
        test_cases: [
            // The 'regex' comparator demonstrates a non-default check: accept any
            // line ordering as long as every FizzBuzz token shows up the right
            // number of times. This is purely illustrative.
            { name: "sample-small", is_sample: true,  is_hidden: false, weight: 1, stdin: "3",  expected_stdout: "1\n2\nFizz",       comparator: "trim_equal" },
            { name: "sample-mid",   is_sample: true,  is_hidden: false, weight: 1, stdin: "5",  expected_stdout: "1\n2\nFizz\n4\nBuzz", comparator: "trim_equal" },
            { name: "hidden-6",     is_sample: false, is_hidden: true,  weight: 1, stdin: "6",  expected_stdout: "1\n2\nFizz\n4\nBuzz\nFizz", comparator: "trim_equal" },
            { name: "hidden-10",    is_sample: false, is_hidden: true,  weight: 1, stdin: "10", expected_stdout: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz", comparator: "trim_equal" },
            { name: "hidden-15",    is_sample: false, is_hidden: true,  weight: 1, stdin: "15", expected_stdout: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", comparator: "trim_equal" },
            // Demonstrates the regex comparator: pass if output is a single "1".
            { name: "edge-1",       is_sample: false, is_hidden: true,  weight: 1, stdin: "1",  expected_stdout: "^\\s*1\\s*$", comparator: "regex" },
        ],
    },
];

// ── sample download builders ──────────────────────────────────────────────
const triggerDownload = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export function downloadSampleJson() {
    // Mixed payload: all three question types in a single envelope so admins
    // can see how the discriminator works in practice.
    const payload = JSON.stringify(
        { questions: [...SAMPLE_QUESTIONS, SAMPLE_MCQ, SAMPLE_FILLBLANK] },
        null,
        2,
    );
    triggerDownload("assessment-questions-sample.json", new Blob([payload], { type: "application/json" }));
}

export async function downloadSampleXlsx() {
    const xlsx = await import("xlsx");
    const wb = xlsx.utils.book_new();

    // Questions sheet — one row per question, mixed types. The 'type' column
    // is the discriminator; columns not relevant to a row's type stay empty.
    const allSamples: AdminQuestionInput[] = [...SAMPLE_QUESTIONS, SAMPLE_MCQ, SAMPLE_FILLBLANK];
    const rows = allSamples.map((q) => {
        const t = (bodyField(q, "type") as string) ?? "coding";
        return {
            type: t,
            title: q.title,
            difficulty: INT_TO_DIFFICULTY[q.difficulty ?? 1] ?? "easy",
            max_score: q.max_score,
            mode: bodyField(q, "mode") ?? "main",
            section: bodyField(q, "section") ?? "",
            category: bodyField(q, "category") ?? "",
            tags_csv: ((bodyField(q, "tags") as string[] | undefined) ?? []).join(","),
            language: (bodyField(q, "language") as string) ?? "",
            // Coding-specific
            allowed_languages_csv: ((bodyField(q, "allowedLanguages") as string[] | undefined) ?? []).join(","),
            prompt_format: bodyField(q, "promptFormat") ?? "markdown",
            prompt: bodyField(q, "prompt") ?? "",
            input_format: jsonStringifyMaybe(bodyField(q, "inputFormat")),
            output_format: jsonStringifyMaybe(bodyField(q, "outputFormat")),
            constraints_format: jsonStringifyMaybe(bodyField(q, "constraintsFormat")),
            starter_code_json: jsonStringifyMaybe(bodyField(q, "starterCode")),
            hints_enabled: !!bodyField(q, "hintsEnabled"),
            hints_json: jsonStringifyMaybe(bodyField(q, "hints")),
            test_cases_json: JSON.stringify(q.test_cases ?? []),
            // MCQ-specific
            options_json: jsonStringifyMaybe(bodyField(q, "options")),
            correct_ids_csv: ((bodyField(q, "correctOptionIds") as string[] | undefined) ?? []).join(","),
            multi_select: !!bodyField(q, "multiSelect"),
            shuffle_options: bodyField(q, "shuffleOptions") !== false,
            // FillBlank-specific
            blanks_json: jsonStringifyMaybe(bodyField(q, "blanks")),
            // Shared optional
            explanation: (bodyField(q, "explanation") as string) ?? "",
        };
    });
    const ws = xlsx.utils.json_to_sheet(rows);
    // Widen the most-edited columns so the file is usable on first open.
    ws["!cols"] = [
        { wch: 10 }, // type
        { wch: 22 }, // title
        { wch: 10 }, // difficulty
        { wch: 10 }, // max_score
        { wch: 8 },  // mode
        { wch: 18 }, // section
        { wch: 18 }, // category
        { wch: 22 }, // tags_csv
        { wch: 22 }, // language
        { wch: 36 }, // allowed_languages_csv
        { wch: 12 }, // prompt_format
        { wch: 50 }, // prompt
        { wch: 30 }, // input_format
        { wch: 30 }, // output_format
        { wch: 30 }, // constraints_format
        { wch: 50 }, // starter_code_json
        { wch: 12 }, // hints_enabled
        { wch: 40 }, // hints_json
        { wch: 60 }, // test_cases_json
        { wch: 50 }, // options_json
        { wch: 18 }, // correct_ids_csv
        { wch: 12 }, // multi_select
        { wch: 14 }, // shuffle_options
        { wch: 50 }, // blanks_json
        { wch: 40 }, // explanation
    ];
    xlsx.utils.book_append_sheet(wb, ws, "Questions");

    // README sheet — single-column documentation.
    const readme = [
        ["Assessment Bulk Import — Sample"],
        [""],
        ["Sheet: Questions — one row per question. The 'type' column dispatches by type."],
        [""],
        ["Scoring convention"],
        ["  coding   : easy=10, medium=20, hard=30"],
        ["  mcq      : easy=1,  medium=3,  hard=5"],
        ["  fillblank: easy=1,  medium=3,  hard=5"],
        [""],
        ["Shared columns (all types)"],
        ["  type                   coding | mcq | fillblank. Defaults to coding."],
        ["  title                  Question title. Required."],
        ["  difficulty             One of: easy, medium, hard. Maps to 1 / 3 / 5 in the DB."],
        ["  max_score              Integer total points (follow the scoring convention above)."],
        ["  mode                   trial | main. Defaults to main."],
        ["  section                Display group on the candidate sidebar."],
        ["  category               Free-form taxonomy (e.g. 'Arrays & Hashing')."],
        ["  tags_csv               Comma-separated tags (no spaces around commas)."],
        ["  prompt                 The problem statement, rendered in prompt_format."],
        ["  prompt_format          markdown | html | plain. Defaults to markdown."],
        ["  explanation            Optional after-submit explanation (mcq, fillblank)."],
        [""],
        ["Coding rows (type=coding)"],
        ["  allowed_languages_csv  Exactly one language plugin slug (e.g. language.python). Coding questions are single-language."],
        ["  input_format           JSON object: { kind: 'markdown'|'plain'|'html', content: '…' }."],
        ["  output_format          Same shape as input_format."],
        ["  constraints_format     Same shape as input_format."],
        ["  starter_code_json      JSON object mapping language slug -> starter source string."],
        ["  hints_enabled          true|false."],
        ["  hints_json             JSON array of { afterFailures: number, text: string }."],
        ["  test_cases_json        JSON array of { name, is_sample, is_hidden, weight, stdin, expected_stdout, comparator }."],
        [""],
        ["MCQ rows (type=mcq)"],
        ["  language               Single language plugin slug (e.g. language.python). Required."],
        ["  options_json           JSON array of { id, text, explanation? }. At least 2 entries."],
        ["  correct_ids_csv        Comma-separated option ids (1+ entries). Multi-correct = multi-select."],
        ["  multi_select           Optional override; implied true if correct_ids_csv has > 1 entry."],
        ["  shuffle_options        true|false. Defaults to true."],
        [""],
        ["Fill-in-the-Blank rows (type=fillblank)"],
        ["  language               Single language plugin slug. Required."],
        ["  blanks_json            JSON array of { id, answers[], matchMode?, hint?, placeholder? }."],
        ["                         matchMode is one of exact|ci|trim|regex (default ci)."],
        ["                         Reference blanks from prompt via {{<id>}} placeholders."],
        [""],
        ["Comparators (coding test cases)"],
        ["  trim_equal  Default. Compares stdout to expected_stdout after stripping outer whitespace."],
        ["  strict      Byte-exact match (including trailing newline)."],
        ["  json        Parses both sides as JSON and compares structurally."],
        ["  regex       expected_stdout is a regex; pass if it matches actual stdout."],
    ];
    const wsReadme = xlsx.utils.aoa_to_sheet(readme);
    wsReadme["!cols"] = [{ wch: 120 }];
    xlsx.utils.book_append_sheet(wb, wsReadme, "README");

    const out = xlsx.write(wb, { bookType: "xlsx", type: "array" });
    triggerDownload("assessment-questions-sample.xlsx", new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

// ── parse incoming file → AdminQuestionInput[] ─────────────────────────────
export async function parseImportFile(file: File): Promise<AdminQuestionInput[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
        const text = await file.text();
        return parseJsonText(text);
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
        const xlsx = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = xlsx.read(buf, { type: "array" });
        const sheetName = wb.SheetNames.find((n: string) => n.toLowerCase() === "questions") ?? wb.SheetNames[0];
        if (!sheetName) throw new Error("workbook has no sheets");
        const sheet = wb.Sheets[sheetName];
        const rows = (xlsx.utils.sheet_to_json as any)(sheet, { defval: "" }) as Array<Record<string, any>>;
        return rows.map((row: any, idx: number) => xlsxRowToQuestion(row, idx));
    }
    throw new Error(`Unsupported file type: ${file.name}. Use .xlsx or .json.`);
}

export function parseJsonText(text: string): AdminQuestionInput[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (err) {
        throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    let rows: unknown[] = [];
    if (parsed && typeof parsed === "object" && "questions" in parsed && Array.isArray((parsed as { questions: unknown }).questions)) {
        rows = (parsed as { questions: unknown[] }).questions;
    } else if (Array.isArray(parsed)) {
        rows = parsed;
    } else {
        throw new Error('JSON must be either an array of questions or { "questions": [ … ] }');
    }
    // Each row can be a Coding, MCQ, or Fill-in-the-Blank question. The shape
    // is discriminated by either `type` on the row itself, `body.type`, or the
    // explicit `plugin_slug`; normalizeJsonRow resolves all three forms into a
    // canonical AdminQuestionInput with the right plugin_slug.
    return rows.map((row, i) => normalizeJsonRow(row, i + 1));
}

function normalizeJsonRow(raw: unknown, rowNum: number): AdminQuestionInput {
    if (!raw || typeof raw !== "object") {
        throw new Error(`Row ${rowNum}: expected an object`);
    }
    const item = raw as Record<string, unknown> & { body?: Record<string, unknown> };
    const body = (item.body ?? {}) as Record<string, unknown>;

    // Resolve question type with priority: top-level `type` > body.type > pluginSlug.
    const topType = typeof item.type === "string" ? (item.type as string).toLowerCase() : undefined;
    const bodyType = typeof body.type === "string" ? (body.type as string).toLowerCase() : undefined;
    const slug = typeof item.plugin_slug === "string" ? (item.plugin_slug as string) : undefined;
    const inferred = topType ?? bodyType ?? slugToType(slug);

    if (!inferred) {
        throw new Error(
            `Row ${rowNum}: cannot tell question type — set "type": "coding" | "mcq" | "fillblank" or include "plugin_slug".`,
        );
    }

    switch (inferred) {
        case "coding":
            return {
                ...item,
                plugin_slug: "assessment.coding",
                body: { ...body, type: "coding" },
                test_cases: item.test_cases as AdminQuestionInput["test_cases"],
            } as unknown as AdminQuestionInput;
        case "mcq":
            return {
                ...item,
                plugin_slug: "assessment.mcq",
                body: { ...body, type: "mcq" },
            } as unknown as AdminQuestionInput;
        case "fillblank":
            return {
                ...item,
                plugin_slug: "assessment.fillblank",
                body: { ...body, type: "fillblank" },
            } as unknown as AdminQuestionInput;
        default:
            throw new Error(`Row ${rowNum}: unknown type "${inferred}" — expected coding|mcq|fillblank`);
    }
}

function slugToType(slug: string | undefined): "coding" | "mcq" | "fillblank" | undefined {
    switch (slug) {
        case "assessment.coding":
            return "coding";
        case "assessment.mcq":
            return "mcq";
        case "assessment.fillblank":
            return "fillblank";
        default:
            return undefined;
    }
}

function xlsxRowToQuestion(row: Record<string, unknown>, index: number): AdminQuestionInput {
    const rowNum = index + 2; // header is row 1
    const title = readString(row, "title");
    if (!title) throw new Error(`Row ${rowNum}: title is required`);
    const diffWord = readString(row, "difficulty").toLowerCase() as DifficultyWord;
    const difficulty = DIFFICULTY_TO_INT[diffWord];
    if (!difficulty) throw new Error(`Row ${rowNum}: difficulty must be easy|medium|hard, got '${diffWord}'`);
    const maxScore = readNumber(row, "max_score");
    if (!Number.isFinite(maxScore) || maxScore <= 0) throw new Error(`Row ${rowNum}: max_score must be a positive number`);

    // 'type' column dispatches between the three question types. A missing
    // type column is back-compat-shimmed to coding so older XLSX templates
    // (which had no type column) still import cleanly.
    const type = readString(row, "type").toLowerCase() || "coding";
    switch (type) {
        case "coding":
            return xlsxCodingRow(row, rowNum, title, diffWord, difficulty, maxScore);
        case "mcq":
            return xlsxMcqRow(row, rowNum, title, diffWord, difficulty, maxScore);
        case "fillblank":
            return xlsxFillBlankRow(row, rowNum, title, diffWord, difficulty, maxScore);
        default:
            throw new Error(`Row ${rowNum}: type must be coding|mcq|fillblank, got '${type}'`);
    }
}

function xlsxCodingRow(
    row: Record<string, unknown>,
    rowNum: number,
    title: string,
    diffWord: DifficultyWord,
    difficulty: number,
    maxScore: number,
): AdminQuestionInput {
    const allowedLanguages = readCsv(row, "allowed_languages_csv");
    if (allowedLanguages.length === 0) {
        throw new Error(`Row ${rowNum}: allowed_languages_csv must list at least one language slug`);
    }
    const testCases = parseJsonCell<AdminQuestionInput["test_cases"]>(row, "test_cases_json", rowNum);
    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new Error(`Row ${rowNum}: test_cases_json must be a non-empty JSON array`);
    }
    return {
        title,
        plugin_slug: "assessment.coding",
        difficulty,
        max_score: maxScore,
        body: {
            type: "coding",
            responseType: "code",
            title,
            section: readString(row, "section") || undefined,
            category: readString(row, "category") || undefined,
            difficulty: diffWord,
            mode: readString(row, "mode") || "main",
            tags: readCsv(row, "tags_csv"),
            promptFormat: readString(row, "prompt_format") || "markdown",
            prompt: readString(row, "prompt"),
            allowedLanguages,
            inputFormat: parseJsonCell(row, "input_format", rowNum, { optional: true }),
            outputFormat: parseJsonCell(row, "output_format", rowNum, { optional: true }),
            constraintsFormat: parseJsonCell(row, "constraints_format", rowNum, { optional: true }),
            starterCode: parseJsonCell(row, "starter_code_json", rowNum, { optional: true }) ?? undefined,
            hintsEnabled: readBool(row, "hints_enabled"),
            hints: parseJsonCell(row, "hints_json", rowNum, { optional: true }) ?? undefined,
        },
        test_cases: testCases,
    };
}

function xlsxMcqRow(
    row: Record<string, unknown>,
    rowNum: number,
    title: string,
    diffWord: DifficultyWord,
    difficulty: number,
    maxScore: number,
): AdminQuestionInput {
    const language = readString(row, "language") || "";
    if (!language) throw new Error(`Row ${rowNum}: language is required for mcq rows (e.g. language.python)`);
    const options = parseJsonCell<Array<{ id: string; text: string; explanation?: string }>>(
        row,
        "options_json",
        rowNum,
    );
    if (!Array.isArray(options) || options.length < 2) {
        throw new Error(`Row ${rowNum}: options_json must be a JSON array with at least 2 options`);
    }
    const correctIds = readCsv(row, "correct_ids_csv");
    if (correctIds.length === 0) {
        throw new Error(`Row ${rowNum}: correct_ids_csv must list at least one option id`);
    }
    return {
        title,
        plugin_slug: "assessment.mcq",
        difficulty,
        max_score: maxScore,
        body: {
            type: "mcq",
            title,
            section: readString(row, "section") || undefined,
            category: readString(row, "category") || undefined,
            difficulty: diffWord,
            mode: readString(row, "mode") || "main",
            tags: readCsv(row, "tags_csv"),
            promptFormat: readString(row, "prompt_format") || "markdown",
            prompt: readString(row, "prompt"),
            language,
            options,
            correctOptionIds: correctIds,
            multiSelect: readBool(row, "multi_select"),
            shuffleOptions: readString(row, "shuffle_options").toLowerCase() !== "false",
            explanation: readString(row, "explanation") || undefined,
        },
    };
}

function xlsxFillBlankRow(
    row: Record<string, unknown>,
    rowNum: number,
    title: string,
    diffWord: DifficultyWord,
    difficulty: number,
    maxScore: number,
): AdminQuestionInput {
    const language = readString(row, "language") || "";
    if (!language) throw new Error(`Row ${rowNum}: language is required for fillblank rows`);
    const blanks = parseJsonCell<
        Array<{ id: string; answers: string[]; matchMode?: string; hint?: string; placeholder?: string }>
    >(row, "blanks_json", rowNum);
    if (!Array.isArray(blanks) || blanks.length === 0) {
        throw new Error(`Row ${rowNum}: blanks_json must be a non-empty JSON array`);
    }
    return {
        title,
        plugin_slug: "assessment.fillblank",
        difficulty,
        max_score: maxScore,
        body: {
            type: "fillblank",
            title,
            section: readString(row, "section") || undefined,
            category: readString(row, "category") || undefined,
            difficulty: diffWord,
            mode: readString(row, "mode") || "main",
            tags: readCsv(row, "tags_csv"),
            promptFormat: readString(row, "prompt_format") || "markdown",
            prompt: readString(row, "prompt"),
            language,
            blanks,
            explanation: readString(row, "explanation") || undefined,
        },
    };
}

// ── small readers ──────────────────────────────────────────────────────────
function bodyField(q: AdminQuestionInput, key: string): unknown {
    const body = q.body as Record<string, unknown> | undefined;
    return body?.[key];
}

function jsonStringifyMaybe(v: unknown): string {
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
}

function readString(row: Record<string, unknown>, key: string): string {
    const v = row[key];
    if (v == null) return "";
    return String(v).trim();
}

function readNumber(row: Record<string, unknown>, key: string): number {
    const v = row[key];
    if (typeof v === "number") return v;
    const parsed = parseFloat(String(v));
    return Number.isFinite(parsed) ? parsed : NaN;
}

function readBool(row: Record<string, unknown>, key: string): boolean {
    const v = row[key];
    if (typeof v === "boolean") return v;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
}

function readCsv(row: Record<string, unknown>, key: string): string[] {
    const raw = readString(row, key);
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseJsonCell<T = unknown>(
    row: Record<string, unknown>,
    key: string,
    rowNum: number,
    opts?: { optional?: boolean },
): T {
    const raw = readString(row, key);
    if (!raw) {
        if (opts?.optional) return undefined as unknown as T;
        throw new Error(`Row ${rowNum}: column '${key}' is required and must be valid JSON`);
    }
    try {
        return JSON.parse(raw) as T;
    } catch (err) {
        throw new Error(`Row ${rowNum}: column '${key}' is not valid JSON — ${err instanceof Error ? err.message : String(err)}`);
    }
}
