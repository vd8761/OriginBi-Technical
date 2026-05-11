export type QuestionType = "code-pretext" | "image" | "media" | "mcq";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface TestCase {
    input: string;
    expected: string;
    stdin?: string;
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

export interface FileNode {
    path: string;
    content: string;
    readOnly?: boolean;
    language?: string;
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
    starterFiles?: Record<string, FileNode[]>;
    entryFile?: Record<string, string>;
    testCases?: TestCase[];
    limits?: Partial<ExecutionLimits>;
}

// ---------------------------------------------------------------------------
// Starter code conventions
// ---------------------------------------------------------------------------
// All non-MCQ questions use stdin/stdout. Each `testCases` entry has a `stdin`
// string fed to the program and an `expected` string compared (after trim)
// against stdout. The `input` field is kept for human display only.
// ---------------------------------------------------------------------------

const twoSumPythonSolution = `from helpers import build_index


def twoSum(nums, target):
    # Write your solution here.
    # Hint: build_index(nums) gives you an O(n) value -> index map.
    pass


if __name__ == "__main__":
    nums = list(map(int, input().split()))
    target = int(input())
    result = twoSum(nums, target)
    print(result)
`;

const twoSumPythonHelpers = `def build_index(nums):
    """Return a {value: last_index} map for the input list."""
    return {v: i for i, v in enumerate(nums)}
`;

const twoSumJsSolution = `const { buildIndex } = require('./helpers.js');

function twoSum(nums, target) {
    // Write your solution here.
    // Hint: buildIndex(nums) gives you an O(n) value -> index map.
}

const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
const nums = lines[0].split(' ').map(Number);
const target = parseInt(lines[1], 10);
const result = twoSum(nums, target);
console.log('[' + (result || []).join(', ') + ']');
`;

const twoSumJsHelpers = `function buildIndex(nums) {
    const map = new Map();
    nums.forEach((v, i) => map.set(v, i));
    return map;
}

module.exports = { buildIndex };
`;

const twoSumJavaStarter = `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int target = Integer.parseInt(sc.nextLine().trim());
        int[] r = twoSum(nums, target);
        System.out.println(Arrays.toString(r));
    }
}
`;

const twoSumCppStarter = `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Write your solution here
    return {};
}

int main() {
    string line; getline(cin, line);
    stringstream ss(line);
    vector<int> nums; int x;
    while (ss >> x) nums.push_back(x);
    int target; cin >> target;
    auto r = twoSum(nums, target);
    cout << "[";
    for (size_t i = 0; i < r.size(); i++) {
        if (i) cout << ", ";
        cout << r[i];
    }
    cout << "]" << endl;
    return 0;
}
`;

const twoSumCStarter = `#include <stdio.h>
#include <stdlib.h>

int* twoSum(int* nums, int n, int target, int* returnSize) {
    // Write your solution here
    *returnSize = 0;
    return NULL;
}

int main() {
    int nums[10000]; int n = 0; int x; int ch;
    while (scanf("%d", &x) == 1) {
        nums[n++] = x;
        ch = getchar();
        if (ch == '\\n' || ch == EOF) break;
    }
    int target;
    scanf("%d", &target);
    int rs;
    int* r = twoSum(nums, n, target, &rs);
    printf("[");
    for (int i = 0; i < rs; i++) {
        if (i) printf(", ");
        printf("%d", r[i]);
    }
    printf("]\\n");
    return 0;
}
`;

const stackPythonStarter = `class MyDataStructure:
    def __init__(self):
        self.data = []

    def push(self, val):
        # Implement here
        pass

    def pop(self):
        # Implement here
        pass

    def peek(self):
        # Implement here
        pass


if __name__ == "__main__":
    import sys
    ds = MyDataStructure()
    for raw in sys.stdin.read().splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        op = parts[0]
        if op == "push":
            ds.push(int(parts[1]))
        elif op == "pop":
            print(ds.pop())
        elif op == "peek":
            print(ds.peek())
`;

const stackJsStarter = `class MyDataStructure {
    constructor() { this.data = []; }
    push(val) { /* Implement here */ }
    pop() { /* Implement here */ }
    peek() { /* Implement here */ }
}

const lines = require('fs').readFileSync(0, 'utf8').split('\\n');
const ds = new MyDataStructure();
for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\\s+/);
    const op = parts[0];
    if (op === 'push') ds.push(parseInt(parts[1], 10));
    else if (op === 'pop') console.log(ds.pop());
    else if (op === 'peek') console.log(ds.peek());
}
`;

const stackJavaStarter = `import java.util.*;

public class Main {
    static Deque<Integer> data = new ArrayDeque<>();

    static void push(int val) { /* Implement here */ }
    static Integer pop() { return null; /* Implement here */ }
    static Integer peek() { return null; /* Implement here */ }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] parts = line.split("\\\\s+");
            switch (parts[0]) {
                case "push": push(Integer.parseInt(parts[1])); break;
                case "pop": System.out.println(pop()); break;
                case "peek": System.out.println(peek()); break;
            }
        }
    }
}
`;

const stackCppStarter = `#include <bits/stdc++.h>
using namespace std;

class MyDataStructure {
public:
    vector<int> data;
    void push(int val) { /* Implement here */ }
    int pop() { /* Implement here */ return 0; }
    int peek() { /* Implement here */ return 0; }
};

int main() {
    MyDataStructure ds;
    string line;
    while (getline(cin, line)) {
        if (line.empty()) continue;
        stringstream ss(line);
        string op; ss >> op;
        if (op == "push") { int v; ss >> v; ds.push(v); }
        else if (op == "pop") cout << ds.pop() << endl;
        else if (op == "peek") cout << ds.peek() << endl;
    }
    return 0;
}
`;

const stackCStarter = `#include <stdio.h>
#include <string.h>

#define MAX 1000
int data[MAX];
int top = -1;

void push(int val) { /* Implement here */ }
int pop() { /* Implement here */ return 0; }
int peek() { /* Implement here */ return 0; }

int main() {
    char op[16]; int v;
    while (scanf("%15s", op) == 1) {
        if (strcmp(op, "push") == 0) {
            scanf("%d", &v);
            push(v);
        } else if (strcmp(op, "pop") == 0) {
            printf("%d\\n", pop());
        } else if (strcmp(op, "peek") == 0) {
            printf("%d\\n", peek());
        }
    }
    return 0;
}
`;

const bubblePythonStarter = `def bubble_sort(arr):
    # Implement optimized bubble sort (early exit when sorted)
    pass


if __name__ == "__main__":
    arr = list(map(int, input().split()))
    bubble_sort(arr)
    print(" ".join(str(x) for x in arr))
`;

const bubbleJsStarter = `function bubbleSort(arr) {
    // Implement optimized bubble sort (early exit when sorted)
    return arr;
}

const arr = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const sorted = bubbleSort(arr);
console.log(sorted.join(' '));
`;

const bubbleJavaStarter = `import java.util.*;

public class Main {
    static void bubbleSort(int[] arr) {
        // Implement optimized bubble sort (early exit when sorted)
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i]);
        bubbleSort(arr);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(arr[i]);
        }
        System.out.println(sb.toString());
    }
}
`;

const bubbleCppStarter = `#include <bits/stdc++.h>
using namespace std;

void bubbleSort(vector<int>& arr) {
    // Implement optimized bubble sort (early exit when sorted)
}

int main() {
    string line; getline(cin, line);
    stringstream ss(line);
    vector<int> arr; int x;
    while (ss >> x) arr.push_back(x);
    bubbleSort(arr);
    for (size_t i = 0; i < arr.size(); i++) {
        if (i) cout << ' ';
        cout << arr[i];
    }
    cout << endl;
    return 0;
}
`;

const bubbleCStarter = `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    // Implement optimized bubble sort (early exit when sorted)
}

int main() {
    int arr[10000]; int n = 0; int x; int ch;
    while (scanf("%d", &x) == 1) {
        arr[n++] = x;
        ch = getchar();
        if (ch == '\\n' || ch == EOF) break;
    }
    bubbleSort(arr, n);
    for (int i = 0; i < n; i++) {
        if (i) printf(" ");
        printf("%d", arr[i]);
    }
    printf("\\n");
    return 0;
}
`;

const lcsPythonStarter = `def longestCommonSubsequence(text1: str, text2: str) -> int:
    # Write your solution here
    return 0


if __name__ == "__main__":
    text1 = input().strip()
    text2 = input().strip()
    print(longestCommonSubsequence(text1, text2))
`;

const lcsJsStarter = `function longestCommonSubsequence(text1, text2) {
    // Write your solution here
    return 0;
}

const lines = require('fs').readFileSync(0, 'utf8').split('\\n');
const text1 = (lines[0] || '').trim();
const text2 = (lines[1] || '').trim();
console.log(longestCommonSubsequence(text1, text2));
`;

const lcsJavaStarter = `import java.util.*;

public class Main {
    static int longestCommonSubsequence(String text1, String text2) {
        // Write your solution here
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String text1 = sc.nextLine().trim();
        String text2 = sc.nextLine().trim();
        System.out.println(longestCommonSubsequence(text1, text2));
    }
}
`;

const lcsCppStarter = `#include <bits/stdc++.h>
using namespace std;

int longestCommonSubsequence(string text1, string text2) {
    // Write your solution here
    return 0;
}

int main() {
    string text1, text2;
    getline(cin, text1);
    getline(cin, text2);
    cout << longestCommonSubsequence(text1, text2) << endl;
    return 0;
}
`;

const lcsCStarter = `#include <stdio.h>
#include <string.h>

int longestCommonSubsequence(char* text1, char* text2) {
    // Write your solution here
    return 0;
}

int main() {
    char text1[2048], text2[2048];
    if (!fgets(text1, sizeof(text1), stdin)) return 0;
    if (!fgets(text2, sizeof(text2), stdin)) return 0;
    text1[strcspn(text1, "\\r\\n")] = 0;
    text2[strcspn(text2, "\\r\\n")] = 0;
    printf("%d\\n", longestCommonSubsequence(text1, text2));
    return 0;
}
`;

export const QUESTIONS: Question[] = [
    {
        id: 1,
        type: "code-pretext",
        difficulty: "Easy",
        marks: 10,
        section: "Arrays & Hashing",
        title: "Two Sum",
        prompt:
            "Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>. Read <code>nums</code> on the first line (space-separated) and <code>target</code> on the second line. Print the answer as <code>[i, j]</code>.",
        pretext: {
            language: "python",
            code: `# Input format
# Line 1: space-separated nums
# Line 2: target

# Example
# 2 7 11 15
# 9
# Output: [0, 1]

# Constraints:
# 2 <= nums.length <= 10^4
# -10^9 <= nums[i] <= 10^9
# Only one valid answer exists.`,
        },
        starterCode: {
            python: `def twoSum(nums, target):\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    nums = list(map(int, input().split()))\n    target = int(input())\n    print(twoSum(nums, target))\n`,
            javascript: twoSumJsSolution.replace(
                /const \{ buildIndex \} = require\('\.\/helpers\.js'\);\n\n/,
                "",
            ),
            java: twoSumJavaStarter,
            cpp: twoSumCppStarter,
            c: twoSumCStarter,
        },
        starterFiles: {
            python: [
                {
                    path: "solution.py",
                    content: twoSumPythonSolution,
                },
                {
                    path: "helpers.py",
                    content: twoSumPythonHelpers,
                },
                {
                    path: "README.md",
                    readOnly: true,
                    language: "markdown",
                    content: `# Two Sum\n\n- Edit \`solution.py\` to implement \`twoSum\`.\n- \`helpers.py\` is a starter helper you can use or replace.\n- The program reads \`nums\` (line 1) and \`target\` (line 2) from stdin and prints the result list.\n`,
                },
            ],
            javascript: [
                {
                    path: "solution.js",
                    content: twoSumJsSolution,
                },
                {
                    path: "helpers.js",
                    content: twoSumJsHelpers,
                },
                {
                    path: "README.md",
                    readOnly: true,
                    language: "markdown",
                    content: `# Two Sum\n\nImplement \`twoSum\` in \`solution.js\`. \`helpers.js\` is provided as a starting point.\n`,
                },
            ],
        },
        entryFile: {
            python: "solution.py",
            javascript: "solution.js",
        },
        testCases: [
            {
                input: "nums = [2,7,11,15], target = 9",
                expected: "[0, 1]",
                stdin: "2 7 11 15\n9",
            },
            {
                input: "nums = [3,2,4], target = 6",
                expected: "[1, 2]",
                stdin: "3 2 4\n6",
            },
            {
                input: "nums = [3,3], target = 6",
                expected: "[0, 1]",
                stdin: "3 3\n6",
            },
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
            "Study the diagram below. Identify the LIFO data structure and implement a class with <code>push</code>, <code>pop</code>, and <code>peek</code> operations. Each line of input is one operation: <code>push N</code>, <code>pop</code>, or <code>peek</code>. Print the result of every <code>pop</code> / <code>peek</code> on its own line.",
        image: {
            url: null,
            caption: "Figure 1: A sequence of insert and delete operations on a data structure",
            alt: "Data structure diagram showing LIFO operations",
        },
        starterCode: {
            python: stackPythonStarter,
            javascript: stackJsStarter,
            java: stackJavaStarter,
            cpp: stackCppStarter,
            c: stackCStarter,
        },
        testCases: [
            {
                input: "push 1; push 2; peek",
                expected: "2",
                stdin: "push 1\npush 2\npeek",
            },
            {
                input: "push 1; pop; push 5; peek",
                expected: "5",
                stdin: "push 1\npop\npush 5\npeek",
            },
            {
                input: "push 7; push 8; pop; peek",
                expected: "8\n7",
                stdin: "push 7\npush 8\npop\npeek",
            },
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
            "Implement Bubble Sort with the optimization that stops early when the array becomes sorted. Read a single line of space-separated integers from stdin and print the sorted array as space-separated integers.",
        media: {
            type: "video",
            embedUrl: null,
            caption: "Video: Bubble Sort — Step by Step Explanation",
        },
        starterCode: {
            python: bubblePythonStarter,
            javascript: bubbleJsStarter,
            java: bubbleJavaStarter,
            cpp: bubbleCppStarter,
            c: bubbleCStarter,
        },
        testCases: [
            {
                input: "[64, 34, 25, 12, 22, 11, 90]",
                expected: "11 12 22 25 34 64 90",
                stdin: "64 34 25 12 22 11 90",
            },
            {
                input: "[5, 1, 4, 2, 8]",
                expected: "1 2 4 5 8",
                stdin: "5 1 4 2 8",
            },
            {
                input: "[1, 2, 3]",
                expected: "1 2 3",
                stdin: "1 2 3",
            },
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
            "Given two strings <code>text1</code> and <code>text2</code> on two separate input lines, print the length of their longest common subsequence.",
        pretext: {
            language: "python",
            code: `# Input format
# Line 1: text1
# Line 2: text2

# Examples
# abcde
# ace
# Output: 3

# abc
# def
# Output: 0

# Constraints:
# 1 <= text1.length, text2.length <= 1000
# Only lowercase English letters.`,
        },
        starterCode: {
            python: lcsPythonStarter,
            javascript: lcsJsStarter,
            java: lcsJavaStarter,
            cpp: lcsCppStarter,
            c: lcsCStarter,
        },
        testCases: [
            {
                input: 'text1 = "abcde", text2 = "ace"',
                expected: "3",
                stdin: "abcde\nace",
            },
            {
                input: 'text1 = "abc", text2 = "abc"',
                expected: "3",
                stdin: "abc\nabc",
            },
            {
                input: 'text1 = "abc", text2 = "def"',
                expected: "0",
                stdin: "abc\ndef",
            },
        ],
    },
];

export const TOTAL_TIME_SECONDS = 90 * 60;
