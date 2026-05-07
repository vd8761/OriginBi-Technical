// Build a Judge0 "Multi-file program" (language ID 89) submission archive.
// Judge0 expects source_code to be a base64 zip containing all project files
// plus a `run` script (and optional `compile` script) at the archive root.

import JSZip from "jszip";
import type { FileNode } from "@/components/assessment/coding/data";

interface BuildScripts {
    compile?: string;
    run: string;
    extraFiles?: { path: string; content: string }[];
}

const javaMainClassFromFiles = (files: FileNode[], entryFile?: string): string => {
    if (entryFile) {
        const base = entryFile.split("/").pop() ?? entryFile;
        if (base.endsWith(".java")) return base.slice(0, -".java".length);
    }
    for (const f of files) {
        if (!f.path.endsWith(".java")) continue;
        const m = f.content.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
        if (m) return m[1];
    }
    return "Main";
};

const scriptsFor = (
    lang: string,
    files: FileNode[],
    entryFile?: string,
): BuildScripts => {
    const entry = entryFile ?? files.find((f) => !f.readOnly)?.path ?? files[0]?.path;
    switch (lang) {
        case "python":
            return { run: `#!/bin/sh\nexec python3 "${entry}"\n` };
        case "javascript":
            return {
                run: `#!/bin/sh\nexec node "${entry}"\n`,
                // Pin CommonJS so `require('./helpers.js')` resolves predictably
                // regardless of the Node version Judge0 ships.
                extraFiles: [
                    { path: "package.json", content: `{"type":"commonjs"}\n` },
                ],
            };
        case "java": {
            const mainClass = javaMainClassFromFiles(files, entryFile);
            return {
                compile: `#!/bin/sh\nset -e\njavac $(find . -name '*.java')\n`,
                run: `#!/bin/sh\nexec java -cp . ${mainClass}\n`,
            };
        }
        case "cpp":
            return {
                compile: `#!/bin/sh\nset -e\ng++ -O2 -std=c++17 $(find . -name '*.cpp') -o main\n`,
                run: `#!/bin/sh\nexec ./main\n`,
            };
        case "c":
            return {
                compile: `#!/bin/sh\nset -e\ngcc -O2 $(find . -name '*.c') -o main\n`,
                run: `#!/bin/sh\nexec ./main\n`,
            };
        default:
            return { run: `#!/bin/sh\nexec cat "${entry}"\n` };
    }
};

export interface BuildBundleResult {
    base64Zip: string;
}

export async function buildBundle(
    lang: string,
    files: FileNode[],
    entryFile?: string,
): Promise<BuildBundleResult> {
    const zip = new JSZip();
    for (const f of files) {
        zip.file(f.path, f.content ?? "");
    }
    const scripts = scriptsFor(lang, files, entryFile);
    // unixPermissions: 0o755 marks the script as executable when isolate extracts.
    zip.file("run", scripts.run, { unixPermissions: 0o755 });
    if (scripts.compile) {
        zip.file("compile", scripts.compile, { unixPermissions: 0o755 });
    }
    for (const ef of scripts.extraFiles ?? []) {
        zip.file(ef.path, ef.content);
    }
    const blob = await zip.generateAsync({
        type: "base64",
        platform: "UNIX",
        compression: "DEFLATE",
    });
    return { base64Zip: blob };
}
