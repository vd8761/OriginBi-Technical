-- +goose Up
-- =====================================================================
-- 011 - Candidate-safe coding question payloads and final testcase seed.
-- =====================================================================

ALTER TABLE code_submission_files
    ADD COLUMN IF NOT EXISTS language TEXT;

UPDATE question_versions
SET body = $json$
{
  "type": "coding",
  "responseType": "code",
  "difficulty": "easy",
  "section": "Arrays & Hashing",
  "title": "Two Sum",
  "prompt": "Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>. Read <code>nums</code> on the first line and <code>target</code> on the second line. Print the answer as <code>[i, j]</code>.",
  "pretext": {
    "language": "text",
    "code": "Input format:\nLine 1: space-separated nums\nLine 2: target\n\nOnly one valid answer exists."
  },
  "starterCode": {
    "python": "def two_sum(nums, target):\n    # Write your solution here.\n    return []\n\nif __name__ == \"__main__\":\n    nums = list(map(int, input().split()))\n    target = int(input())\n    print(two_sum(nums, target))\n",
    "javascript": "function twoSum(nums, target) {\n    // Write your solution here.\n    return [];\n}\n\nconst lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\nconsole.log('[' + twoSum(nums, target).join(', ') + ']');\n",
    "java": "import java.util.*;\n\npublic class Main {\n    static int[] twoSum(int[] nums, int target) {\n        // Write your solution here.\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        int target = Integer.parseInt(sc.nextLine().trim());\n        System.out.println(Arrays.toString(twoSum(nums, target)));\n    }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your solution here.\n    return {};\n}\n\nint main() {\n    string line; getline(cin, line);\n    stringstream ss(line);\n    vector<int> nums; int x;\n    while (ss >> x) nums.push_back(x);\n    int target; cin >> target;\n    auto ans = twoSum(nums, target);\n    cout << \"[\";\n    for (size_t i = 0; i < ans.size(); i++) { if (i) cout << \", \"; cout << ans[i]; }\n    cout << \"]\\n\";\n}\n",
    "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint* twoSum(int* nums, int n, int target, int* returnSize) {\n    // Write your solution here.\n    *returnSize = 0;\n    return NULL;\n}\n\nint main() {\n    int nums[10000], n = 0, x, ch;\n    while (scanf(\"%d\", &x) == 1) { nums[n++] = x; ch = getchar(); if (ch == '\\n' || ch == EOF) break; }\n    int target; scanf(\"%d\", &target);\n    int returnSize = 0;\n    int* ans = twoSum(nums, n, target, &returnSize);\n    printf(\"[\");\n    for (int i = 0; i < returnSize; i++) { if (i) printf(\", \"); printf(\"%d\", ans[i]); }\n    printf(\"]\\n\");\n    free(ans);\n}\n"
  },
  "starterFiles": {
    "python": [
      {"path":"solution.py","content":"from helpers import build_index\n\n\ndef two_sum(nums, target):\n    # Write your solution here.\n    return []\n\n\nif __name__ == \"__main__\":\n    nums = list(map(int, input().split()))\n    target = int(input())\n    print(two_sum(nums, target))\n"},
      {"path":"helpers.py","content":"def build_index(nums):\n    return {value: index for index, value in enumerate(nums)}\n"},
      {"path":"README.md","content":"Edit solution.py. helpers.py is available if you want a value-to-index map.\n","readOnly":true,"language":"markdown"}
    ],
    "javascript": [
      {"path":"solution.js","content":"const { buildIndex } = require('./helpers.js');\n\nfunction twoSum(nums, target) {\n    // Write your solution here.\n    return [];\n}\n\nconst lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\nconsole.log('[' + twoSum(nums, target).join(', ') + ']');\n"},
      {"path":"helpers.js","content":"function buildIndex(nums) {\n    const map = new Map();\n    nums.forEach((value, index) => map.set(value, index));\n    return map;\n}\n\nmodule.exports = { buildIndex };\n"}
    ]
  },
  "entryFile": {"python":"solution.py","javascript":"solution.js"}
}
$json$::jsonb
WHERE id = '00000000-0000-0000-0000-000000000620';

