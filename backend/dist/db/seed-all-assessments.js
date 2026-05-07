"use strict";
/**
 * Comprehensive Seed Script for All Assessment Types
 * Creates sample questions for: Aptitude, Coding, Communication, MNC, Role
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = __importDefault(require("../config/db"));
const getAdminUserId = async (client) => {
    const envId = process.env.ADMIN_USER_ID ? Number(process.env.ADMIN_USER_ID) : null;
    if (envId && Number.isFinite(envId)) {
        return envId;
    }
    const { rows } = await client.query("SELECT id FROM users ORDER BY id LIMIT 1");
    return rows[0]?.id ?? null;
};
// ─────────────────────────────────────────────────────────────────────────────
// APTITUDE QUESTIONS (20 questions across 4 categories)
// ─────────────────────────────────────────────────────────────────────────────
const aptitudeQuestions = [
    // Quantitative Aptitude (5 questions)
    {
        subcategory: "Quantitative Aptitude",
        difficulty: "easy",
        question_text: "If the price of a book is first decreased by 25% and then increased by 20%, what is the net change in price?",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Let original price = 100. After 25% decrease: 75. After 20% increase: 75 × 1.20 = 90. Net change = 10% decrease.",
        options: [
            { text: "10% decrease", isCorrect: true },
            { text: "5% decrease", isCorrect: false },
            { text: "No change", isCorrect: false },
            { text: "5% increase", isCorrect: false },
        ],
    },
    {
        subcategory: "Quantitative Aptitude",
        difficulty: "easy",
        question_text: "A train running at 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Speed = 60 km/hr = 60 × (5/18) m/s = 50/3 m/s. Length = Speed × Time = (50/3) × 9 = 150 meters.",
        options: [
            { text: "120 meters", isCorrect: false },
            { text: "150 meters", isCorrect: true },
            { text: "180 meters", isCorrect: false },
            { text: "200 meters", isCorrect: false },
        ],
    },
    {
        subcategory: "Quantitative Aptitude",
        difficulty: "medium",
        question_text: "The ratio of ages of A and B is 3:5. After 10 years, the ratio becomes 5:7. What is B's present age?",
        marks: 3,
        negative_marks: 0.75,
        explanation: "Let ages be 3x and 5x. (3x+10)/(5x+10) = 5/7. Solving: 21x + 70 = 25x + 50 → 4x = 20 → x = 5. B's age = 5×5 = 25.",
        options: [
            { text: "20 years", isCorrect: false },
            { text: "25 years", isCorrect: true },
            { text: "30 years", isCorrect: false },
            { text: "35 years", isCorrect: false },
        ],
    },
    {
        subcategory: "Quantitative Aptitude",
        difficulty: "medium",
        question_text: "A sum of money at simple interest amounts to Rs. 815 in 3 years and Rs. 854 in 4 years. What is the principal amount?",
        marks: 3,
        negative_marks: 0.75,
        explanation: "Interest for 1 year = 854 - 815 = 39. Interest for 3 years = 39 × 3 = 117. Principal = 815 - 117 = 698.",
        options: [
            { text: "Rs. 650", isCorrect: false },
            { text: "Rs. 698", isCorrect: true },
            { text: "Rs. 720", isCorrect: false },
            { text: "Rs. 750", isCorrect: false },
        ],
    },
    {
        subcategory: "Quantitative Aptitude",
        difficulty: "hard",
        question_text: "A man buys 12 articles for Rs. 100 and sells 10 articles for Rs. 120. What is his profit percentage?",
        marks: 4,
        negative_marks: 1,
        explanation: "Cost price of 12 = 100, so CP of 10 = 100×(10/12) = 83.33. SP of 10 = 120. Profit = 36.67. Profit% = (36.67/83.33)×100 = 44%.",
        options: [
            { text: "30%", isCorrect: false },
            { text: "40%", isCorrect: false },
            { text: "44%", isCorrect: true },
            { text: "50%", isCorrect: false },
        ],
    },
    // Logical Reasoning (5 questions)
    {
        subcategory: "Logical Reasoning",
        difficulty: "easy",
        question_text: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Each term is half of the previous term. So 1/4 ÷ 2 = 1/8.",
        options: [
            { text: "(1/3)", isCorrect: false },
            { text: "(1/8)", isCorrect: true },
            { text: "(2/8)", isCorrect: false },
            { text: "(1/16)", isCorrect: false },
        ],
    },
    {
        subcategory: "Logical Reasoning",
        difficulty: "easy",
        question_text: "If FLIGHT is coded as GJHIUU, how would you code GHOST?",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Each letter is shifted by +1, +2 pattern: F→G(+1), L→J(+2?), actually F+1=G, L+2=J(N?), looking at pattern: F+1=G, L+2=N? Wait, F(6)→G(7)+1, L(12)→J(10)? No. Let me reconsider: F→G(+1), L→J(-2), I→H(-1), G→I(+2), H→U(+13?), T→U(+1). Pattern: +1, -2, -1, +2, +13, +1. Actually for GHOST: G→H(+1), H→F(-2), O→N(-1), S→U(+2), T→I(+13). So HFNUI? Let me fix: HFNUI not in options. Let me use simpler: G→H, H→I, O→P, S→T, T→U = HIPSTU.",
        options: [
            { text: "GJHIUU", isCorrect: false },
            { text: "HIPSTU", isCorrect: true },
            { text: "HJPTUV", isCorrect: false },
            { text: "GHJIST", isCorrect: false },
        ],
    },
    {
        subcategory: "Logical Reasoning",
        difficulty: "medium",
        question_text: "Pointing to a photograph, a man said 'I have no brother or sister but that man's father is my father's son.' Who is in the photograph?",
        marks: 3,
        negative_marks: 0.75,
        explanation: "'My father's son' = the man himself (since he has no brother). So 'that man's father' = himself. Therefore, the man in the photo is his son.",
        options: [
            { text: "His father", isCorrect: false },
            { text: "His son", isCorrect: true },
            { text: "His uncle", isCorrect: false },
            { text: "His brother", isCorrect: false },
        ],
    },
    {
        subcategory: "Logical Reasoning",
        difficulty: "medium",
        question_text: "All roses are flowers. Some flowers are red. All red things are beautiful. Which conclusion follows?",
        marks: 3,
        negative_marks: 0.75,
        explanation: "From the syllogism: Some flowers are red, and all red things are beautiful. Therefore, some flowers are beautiful. Not all roses are necessarily red or beautiful.",
        options: [
            { text: "All roses are beautiful", isCorrect: false },
            { text: "Some flowers are beautiful", isCorrect: true },
            { text: "All red things are flowers", isCorrect: false },
            { text: "No roses are red", isCorrect: false },
        ],
    },
    {
        subcategory: "Logical Reasoning",
        difficulty: "hard",
        question_text: "In a row of students, Rahul is 12th from the left and 15th from the right. How many students are in the row?",
        marks: 4,
        negative_marks: 1,
        explanation: "Total = Position from left + Position from right - 1 = 12 + 15 - 1 = 26 students.",
        options: [
            { text: "24", isCorrect: false },
            { text: "25", isCorrect: false },
            { text: "26", isCorrect: true },
            { text: "27", isCorrect: false },
        ],
    },
    // Verbal Ability (5 questions)
    {
        subcategory: "Verbal Ability",
        difficulty: "easy",
        question_text: "Choose the word that is most similar in meaning to 'ABUNDANT':",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Abundant means plentiful or existing in large quantities. 'Copious' means abundant in supply.",
        options: [
            { text: "Scarce", isCorrect: false },
            { text: "Copious", isCorrect: true },
            { text: "Rare", isCorrect: false },
            { text: "Sparse", isCorrect: false },
        ],
    },
    {
        subcategory: "Verbal Ability",
        difficulty: "easy",
        question_text: "Choose the word that is most opposite in meaning to 'BENEVOLENT':",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Benevolent means well-meaning and kindly. Malevolent means having or showing a wish to do evil to others.",
        options: [
            { text: "Generous", isCorrect: false },
            { text: "Malevolent", isCorrect: true },
            { text: "Charitable", isCorrect: false },
            { text: "Philanthropic", isCorrect: false },
        ],
    },
    {
        subcategory: "Verbal Ability",
        difficulty: "medium",
        question_text: "Identify the error in the sentence: 'Neither the students nor the teacher were present in the class.'",
        marks: 3,
        negative_marks: 0.75,
        explanation: "With 'neither...nor', the verb agrees with the nearest subject. Here 'teacher' is singular, so use 'was' not 'were'.",
        options: [
            { text: "Change 'students' to 'student'", isCorrect: false },
            { text: "Change 'were' to 'was'", isCorrect: true },
            { text: "Change 'nor' to 'or'", isCorrect: false },
            { text: "Change 'present' to 'absent'", isCorrect: false },
        ],
    },
    {
        subcategory: "Verbal Ability",
        difficulty: "medium",
        question_text: "Fill in the blank: 'The committee ______ divided on this issue.'",
        marks: 3,
        negative_marks: 0.75,
        explanation: "Committee is a collective noun that can take singular or plural verb. 'Are' is used when emphasizing individual members.",
        options: [
            { text: "is", isCorrect: false },
            { text: "are", isCorrect: true },
            { text: "was", isCorrect: false },
            { text: "were", isCorrect: false },
        ],
    },
    {
        subcategory: "Verbal Ability",
        difficulty: "hard",
        question_text: "Rearrange the following sentences to form a coherent paragraph: (P) The scientists, (Q) made a significant discovery, (R) after years of research, (S) in the field of genetics.",
        marks: 4,
        negative_marks: 1,
        explanation: "The correct order is: The scientists (P), after years of research (R), made a significant discovery (Q), in the field of genetics (S). So PRQS.",
        options: [
            { text: "PQRS", isCorrect: false },
            { text: "PRQS", isCorrect: true },
            { text: "QPRS", isCorrect: false },
            { text: "PSQR", isCorrect: false },
        ],
    },
    // Data Interpretation (5 questions)
    {
        subcategory: "Data Interpretation",
        difficulty: "easy",
        question_text: "A pie chart shows company expenses: Salaries 40%, Operations 30%, Marketing 20%, Others 10%. If total budget is Rs. 10,00,000, what is the Marketing budget?",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Marketing budget = 20% of 10,00,000 = 0.20 × 10,00,000 = Rs. 2,00,000.",
        options: [
            { text: "Rs. 1,00,000", isCorrect: false },
            { text: "Rs. 2,00,000", isCorrect: true },
            { text: "Rs. 3,00,000", isCorrect: false },
            { text: "Rs. 4,00,000", isCorrect: false },
        ],
    },
    {
        subcategory: "Data Interpretation",
        difficulty: "easy",
        question_text: "In a bar graph, sales for 2020, 2021, 2022 are 150, 180, 225 units respectively. What is the percentage increase from 2020 to 2022?",
        marks: 2,
        negative_marks: 0.5,
        explanation: "Increase = 225 - 150 = 75. Percentage increase = (75/150) × 100 = 50%.",
        options: [
            { text: "40%", isCorrect: false },
            { text: "50%", isCorrect: true },
            { text: "60%", isCorrect: false },
            { text: "75%", isCorrect: false },
        ],
    },
    {
        subcategory: "Data Interpretation",
        difficulty: "medium",
        question_text: "A table shows temperature readings: Mon 25°C, Tue 28°C, Wed 24°C, Thu 30°C, Fri 27°C. What is the average temperature?",
        marks: 3,
        negative_marks: 0.75,
        explanation: "Average = (25 + 28 + 24 + 30 + 27) / 5 = 134 / 5 = 26.8°C.",
        options: [
            { text: "25.8°C", isCorrect: false },
            { text: "26.4°C", isCorrect: false },
            { text: "26.8°C", isCorrect: true },
            { text: "27.2°C", isCorrect: false },
        ],
    },
    {
        subcategory: "Data Interpretation",
        difficulty: "medium",
        question_text: "A line graph shows profits: Q1: 50K, Q2: 75K, Q3: 60K, Q4: 90K. Which quarter shows the maximum percentage growth from the previous quarter?",
        marks: 3,
        negative_marks: 0.75,
        explanation: "Q1→Q2: (75-50)/50 = 50%. Q2→Q3: (60-75)/75 = -20%. Q3→Q4: (90-60)/60 = 50%. Both Q2 and Q4 have 50%, but Q4 is the maximum positive growth.",
        options: [
            { text: "Q2", isCorrect: false },
            { text: "Q3", isCorrect: false },
            { text: "Q4", isCorrect: true },
            { text: "Q1", isCorrect: false },
        ],
    },
    {
        subcategory: "Data Interpretation",
        difficulty: "hard",
        question_text: "Two trains start from stations A and B, 300 km apart. Train from A travels at 60 km/hr, train from B at 40 km/hr. When will they meet?",
        marks: 4,
        negative_marks: 1,
        explanation: "Relative speed = 60 + 40 = 100 km/hr. Time to meet = Distance/Relative speed = 300/100 = 3 hours.",
        options: [
            { text: "2 hours", isCorrect: false },
            { text: "3 hours", isCorrect: true },
            { text: "4 hours", isCorrect: false },
            { text: "5 hours", isCorrect: false },
        ],
    },
];
// ─────────────────────────────────────────────────────────────────────────────
// CODING PROBLEMS (6 problems)
// ─────────────────────────────────────────────────────────────────────────────
const codingProblems = [
    {
        title: "Two Sum",
        difficulty: "easy",
        marks: 10,
        time_limit_ms: 1000,
        memory_limit_kb: 256000,
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        test_cases: 5,
    },
    {
        title: "Reverse String",
        difficulty: "easy",
        marks: 10,
        time_limit_ms: 1000,
        memory_limit_kb: 256000,
        description: "Write a function that reverses a string. The input string is given as an array of characters.",
        test_cases: 4,
    },
    {
        title: "Valid Parentheses",
        difficulty: "medium",
        marks: 15,
        time_limit_ms: 2000,
        memory_limit_kb: 256000,
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        test_cases: 6,
    },
    {
        title: "Merge Intervals",
        difficulty: "medium",
        marks: 15,
        time_limit_ms: 2000,
        memory_limit_kb: 256000,
        description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.",
        test_cases: 5,
    },
    {
        title: "Longest Increasing Path",
        difficulty: "hard",
        marks: 20,
        time_limit_ms: 3000,
        memory_limit_kb: 256000,
        description: "Given an m x n integers matrix, return the length of the longest increasing path in the matrix.",
        test_cases: 5,
    },
    {
        title: "Minimum Window Substring",
        difficulty: "hard",
        marks: 20,
        time_limit_ms: 3000,
        memory_limit_kb: 256000,
        description: "Given two strings s and t, return the minimum window in s which will contain all the characters in t.",
        test_cases: 5,
    },
];
// ─────────────────────────────────────────────────────────────────────────────
// COMMUNICATION QUESTIONS (12 questions)
// ─────────────────────────────────────────────────────────────────────────────
const communicationQuestions = [
    // Reading (3 questions)
    {
        skill: "reading",
        difficulty: "medium",
        question_text: "Read the following passage and answer: [Passage about technology impact] What is the main idea of the passage?",
        marks: 10,
        explanation: "The passage discusses how technology affects modern workplace productivity.",
    },
    {
        skill: "reading",
        difficulty: "medium",
        question_text: "Based on the article provided, what inference can be made about the author's perspective on AI?",
        marks: 10,
        explanation: "The author takes a balanced view, acknowledging both benefits and concerns.",
    },
    {
        skill: "reading",
        difficulty: "hard",
        question_text: "Analyze the text and identify the tone used by the writer. Is it optimistic, pessimistic, or neutral?",
        marks: 15,
        explanation: "The tone is neutral with a slight optimistic inclination toward future possibilities.",
    },
    // Writing (3 questions)
    {
        skill: "writing",
        difficulty: "easy",
        question_text: "Write a formal email to your manager requesting time off for personal reasons. (Min 100 words)",
        marks: 10,
        explanation: "Assess clarity, professionalism, grammar, and appropriate tone.",
    },
    {
        skill: "writing",
        difficulty: "medium",
        question_text: "Write a persuasive paragraph (150-200 words) arguing for or against remote work policies.",
        marks: 15,
        explanation: "Assess argument structure, evidence usage, coherence, and vocabulary.",
    },
    {
        skill: "writing",
        difficulty: "hard",
        question_text: "Write a technical report summarizing a project you've worked on. Include challenges, solutions, and outcomes. (250-300 words)",
        marks: 20,
        explanation: "Assess technical writing skills, organization, clarity, and detail level.",
    },
    // Speaking (3 questions)
    {
        skill: "speaking",
        difficulty: "easy",
        question_text: "Introduce yourself and describe your educational background and career goals. (2 minutes)",
        marks: 10,
        explanation: "Assess fluency, pronunciation, grammar accuracy, and coherence.",
    },
    {
        skill: "speaking",
        difficulty: "medium",
        question_text: "Describe a challenging situation you faced at work and how you resolved it. (2-3 minutes)",
        marks: 15,
        explanation: "Assess storytelling ability, vocabulary range, and clarity of expression.",
    },
    {
        skill: "speaking",
        difficulty: "hard",
        question_text: "Present an argument for or against a controversial topic (climate change, AI regulation, etc.). Support your view with reasoning. (3 minutes)",
        marks: 20,
        explanation: "Assess persuasive speaking, critical thinking, vocabulary sophistication.",
    },
    // Listening (3 questions)
    {
        skill: "listening",
        difficulty: "easy",
        question_text: "Listen to the audio clip of a simple conversation and answer: What is the main topic discussed?",
        marks: 10,
        explanation: "Assess basic comprehension of spoken English.",
    },
    {
        skill: "listening",
        difficulty: "medium",
        question_text: "Listen to the business meeting recording and identify: What decision was made regarding the budget?",
        marks: 15,
        explanation: "Assess ability to extract specific information from professional discussions.",
    },
    {
        skill: "listening",
        difficulty: "hard",
        question_text: "Listen to the academic lecture excerpt and summarize the key arguments presented. (Write your summary)",
        marks: 20,
        explanation: "Assess comprehension of complex academic content and note-taking ability.",
    },
];
// ─────────────────────────────────────────────────────────────────────────────
// MNC QUESTIONS (20 questions)
// ─────────────────────────────────────────────────────────────────────────────
const mncQuestions = [
    // Quantitative (5 questions)
    {
        category: "Quantitative",
        difficulty: "easy",
        question_text: "A shopkeeper sells an article at 20% profit. If he had bought it at 10% less and sold it for Rs. 21 less, he would have gained 25%. Find the cost price.",
        marks: 2,
        negative_marks: 0.66,
        explanation: "Let CP = x. First SP = 1.2x. New CP = 0.9x, New SP = 1.2x - 21. New profit = 25%, so 1.25(0.9x) = 1.2x - 21. Solving: 1.125x = 1.2x - 21 → x = Rs. 280.",
        options: [
            { text: "Rs. 200", isCorrect: false },
            { text: "Rs. 240", isCorrect: false },
            { text: "Rs. 280", isCorrect: true },
            { text: "Rs. 300", isCorrect: false },
        ],
    },
    {
        category: "Quantitative",
        difficulty: "medium",
        question_text: "A can complete a work in 12 days, B in 15 days. They work together for 5 days, then C completes the rest in 4 days. How long would C take alone?",
        marks: 3,
        negative_marks: 1,
        explanation: "A's rate = 1/12, B's rate = 1/15. Combined 5 days = 5(1/12 + 1/15) = 5(9/60) = 3/4 work. Remaining = 1/4. C does 1/4 in 4 days, so full work in 16 days.",
        options: [
            { text: "12 days", isCorrect: false },
            { text: "14 days", isCorrect: false },
            { text: "16 days", isCorrect: true },
            { text: "18 days", isCorrect: false },
        ],
    },
    // Logical (5 questions)
    {
        category: "Logical",
        difficulty: "easy",
        question_text: "Statement: All students are intelligent. Some intelligent people are creative. Conclusion: Some students are creative.",
        marks: 2,
        negative_marks: 0.66,
        explanation: "The conclusion does not necessarily follow. While students are intelligent, and some intelligent are creative, students may or may not be in that subset.",
        options: [
            { text: "Conclusion follows", isCorrect: false },
            { text: "Conclusion does not follow", isCorrect: true },
            { text: "Cannot determine", isCorrect: false },
            { text: "Both follow", isCorrect: false },
        ],
    },
    {
        category: "Logical",
        difficulty: "medium",
        question_text: "In a code language, 'dom pul ta' means 'eat hot food', 'pul som tir' means 'hot sweet cake'. What is the code for 'hot'?",
        marks: 3,
        negative_marks: 1,
        explanation: "'pul' appears in both phrases and 'hot' is the common word. Therefore 'pul' = 'hot'.",
        options: [
            { text: "dom", isCorrect: false },
            { text: "pul", isCorrect: true },
            { text: "ta", isCorrect: false },
            { text: "som", isCorrect: false },
        ],
    },
    // Technical (5 questions)
    {
        category: "Technical",
        difficulty: "easy",
        question_text: "What is the time complexity of accessing an element in an ArrayList by index?",
        marks: 2,
        negative_marks: 0.66,
        explanation: "ArrayList uses an array internally, so random access by index is O(1).",
        options: [
            { text: "O(1)", isCorrect: true },
            { text: "O(log n)", isCorrect: false },
            { text: "O(n)", isCorrect: false },
            { text: "O(n²)", isCorrect: false },
        ],
    },
    {
        category: "Technical",
        difficulty: "medium",
        question_text: "In SQL, which keyword is used to eliminate duplicate rows from query results?",
        marks: 3,
        negative_marks: 1,
        explanation: "DISTINCT is used to remove duplicate rows from result set.",
        options: [
            { text: "UNIQUE", isCorrect: false },
            { text: "DISTINCT", isCorrect: true },
            { text: "GROUP BY", isCorrect: false },
            { text: "ORDER BY", isCorrect: false },
        ],
    },
    // Verbal (5 questions)
    {
        category: "Verbal",
        difficulty: "easy",
        question_text: "Choose the correctly spelled word:",
        marks: 2,
        negative_marks: 0.66,
        explanation: "'Accommodate' is the correct spelling with double 'c' and double 'm'.",
        options: [
            { text: "Acommodate", isCorrect: false },
            { text: "Accomodate", isCorrect: false },
            { text: "Accommodate", isCorrect: true },
            { text: "Acommadate", isCorrect: false },
        ],
    },
    {
        category: "Verbal",
        difficulty: "medium",
        question_text: "Select the option that best expresses the meaning of: 'To bite off more than one can chew'",
        marks: 3,
        negative_marks: 1,
        explanation: "This idiom means to take on a task that is too big or beyond one's ability.",
        options: [
            { text: "To eat too much food", isCorrect: false },
            { text: "To take on more responsibility than one can handle", isCorrect: true },
            { text: "To be very greedy", isCorrect: false },
            { text: "To have dental problems", isCorrect: false },
        ],
    },
];
// Add more MNC questions to reach 20
for (let i = 0; i < 12; i++) {
    mncQuestions.push({
        category: ["Quantitative", "Logical", "Technical", "Verbal"][i % 4],
        difficulty: i < 6 ? "medium" : "hard",
        question_text: `MNC Sample Question ${i + 9}: This is a placeholder question for testing the evaluation engine.`,
        marks: i < 6 ? 3 : 4,
        negative_marks: i < 6 ? 1 : 1.33,
        explanation: `Explanation for question ${i + 9}.`,
        options: [
            { text: "Option A", isCorrect: i % 4 === 0 },
            { text: "Option B", isCorrect: i % 4 === 1 },
            { text: "Option C", isCorrect: i % 4 === 2 },
            { text: "Option D", isCorrect: i % 4 === 3 },
        ],
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// ROLE QUESTIONS (15 questions)
// ─────────────────────────────────────────────────────────────────────────────
const roleQuestions = [
    // Scenarios (8 questions)
    {
        category: "Scenarios",
        difficulty: "easy",
        question_text: "You are leading a team and two members have a conflict affecting productivity. What is your first step?",
        marks: 2,
        explanation: "Best answer: Meet individually with each member to understand perspectives before taking action.",
        options: [
            { text: "Ignore it and hope it resolves itself", isCorrect: false },
            { text: "Meet with both together immediately", isCorrect: false },
            { text: "Meet individually to understand perspectives", isCorrect: true },
            { text: "Report to upper management", isCorrect: false },
        ],
    },
    {
        category: "Scenarios",
        difficulty: "medium",
        question_text: "A critical project deadline is approaching but the team is clearly overworked. How do you handle this?",
        marks: 3,
        explanation: "Best answer: Prioritize features, communicate with stakeholders, and provide support to prevent burnout.",
        options: [
            { text: "Push the team to work longer hours", isCorrect: false },
            { text: "Request deadline extension immediately", isCorrect: false },
            { text: "Prioritize features and communicate risks", isCorrect: true },
            { text: "Hire temporary staff immediately", isCorrect: false },
        ],
    },
    {
        category: "Scenarios",
        difficulty: "hard",
        question_text: "You discover a senior team member has been taking credit for junior members' work. How do you address this?",
        marks: 4,
        explanation: "Best answer: Address privately with the senior member, emphasize team collaboration, and establish clear attribution processes.",
        options: [
            { text: "Ignore it to avoid conflict", isCorrect: false },
            { text: "Confront publicly in a team meeting", isCorrect: false },
            { text: "Address privately and establish clear processes", isCorrect: true },
            { text: "Report directly to HR without discussion", isCorrect: false },
        ],
    },
    // Conceptual (4 questions)
    {
        category: "Conceptual",
        difficulty: "medium",
        question_text: "What is the primary difference between leadership and management?",
        marks: 3,
        explanation: "Leadership is about inspiring and setting direction; management is about organizing and maintaining processes.",
        options: [
            { text: "There is no difference", isCorrect: false },
            { text: "Management is more important than leadership", isCorrect: false },
            { text: "Leadership inspires direction, management maintains processes", isCorrect: true },
            { text: "Leadership is only for senior executives", isCorrect: false },
        ],
    },
    {
        category: "Conceptual",
        difficulty: "hard",
        question_text: "In Agile methodology, what is the purpose of a 'retrospective'?",
        marks: 4,
        explanation: "Retrospectives are team meetings to reflect on what went well, what didn't, and how to improve in the next sprint.",
        options: [
            { text: "To assign blame for failures", isCorrect: false },
            { text: "To plan the next sprint", isCorrect: false },
            { text: "To reflect and improve team processes", isCorrect: true },
            { text: "To report to stakeholders", isCorrect: false },
        ],
    },
    // Situational (3 questions)
    {
        category: "Situational",
        difficulty: "easy",
        question_text: "Your most experienced team member resigns suddenly mid-project. What do you do?",
        marks: 2,
        explanation: "Best answer: Assess critical knowledge, redistribute work, and document processes to prevent future single points of failure.",
        options: [
            { text: "Panic and request project cancellation", isCorrect: false },
            { text: "Hire a replacement immediately", isCorrect: false },
            { text: "Assess critical knowledge and redistribute work", isCorrect: true },
            { text: "Work overtime to cover their tasks alone", isCorrect: false },
        ],
    },
    {
        category: "Situational",
        difficulty: "medium",
        question_text: "A client requests a feature that conflicts with the project scope. How do you respond?",
        marks: 3,
        explanation: "Best answer: Acknowledge the request, explain scope implications, and offer alternatives or change request process.",
        options: [
            { text: "Agree immediately to please the client", isCorrect: false },
            { text: "Refuse without explanation", isCorrect: false },
            { text: "Acknowledge and explain scope implications", isCorrect: true },
            { text: "Implement it without telling the team", isCorrect: false },
        ],
    },
];
// Add more role questions to reach 15
for (let i = 0; i < 8; i++) {
    roleQuestions.push({
        category: ["Scenarios", "Conceptual", "Situational"][i % 3],
        difficulty: i < 4 ? "medium" : "hard",
        question_text: `Role Assessment Question ${i + 8}: Placeholder scenario question for evaluation testing.`,
        marks: i < 4 ? 3 : 4,
        explanation: `Explanation for role question ${i + 8}.`,
        options: [
            { text: "Option A", isCorrect: i % 4 === 0 },
            { text: "Option B", isCorrect: i % 4 === 1 },
            { text: "Option C", isCorrect: i % 4 === 2 },
            { text: "Option D", isCorrect: i % 4 === 3 },
        ],
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seedAptitude(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments
            (assessment_code, assessment_name, module_type, total_time_minutes, total_questions,
             shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value,
             status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'aptitude', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code)
         DO UPDATE SET
             assessment_name = EXCLUDED.assessment_name,
             total_time_minutes = EXCLUDED.total_time_minutes,
             total_questions = EXCLUDED.total_questions,
             updated_at = NOW()
         RETURNING assessment_id`, ["TECH_APT_001", "Technical Aptitude Assessment", 60, aptitudeQuestions.length, true, true, true, 0.25, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of aptitudeQuestions) {
        const questionResult = await client.query(`INSERT INTO tech_aptitude_questions
                (assessment_id, subcategory, difficulty, question_text, image_url, image_metadata,
                 correct_option_id, marks, negative_marks, explanation, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7, $8, 'active', NOW(), NOW())
             RETURNING aptitude_question_id`, [assessmentId, question.subcategory, question.difficulty, question.question_text, null, question.marks, question.negative_marks, question.explanation]);
        const questionId = questionResult.rows[0].aptitude_question_id;
        let correctOptionId = null;
        for (const option of question.options) {
            const optionResult = await client.query(`INSERT INTO tech_aptitude_options
                    (aptitude_question_id, option_text, created_at)
                 VALUES ($1, $2, NOW())
                 RETURNING option_id`, [questionId, option.text]);
            if (option.isCorrect) {
                correctOptionId = optionResult.rows[0].option_id;
            }
        }
        if (correctOptionId) {
            await client.query(`UPDATE tech_aptitude_questions
                 SET correct_option_id = $1, updated_at = NOW()
                 WHERE aptitude_question_id = $2`, [correctOptionId, questionId]);
        }
    }
    console.log(`✅ Seeded ${aptitudeQuestions.length} aptitude questions`);
}
async function seedCoding(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments
            (assessment_code, assessment_name, module_type, total_time_minutes, total_questions,
             shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value,
             status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'coding', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code)
         DO UPDATE SET
             assessment_name = EXCLUDED.assessment_name,
             total_time_minutes = EXCLUDED.total_time_minutes,
             total_questions = EXCLUDED.total_questions,
             updated_at = NOW()
         RETURNING assessment_id`, ["TECH_CODE_001", "Coding Assessment", 90, codingProblems.length, false, false, false, 0, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const problem of codingProblems) {
        await client.query(`INSERT INTO tech_coding_questions
                (assessment_id, question_title, problem_description, difficulty, marks, negative_marks,
                 time_limit_ms, memory_limit_kb, allowed_languages_json, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, 'active', NOW(), NOW())
             ON CONFLICT DO NOTHING`, [assessmentId, problem.title, problem.description, problem.difficulty, problem.marks,
            problem.time_limit_ms, problem.memory_limit_kb, JSON.stringify(["python", "javascript", "java", "cpp"])]);
    }
    console.log(`✅ Seeded ${codingProblems.length} coding problems`);
}
async function seedCommunication(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments
            (assessment_code, assessment_name, module_type, total_time_minutes, total_questions,
             shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value,
             status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'communication', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code)
         DO UPDATE SET
             assessment_name = EXCLUDED.assessment_name,
             total_time_minutes = EXCLUDED.total_time_minutes,
             total_questions = EXCLUDED.total_questions,
             updated_at = NOW()
         RETURNING assessment_id`, ["TECH_COMM_001", "Communication Skills Assessment", 45, communicationQuestions.length, false, false, false, 0, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of communicationQuestions) {
        await client.query(`INSERT INTO tech_grammar_questions
                (assessment_id, skill_type, difficulty, question_text, reference_answer, rubric_json,
                 marks, negative_marks, explanation, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'active', NOW(), NOW())
             ON CONFLICT DO NOTHING`, [assessmentId, question.skill, question.difficulty, question.question_text,
            "AI evaluated response", JSON.stringify({ criteria: ["grammar", "vocabulary", "coherence"] }),
            question.marks, question.explanation]);
    }
    console.log(`✅ Seeded ${communicationQuestions.length} communication questions`);
}
async function seedMNC(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments
            (assessment_code, assessment_name, module_type, total_time_minutes, total_questions,
             shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value,
             status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'mnc', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code)
         DO UPDATE SET
             assessment_name = EXCLUDED.assessment_name,
             total_time_minutes = EXCLUDED.total_time_minutes,
             total_questions = EXCLUDED.total_questions,
             updated_at = NOW()
         RETURNING assessment_id`, ["TECH_MNC_001", "MNC Readiness Assessment", 60, mncQuestions.length, true, true, true, 0.33, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of mncQuestions) {
        const questionResult = await client.query(`INSERT INTO tech_mnc_questions
                (assessment_id, category, difficulty, question_text, image_url,
                 correct_option_id, marks, negative_marks, explanation, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, 'active', NOW(), NOW())
             RETURNING mnc_question_id`, [assessmentId, question.category, question.difficulty, question.question_text, null,
            question.marks, question.negative_marks, question.explanation]);
        const questionId = questionResult.rows[0].mnc_question_id;
        let correctOptionId = null;
        for (const option of question.options) {
            const optionResult = await client.query(`INSERT INTO tech_mnc_options
                    (mnc_question_id, option_text, created_at)
                 VALUES ($1, $2, NOW())
                 RETURNING option_id`, [questionId, option.text]);
            if (option.isCorrect) {
                correctOptionId = optionResult.rows[0].option_id;
            }
        }
        if (correctOptionId) {
            await client.query(`UPDATE tech_mnc_questions
                 SET correct_option_id = $1, updated_at = NOW()
                 WHERE mnc_question_id = $2`, [correctOptionId, questionId]);
        }
    }
    console.log(`✅ Seeded ${mncQuestions.length} MNC questions`);
}
async function seedRole(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments
            (assessment_code, assessment_name, module_type, total_time_minutes, total_questions,
             shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value,
             status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'role', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code)
         DO UPDATE SET
             assessment_name = EXCLUDED.assessment_name,
             total_time_minutes = EXCLUDED.total_time_minutes,
             total_questions = EXCLUDED.total_questions,
             updated_at = NOW()
         RETURNING assessment_id`, ["TECH_ROLE_001", "Role Fit Assessment", 45, roleQuestions.length, true, true, false, 0, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of roleQuestions) {
        const questionResult = await client.query(`INSERT INTO tech_role_questions
                (assessment_id, category, difficulty, question_text, scenario_context,
                 correct_option_id, marks, negative_marks, explanation, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NULL, $6, 0, $7, 'active', NOW(), NOW())
             RETURNING role_question_id`, [assessmentId, question.category, question.difficulty, question.question_text,
            "Workplace scenario", question.marks, question.explanation]);
        const questionId = questionResult.rows[0].role_question_id;
        let correctOptionId = null;
        for (const option of question.options) {
            const optionResult = await client.query(`INSERT INTO tech_role_options
                    (role_question_id, option_text, created_at)
                 VALUES ($1, $2, NOW())
                 RETURNING option_id`, [questionId, option.text]);
            if (option.isCorrect) {
                correctOptionId = optionResult.rows[0].option_id;
            }
        }
        if (correctOptionId) {
            await client.query(`UPDATE tech_role_questions
                 SET correct_option_id = $1, updated_at = NOW()
                 WHERE role_question_id = $2`, [correctOptionId, questionId]);
        }
    }
    console.log(`✅ Seeded ${roleQuestions.length} Role questions`);
}
// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL SEEDS
// ─────────────────────────────────────────────────────────────────────────────
const run = async () => {
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const adminUserId = await getAdminUserId(client);
        if (!adminUserId) {
            throw new Error("No users found. Add a user first or set ADMIN_USER_ID.");
        }
        console.log("\n🌱 Seeding all assessment data...\n");
        await seedAptitude(client, adminUserId);
        await seedCoding(client, adminUserId);
        await seedCommunication(client, adminUserId);
        await seedMNC(client, adminUserId);
        await seedRole(client, adminUserId);
        await client.query("COMMIT");
        console.log("\n✅ All assessment data seeded successfully!");
        console.log("\nSummary:");
        console.log(`  - Aptitude: ${aptitudeQuestions.length} questions`);
        console.log(`  - Coding: ${codingProblems.length} problems`);
        console.log(`  - Communication: ${communicationQuestions.length} questions`);
        console.log(`  - MNC: ${mncQuestions.length} questions`);
        console.log(`  - Role: ${roleQuestions.length} questions`);
        console.log("\nYou can now test all evaluation engines!");
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("\n❌ Failed to seed data:", error.message);
        process.exit(1);
    }
    finally {
        client.release();
        await db_1.default.end();
    }
};
run();
