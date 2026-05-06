import axios from "axios";

// This is a placeholder for your actual code execution integration (e.g. Judge0 API)
// If using actual Judge0:
/*
const JUDGE0_URL = process.env.JUDGE0_API_URL;
const JUDGE0_KEY = process.env.JUDGE0_API_KEY;

const languageMap: Record<string, number> = {
    python: 71,
    javascript: 63,
    cpp: 54,
    java: 62,
    c: 50
};
*/

export const executeCode = async (code: string, language: string, testCases: any[]) => {
    // Currently simulates standard output since real IDE container logic needs to be connected
    // This replicates the flow currently seen in `simulateRun.ts`
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fake logic for demonstration:
    const hasSyntaxError = code.includes("syntax error");
    if (hasSyntaxError) {
        return {
            type: "error",
            stdout: "",
            stderr: "SyntaxError: invalid syntax",
            testResults: testCases?.map(tc => ({ ...tc, passed: false, actual: "", time: "0ms" })),
            time: "0ms",
            memory: "0 MB"
        };
    }

    if (testCases && testCases.length > 0) {
        // Run against testcases
        const results = testCases.map((tc, idx) => {
            const passed = true; // Placeholder: Replace directly checking with isolated run outputs
            return {
                ...tc,
                passed,
                actual: passed ? tc.expected : "Output missing",
                time: Math.floor(Math.random() * 5 + 1) + "ms"
            };
        });

        const allPassed = results.every(r => r.passed);
        
        return {
            type: allPassed ? "success" : "error",
            stdout: `Ran ${results.length} tests successfully.\n`,
            stderr: "",
            testResults: results,
            time: "15ms",
            memory: "16 MB"
        };
    }

    return {
        type: "success",
        stdout: "Execution finished with code 0\n",
        stderr: "",
        testResults: null,
        time: "15ms",
        memory: "16 MB"
    };
};