UPDATE question_versions
SET body = $json$
{
  "type": "coding",
  "responseType": "code",
  "difficulty": "medium",
  "section": "Data Structures",
  "title": "Identify the Data Structure",
  "prompt": "Implement a LIFO data structure with <code>push</code>, <code>pop</code>, and <code>peek</code>. Each input line is one operation. Print the result of every <code>pop</code> and <code>peek</code>.",
  "image": {"url": null, "caption": "Figure 1: LIFO push and pop operations", "alt": "Stack-style last-in first-out operations"},
  "starterCode": {
    "python": "class MyDataStructure:\n    def __init__(self):\n        self.data = []\n\n    def push(self, val):\n        pass\n\n    def pop(self):\n        pass\n\n    def peek(self):\n        pass\n\n\nif __name__ == \"__main__\":\n    import sys\n    ds = MyDataStructure()\n    for line in sys.stdin.read().splitlines():\n        parts = line.split()\n        if not parts:\n            continue\n        if parts[0] == \"push\": ds.push(int(parts[1]))\n        elif parts[0] == \"pop\": print(ds.pop())\n        elif parts[0] == \"peek\": print(ds.peek())\n",
    "javascript": "class MyDataStructure {\n    constructor() { this.data = []; }\n    push(val) {}\n    pop() {}\n    peek() {}\n}\n\nconst lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst ds = new MyDataStructure();\nfor (const line of lines) {\n    const parts = line.trim().split(/\\s+/);\n    if (!parts[0]) continue;\n    if (parts[0] === 'push') ds.push(Number(parts[1]));\n    else if (parts[0] === 'pop') console.log(ds.pop());\n    else if (parts[0] === 'peek') console.log(ds.peek());\n}\n",
    "java": "import java.util.*;\n\npublic class Main {\n    static Deque<Integer> data = new ArrayDeque<>();\n    static void push(int val) {}\n    static Integer pop() { return null; }\n    static Integer peek() { return null; }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) continue;\n            String[] parts = line.split(\"\\\\s+\");\n            if (parts[0].equals(\"push\")) push(Integer.parseInt(parts[1]));\n            else if (parts[0].equals(\"pop\")) System.out.println(pop());\n            else if (parts[0].equals(\"peek\")) System.out.println(peek());\n        }\n    }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass MyDataStructure {\npublic:\n    vector<int> data;\n    void push(int val) {}\n    int pop() { return 0; }\n    int peek() { return 0; }\n};\n\nint main() {\n    MyDataStructure ds;\n    string op;\n    while (cin >> op) {\n        if (op == \"push\") { int v; cin >> v; ds.push(v); }\n        else if (op == \"pop\") cout << ds.pop() << '\\n';\n        else if (op == \"peek\") cout << ds.peek() << '\\n';\n    }\n}\n",
    "c": "#include <stdio.h>\n#include <string.h>\n\nint data[1000];\nint top = -1;\nvoid push(int val) {}\nint pop() { return 0; }\nint peek() { return 0; }\n\nint main() {\n    char op[16]; int v;\n    while (scanf(\"%15s\", op) == 1) {\n        if (strcmp(op, \"push\") == 0) { scanf(\"%d\", &v); push(v); }\n        else if (strcmp(op, \"pop\") == 0) printf(\"%d\\n\", pop());\n        else if (strcmp(op, \"peek\") == 0) printf(\"%d\\n\", peek());\n    }\n}\n"
  }
}
$json$::jsonb
WHERE id = '00000000-0000-0000-0000-000000000621';

UPDATE question_versions
SET body = $json$
{
  "type": "media",
  "responseType": "code",
  "difficulty": "medium",
  "section": "Algorithms",
  "title": "Implement the Algorithm",
  "prompt": "Implement optimized Bubble Sort with an early exit when the array is already sorted. Read space-separated integers and print the sorted array.",
  "media": {"type": "video", "embedUrl": null, "caption": "Video: Bubble Sort - Step by Step Explanation"},
  "starterCode": {
    "python": "def bubble_sort(arr):\n    # Implement optimized bubble sort.\n    pass\n\nif __name__ == \"__main__\":\n    arr = list(map(int, input().split()))\n    bubble_sort(arr)\n    print(\" \".join(map(str, arr)))\n",
    "javascript": "function bubbleSort(arr) {\n    // Implement optimized bubble sort.\n    return arr;\n}\n\nconst arr = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(bubbleSort(arr).join(' '));\n",
    "java": "import java.util.*;\n\npublic class Main {\n    static void bubbleSort(int[] arr) {}\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] arr = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i]);\n        bubbleSort(arr);\n        for (int i = 0; i < arr.length; i++) { if (i > 0) System.out.print(\" \"); System.out.print(arr[i]); }\n        System.out.println();\n    }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid bubbleSort(vector<int>& arr) {}\n\nint main() {\n    vector<int> arr; int x;\n    while (cin >> x) arr.push_back(x);\n    bubbleSort(arr);\n    for (size_t i = 0; i < arr.size(); i++) { if (i) cout << ' '; cout << arr[i]; }\n    cout << '\\n';\n}\n",
    "c": "#include <stdio.h>\n\nvoid bubbleSort(int arr[], int n) {}\n\nint main() {\n    int arr[10000], n = 0, x;\n    while (scanf(\"%d\", &x) == 1) arr[n++] = x;\n    bubbleSort(arr, n);\n    for (int i = 0; i < n; i++) { if (i) printf(\" \"); printf(\"%d\", arr[i]); }\n    printf(\"\\n\");\n}\n"
  }
}
$json$::jsonb
WHERE id = '00000000-0000-0000-0000-000000000622';

