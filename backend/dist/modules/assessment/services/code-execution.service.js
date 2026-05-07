"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CodeExecutionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeExecutionService = void 0;
const common_1 = require("@nestjs/common");
let CodeExecutionService = CodeExecutionService_1 = class CodeExecutionService {
    logger = new common_1.Logger(CodeExecutionService_1.name);
    // This is a placeholder for your actual code execution integration (e.g. Judge0 API)
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
    async executeCode(code, language, testCases) {
        // Currently simulates standard output since real IDE container logic needs to be connected
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Fake logic for demonstration:
        const hasSyntaxError = code.includes('syntax error');
        if (hasSyntaxError) {
            return {
                type: 'error',
                stdout: '',
                stderr: 'SyntaxError: invalid syntax',
                testResults: testCases?.map((tc) => ({
                    ...tc,
                    passed: false,
                    actual: '',
                    time: '0ms',
                })),
                time: '0ms',
                memory: '0 MB',
            };
        }
        if (testCases && testCases.length > 0) {
            // Run against testcases
            const results = testCases.map((tc, idx) => {
                const passed = true; // Placeholder: Replace directly checking with isolated run outputs
                return {
                    ...tc,
                    passed,
                    actual: passed ? tc.expected : 'Output missing',
                    time: Math.floor(Math.random() * 5 + 1) + 'ms',
                };
            });
            const allPassed = results.every((r) => r.passed);
            return {
                type: allPassed ? 'success' : 'error',
                stdout: `Ran ${results.length} tests successfully.\n`,
                stderr: '',
                testResults: results,
                time: '15ms',
                memory: '16 MB',
            };
        }
        return {
            type: 'success',
            stdout: 'Execution finished with code 0\n',
            stderr: '',
            testResults: null,
            time: '15ms',
            memory: '16 MB',
        };
    }
};
exports.CodeExecutionService = CodeExecutionService;
exports.CodeExecutionService = CodeExecutionService = CodeExecutionService_1 = __decorate([
    (0, common_1.Injectable)()
], CodeExecutionService);
