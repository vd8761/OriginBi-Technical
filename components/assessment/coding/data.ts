export type QuestionType = "code-pretext" | "image" | "media" | "mcq";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface TestCase {
    input: string;
    expected: string;
}

export interface ExecutionLimits {
    compileTimeoutMs: number;
    runtimeTimeoutMs: number;
    memoryLimitMB: number;
    maxOutputBytes: number;
    maxSourceBytes: number;
    stackLimitMB: number;
    maxProcesses: number;
    maxOpenFiles: number;
}

export const DEFAULT_LIMITS_BY_LANG: Record<string, ExecutionLimits> = {
    python: {
        compileTimeoutMs: 4000,
        runtimeTimeoutMs: 5000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 64 * 1024,
        stackLimitMB: 16,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
    javascript: {
        compileTimeoutMs: 4000,
        runtimeTimeoutMs: 5000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 64 * 1024,
        stackLimitMB: 16,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
    java: {
        compileTimeoutMs: 8000,
        runtimeTimeoutMs: 6000,
        memoryLimitMB: 512,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 96 * 1024,
        stackLimitMB: 64,
        maxProcesses: 64,
        maxOpenFiles: 24,
    },
    cpp: {
        compileTimeoutMs: 10000,
        runtimeTimeoutMs: 4000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 96 * 1024,
        stackLimitMB: 64,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
    c: {
        compileTimeoutMs: 8000,
        runtimeTimeoutMs: 4000,
        memoryLimitMB: 256,
        maxOutputBytes: 64 * 1024,
        maxSourceBytes: 64 * 1024,
        stackLimitMB: 64,
        maxProcesses: 32,
        maxOpenFiles: 16,
    },
};

export const FALLBACK_LIMITS: ExecutionLimits = DEFAULT_LIMITS_BY_LANG.python;

export function getLimitsFor(lang: string, override?: Partial<ExecutionLimits>): ExecutionLimits {
    const base = DEFAULT_LIMITS_BY_LANG[lang] ?? FALLBACK_LIMITS;
    return { ...base, ...(override ?? {}) };
}

export interface Question {
    id: number;
    type: QuestionType;
    difficulty: Difficulty;
    marks: number;
    section: string;
    title: string;
    prompt: string;
    pretext?: { language: string; code: string };
    image?: { url: string | null; caption: string; alt: string };
    media?: { type: "video"; embedUrl: string | null; caption: string };
    options?: string[];
    correct?: number;
    explanation?: string;
    starterCode?: Record<string, string>;
    testCases?: TestCase[];
    limits?: Partial<ExecutionLimits>;
}

export const QUESTIONS: Question[] = [
    {
        id: 1,
        type: "code-pretext",
        difficulty: "Easy",
        marks: 10,
        section: "Arrays & Hashing",
        title: "Two Sum",
        prompt:
            "Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.",
        pretext: {
            language: "python",
            code: `# Example Input / Output
nums = [2, 7, 11, 15]
target = 9

# Output: [0, 1]
# Explanation: nums[0] + nums[1] == 9, so return [0, 1]

# Constraints:
# 2 <= nums.length <= 10^4
# -10^9 <= nums[i] <= 10^9
# Only one valid answer exists.`,
        },
        starterCode: {
            python: `def twoSum(nums, target):\n    # Write your solution here\n    pass`,
            javascript: `function twoSum(nums, target) {\n    // Write your solution here\n}`,
            java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}`,
            cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};`,
            c: `#include <stdlib.h>\n\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // Write your solution here\n    *returnSize = 0;\n    return NULL;\n}`,
        },
        testCases: [
            { input: "nums = [2,7,11,15], target = 9", expected: "[0,1]" },
            { input: "nums = [3,2,4], target = 6", expected: "[1,2]" },
            { input: "nums = [3,3], target = 6", expected: "[0,1]" },
        ],
    },
    {
        id: 2,
        type: "image",
        difficulty: "Medium",
        marks: 20,
        section: "Data Structures",
        title: "Identify the Data Structure",
        prompt:
            "Study the diagram below. Identify what data structure is represented and write a class that implements it with <code>push</code>, <code>pop</code>, and <code>peek</code> operations.",
        image: {
            url: null,
            caption: "Figure 1: A sequence of insert and delete operations on a data structure",
            alt: "Data structure diagram showing LIFO operations",
        },
        starterCode: {
            python: `class MyDataStructure:\n    def __init__(self):\n        self.data = []\n    \n    def push(self, val):\n        # Implement here\n        pass\n    \n    def pop(self):\n        # Implement here\n        pass\n    \n    def peek(self):\n        # Implement here\n        pass`,
            javascript: `class MyDataStructure {\n    constructor() {\n        this.data = [];\n    }\n    push(val) { }\n    pop() { }\n    peek() { }\n}`,
            java: `class MyDataStructure {\n    private Stack<Integer> data = new Stack<>();\n    \n    public void push(int val) { }\n    public int pop() { return 0; }\n    public int peek() { return 0; }\n}`,
            cpp: `class MyDataStructure {\nprivate:\n    vector<int> data;\npublic:\n    void push(int val) { }\n    int pop() { return 0; }\n    int peek() { return 0; }\n};`,
            c: `#include <stdio.h>\n\n#define MAX 1000\nint data[MAX];\nint top = -1;\n\nvoid push(int val) { /* TODO */ }\nint pop() { /* TODO */ return 0; }\nint peek() { /* TODO */ return 0; }`,
        },
        testCases: [
            { input: "push(1), push(2), peek()", expected: "2" },
            { input: "push(1), pop(), peek()", expected: "1" },
        ],
    },
    {
        id: 3,
        type: "media",
        difficulty: "Medium",
        marks: 15,
        section: "Algorithms",
        title: "Implement the Algorithm",
        prompt:
            "Watch the short video explanation of Bubble Sort below. Then implement the algorithm in your chosen language with an optimization that stops early if the array is already sorted.",
        media: {
            type: "video",
            embedUrl: null,
            caption: "Video: Bubble Sort — Step by Step Explanation",
        },
        starterCode: {
            python: `def bubble_sort(arr):\n    n = len(arr)\n    # Implement optimized bubble sort\n    pass\n\n# Test\nprint(bubble_sort([64, 34, 25, 12, 22, 11, 90]))`,
            javascript: `function bubbleSort(arr) {\n    // Implement optimized bubble sort\n    return arr;\n}\n\nconsole.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));`,
            java: `import java.util.Arrays;\n\nclass Solution {\n    public int[] bubbleSort(int[] arr) {\n        // Implement optimized bubble sort\n        return arr;\n    }\n}`,
            cpp: `#include <vector>\nusing namespace std;\n\nvector<int> bubbleSort(vector<int> arr) {\n    // Implement optimized bubble sort\n    return arr;\n}`,
            c: `#include <stdio.h>\n\nvoid bubbleSort(int arr[], int n) {\n    // Implement optimized bubble sort\n}`,
        },
        testCases: [
            { input: "[64, 34, 25, 12, 22, 11, 90]", expected: "[11, 12, 22, 25, 34, 64, 90]" },
            { input: "[5, 1, 4, 2, 8]", expected: "[1, 2, 4, 5, 8]" },
            { input: "[1, 2, 3]", expected: "[1, 2, 3]" },
        ],
    },
    {
        id: 4,
        type: "mcq",
        difficulty: "Easy",
        marks: 5,
        section: "Complexity Analysis",
        title: "Time Complexity",
        prompt: "What is the time complexity of the following code snippet?",
        pretext: {
            language: "python",
            code: `def mystery(n):\n    result = 0\n    i = 1\n    while i < n:\n        result += i\n        i *= 2\n    return result`,
        },
        options: ["O(n)", "O(log n)", "O(n log n)", "O(n²)"],
        correct: 1,
        explanation:
            "The variable i doubles each iteration (i *= 2), so the loop runs log₂(n) times — O(log n).",
    },
    {
        id: 5,
        type: "code-pretext",
        difficulty: "Hard",
        marks: 30,
        section: "Dynamic Programming",
        title: "Longest Common Subsequence",
        prompt:
            "Given two strings <code>text1</code> and <code>text2</code>, return the length of their longest common subsequence. A subsequence is a sequence derived by deleting some characters without changing the relative order.",
        pretext: {
            language: "python",
            code: `# Example 1:
# Input: text1 = "abcde", text2 = "ace"
# Output: 3
# Explanation: The LCS is "ace" — length 3.

# Example 2:
# Input: text1 = "abc", text2 = "abc"
# Output: 3

# Example 3:
# Input: text1 = "abc", text2 = "def"
# Output: 0

# Constraints:
# 1 <= text1.length, text2.length <= 1000
# text1 and text2 consist of only lowercase English characters.`,
        },
        starterCode: {
            python: `def longestCommonSubsequence(text1: str, text2: str) -> int:\n    # Write your solution here\n    pass`,
            javascript: `function longestCommonSubsequence(text1, text2) {\n    // Write your solution here\n}`,
            java: `class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        // Write your solution here\n        return 0;\n    }\n}`,
            cpp: `class Solution {\npublic:\n    int longestCommonSubsequence(string text1, string text2) {\n        // Write your solution here\n        return 0;\n    }\n};`,
            c: `#include <string.h>\n\nint longestCommonSubsequence(char* text1, char* text2) {\n    // Write your solution here\n    return 0;\n}`,
        },
        testCases: [
            { input: 'text1 = "abcde", text2 = "ace"', expected: "3" },
            { input: 'text1 = "abc", text2 = "abc"', expected: "3" },
            { input: 'text1 = "abc", text2 = "def"', expected: "0" },
        ],
    },
];

export const TOTAL_TIME_SECONDS = 90 * 60;