UPDATE question_versions
SET body = $json$
{
  "type": "mcq",
  "responseType": "mcq",
  "difficulty": "easy",
  "section": "Complexity Analysis",
  "title": "Time Complexity",
  "prompt": "What is the time complexity of the following code snippet?",
  "pretext": {
    "language": "python",
    "code": "def mystery(n):\n    result = 0\n    i = 1\n    while i < n:\n        result += i\n        i *= 2\n    return result"
  }
}
$json$::jsonb
WHERE id = '00000000-0000-0000-0000-000000000623';

UPDATE question_versions
SET body = $json$
{
  "type": "coding",
  "responseType": "code",
  "difficulty": "hard",
  "section": "Dynamic Programming",
  "title": "Longest Common Subsequence",
  "prompt": "Given two strings <code>text1</code> and <code>text2</code> on separate lines, print the length of their longest common subsequence.",
  "pretext": {
    "language": "text",
    "code": "Input format:\nLine 1: text1\nLine 2: text2"
  },
  "starterCode": {
    "python": "def longest_common_subsequence(text1, text2):\n    # Write your solution here.\n    return 0\n\nif __name__ == \"__main__\":\n    text1 = input().strip()\n    text2 = input().strip()\n    print(longest_common_subsequence(text1, text2))\n",
    "javascript": "function longestCommonSubsequence(text1, text2) {\n    // Write your solution here.\n    return 0;\n}\n\nconst lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconsole.log(longestCommonSubsequence((lines[0] || '').trim(), (lines[1] || '').trim()));\n",
    "java": "import java.util.*;\n\npublic class Main {\n    static int longestCommonSubsequence(String text1, String text2) { return 0; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String text1 = sc.nextLine().trim();\n        String text2 = sc.nextLine().trim();\n        System.out.println(longestCommonSubsequence(text1, text2));\n    }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint longestCommonSubsequence(string text1, string text2) { return 0; }\n\nint main() {\n    string text1, text2;\n    getline(cin, text1);\n    getline(cin, text2);\n    cout << longestCommonSubsequence(text1, text2) << '\\n';\n}\n",
    "c": "#include <stdio.h>\n#include <string.h>\n\nint longestCommonSubsequence(char* text1, char* text2) { return 0; }\n\nint main() {\n    char text1[2048], text2[2048];\n    if (!fgets(text1, sizeof(text1), stdin)) return 0;\n    if (!fgets(text2, sizeof(text2), stdin)) return 0;\n    text1[strcspn(text1, \"\\r\\n\")] = 0;\n    text2[strcspn(text2, \"\\r\\n\")] = 0;\n    printf(\"%d\\n\", longestCommonSubsequence(text1, text2));\n}\n"
  }
}
$json$::jsonb
WHERE id = '00000000-0000-0000-0000-000000000624';

INSERT INTO question_test_cases (id, question_version_id, ordinal, name, is_sample, is_hidden, weight, stdin, expected_stdout) VALUES
    ('00000000-0000-0000-0000-000000000670', '00000000-0000-0000-0000-000000000620', 101, 'Two Sum hidden mixed signs', false, true, 2, '-3 4 3 90
0', '[0, 2]'),
    ('00000000-0000-0000-0000-000000000671', '00000000-0000-0000-0000-000000000621', 101, 'Stack hidden interleaved', false, true, 2, 'push 10
push 20
pop
peek
pop', '20
10
10'),
    ('00000000-0000-0000-0000-000000000672', '00000000-0000-0000-0000-000000000622', 101, 'Bubble hidden duplicates', false, true, 2, '5 1 5 3 1', '1 1 3 5 5'),
    ('00000000-0000-0000-0000-000000000673', '00000000-0000-0000-0000-000000000624', 101, 'LCS hidden partial overlap', false, true, 2, 'AGGTAB
GXTXAYB', '4')
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM question_test_cases WHERE id IN (
    '00000000-0000-0000-0000-000000000670',
    '00000000-0000-0000-0000-000000000671',
    '00000000-0000-0000-0000-000000000672',
    '00000000-0000-0000-0000-000000000673'
);

ALTER TABLE code_submission_files
    DROP COLUMN IF EXISTS language;
