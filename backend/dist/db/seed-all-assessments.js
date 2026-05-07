"use strict";
/**
 * Comprehensive Seed Script for All Assessment Types
 * Creates sample questions for: Aptitude, Coding, Grammar (Communication), MNC, Role
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
// APTITUDE QUESTIONS (20 questions)
// ─────────────────────────────────────────────────────────────────────────────
const aptitudeQuestions = [
    // Quantitative (5)
    { subcategory: "Quantitative Aptitude", difficulty: "easy", question_text: "If price decreased by 25% then increased by 20%, net change?", marks: 2, negative_marks: 0.5, explanation: "Net 10% decrease", options: [{ text: "10% decrease", isCorrect: true }, { text: "5% decrease", isCorrect: false }, { text: "No change", isCorrect: false }, { text: "5% increase", isCorrect: false }] },
    { subcategory: "Quantitative Aptitude", difficulty: "easy", question_text: "Train at 60 km/hr crosses pole in 9 sec. Length?", marks: 2, negative_marks: 0.5, explanation: "150 meters", options: [{ text: "120m", isCorrect: false }, { text: "150m", isCorrect: true }, { text: "180m", isCorrect: false }, { text: "200m", isCorrect: false }] },
    { subcategory: "Quantitative Aptitude", difficulty: "medium", question_text: "Ages ratio 3:5, after 10 years 5:7. B's age?", marks: 3, negative_marks: 0.75, explanation: "25 years", options: [{ text: "20", isCorrect: false }, { text: "25", isCorrect: true }, { text: "30", isCorrect: false }, { text: "35", isCorrect: false }] },
    { subcategory: "Quantitative Aptitude", difficulty: "medium", question_text: "Simple interest: 815 in 3 years, 854 in 4 years. Principal?", marks: 3, negative_marks: 0.75, explanation: "Rs. 698", options: [{ text: "650", isCorrect: false }, { text: "698", isCorrect: true }, { text: "720", isCorrect: false }, { text: "750", isCorrect: false }] },
    { subcategory: "Quantitative Aptitude", difficulty: "hard", question_text: "Buy 12 for Rs.100, sell 10 for Rs.120. Profit %?", marks: 4, negative_marks: 1, explanation: "44%", options: [{ text: "30%", isCorrect: false }, { text: "40%", isCorrect: false }, { text: "44%", isCorrect: true }, { text: "50%", isCorrect: false }] },
    // Logical (5)
    { subcategory: "Logical Reasoning", difficulty: "easy", question_text: "Series: 2, 1, 1/2, 1/4, ... Next?", marks: 2, negative_marks: 0.5, explanation: "1/8", options: [{ text: "1/3", isCorrect: false }, { text: "1/8", isCorrect: true }, { text: "2/8", isCorrect: false }, { text: "1/16", isCorrect: false }] },
    { subcategory: "Logical Reasoning", difficulty: "easy", question_text: "If GHOST coded as HIPSTU, how to code GHOST?", marks: 2, negative_marks: 0.5, explanation: "HIPSTU", options: [{ text: "GJHIUU", isCorrect: false }, { text: "HIPSTU", isCorrect: true }, { text: "HJPTUV", isCorrect: false }, { text: "GHJIST", isCorrect: false }] },
    { subcategory: "Logical Reasoning", difficulty: "medium", question_text: "Pointing to photo: 'That man's father is my father's son'. Who?", marks: 3, negative_marks: 0.75, explanation: "His son", options: [{ text: "His father", isCorrect: false }, { text: "His son", isCorrect: true }, { text: "His uncle", isCorrect: false }, { text: "His brother", isCorrect: false }] },
    { subcategory: "Logical Reasoning", difficulty: "medium", question_text: "All roses are flowers. Some flowers are red. Conclusion?", marks: 3, negative_marks: 0.75, explanation: "Some flowers are beautiful", options: [{ text: "All roses beautiful", isCorrect: false }, { text: "Some flowers beautiful", isCorrect: true }, { text: "All red are flowers", isCorrect: false }, { text: "No roses are red", isCorrect: false }] },
    { subcategory: "Logical Reasoning", difficulty: "hard", question_text: "Rahul 12th from left, 15th from right. Total students?", marks: 4, negative_marks: 1, explanation: "26", options: [{ text: "24", isCorrect: false }, { text: "25", isCorrect: false }, { text: "26", isCorrect: true }, { text: "27", isCorrect: false }] },
    // Verbal (5)
    { subcategory: "Verbal Ability", difficulty: "easy", question_text: "Synonym of ABUNDANT:", marks: 2, negative_marks: 0.5, explanation: "Copious", options: [{ text: "Scarce", isCorrect: false }, { text: "Copious", isCorrect: true }, { text: "Rare", isCorrect: false }, { text: "Sparse", isCorrect: false }] },
    { subcategory: "Verbal Ability", difficulty: "easy", question_text: "Opposite of BENEVOLENT:", marks: 2, negative_marks: 0.5, explanation: "Malevolent", options: [{ text: "Generous", isCorrect: false }, { text: "Malevolent", isCorrect: true }, { text: "Charitable", isCorrect: false }, { text: "Philanthropic", isCorrect: false }] },
    { subcategory: "Verbal Ability", difficulty: "medium", question_text: "Error: Neither the students nor the teacher were present.", marks: 3, negative_marks: 0.75, explanation: "Change 'were' to 'was'", options: [{ text: "Change students", isCorrect: false }, { text: "Change were to was", isCorrect: true }, { text: "Change nor", isCorrect: false }, { text: "Change present", isCorrect: false }] },
    { subcategory: "Verbal Ability", difficulty: "medium", question_text: "Fill: The committee ______ divided.", marks: 3, negative_marks: 0.75, explanation: "are", options: [{ text: "is", isCorrect: false }, { text: "are", isCorrect: true }, { text: "was", isCorrect: false }, { text: "were", isCorrect: false }] },
    { subcategory: "Verbal Ability", difficulty: "hard", question_text: "Rearrange: (P)The scientists (Q)discovery (R)after years (S)genetics", marks: 4, negative_marks: 1, explanation: "PRQS", options: [{ text: "PQRS", isCorrect: false }, { text: "PRQS", isCorrect: true }, { text: "QPRS", isCorrect: false }, { text: "PSQR", isCorrect: false }] },
    // Data Interpretation (5)
    { subcategory: "Data Interpretation", difficulty: "easy", question_text: "Pie chart: Marketing 20% of 10L. Budget?", marks: 2, negative_marks: 0.5, explanation: "Rs. 2L", options: [{ text: "1L", isCorrect: false }, { text: "2L", isCorrect: true }, { text: "3L", isCorrect: false }, { text: "4L", isCorrect: false }] },
    { subcategory: "Data Interpretation", difficulty: "easy", question_text: "Sales 150 to 225. % increase?", marks: 2, negative_marks: 0.5, explanation: "50%", options: [{ text: "40%", isCorrect: false }, { text: "50%", isCorrect: true }, { text: "60%", isCorrect: false }, { text: "75%", isCorrect: false }] },
    { subcategory: "Data Interpretation", difficulty: "medium", question_text: "Temps: 25,28,24,30,27. Average?", marks: 3, negative_marks: 0.75, explanation: "26.8", options: [{ text: "25.8", isCorrect: false }, { text: "26.4", isCorrect: false }, { text: "26.8", isCorrect: true }, { text: "27.2", isCorrect: false }] },
    { subcategory: "Data Interpretation", difficulty: "medium", question_text: "Profits: Q1:50K, Q2:75K, Q3:60K, Q4:90K. Max growth?", marks: 3, negative_marks: 0.75, explanation: "Q4", options: [{ text: "Q2", isCorrect: false }, { text: "Q3", isCorrect: false }, { text: "Q4", isCorrect: true }, { text: "Q1", isCorrect: false }] },
    { subcategory: "Data Interpretation", difficulty: "hard", question_text: "Trains 300km apart, 60km/hr and 40km/hr. Meet time?", marks: 4, negative_marks: 1, explanation: "3 hours", options: [{ text: "2h", isCorrect: false }, { text: "3h", isCorrect: true }, { text: "4h", isCorrect: false }, { text: "5h", isCorrect: false }] },
];
// ─────────────────────────────────────────────────────────────────────────────
// CODING PROBLEMS (6)
// ─────────────────────────────────────────────────────────────────────────────
const codingProblems = [
    { title: "Two Sum", difficulty: "easy", marks: 10, time_limit_ms: 1000, memory_limit_kb: 256000, description: "Given array nums and target, return indices of two numbers that add up to target.", test_cases: 5 },
    { title: "Reverse String", difficulty: "easy", marks: 10, time_limit_ms: 1000, memory_limit_kb: 256000, description: "Reverse a string given as array of characters.", test_cases: 4 },
    { title: "Valid Parentheses", difficulty: "medium", marks: 15, time_limit_ms: 2000, memory_limit_kb: 256000, description: "Determine if input string with brackets is valid.", test_cases: 6 },
    { title: "Merge Intervals", difficulty: "medium", marks: 15, time_limit_ms: 2000, memory_limit_kb: 256000, description: "Merge all overlapping intervals.", test_cases: 5 },
    { title: "Longest Increasing Path", difficulty: "hard", marks: 20, time_limit_ms: 3000, memory_limit_kb: 256000, description: "Find length of longest increasing path in matrix.", test_cases: 5 },
    { title: "Minimum Window Substring", difficulty: "hard", marks: 20, time_limit_ms: 3000, memory_limit_kb: 256000, description: "Find minimum window containing all characters from t.", test_cases: 5 },
];
// ─────────────────────────────────────────────────────────────────────────────
// COMMUNICATION (GRAMMAR) QUESTIONS (12)
// ─────────────────────────────────────────────────────────────────────────────
const communicationQuestions = [
    // Reading (3)
    { skill: "reading_mcq", difficulty: "medium", question_text: "Read passage about technology. Main idea?", marks: 10, explanation: "Tech affects workplace productivity" },
    { skill: "reading_mcq", difficulty: "medium", question_text: "Based on article, inference about author's AI view?", marks: 10, explanation: "Author has balanced view" },
    { skill: "reading_mcq", difficulty: "hard", question_text: "Analyze text tone: optimistic, pessimistic, or neutral?", marks: 15, explanation: "Neutral with slight optimism" },
    // Writing (3)
    { skill: "writing", difficulty: "easy", question_text: "Write formal email to manager requesting time off (min 100 words).", marks: 10, explanation: "Assess clarity and professionalism" },
    { skill: "writing", difficulty: "medium", question_text: "Write persuasive paragraph (150-200 words) on remote work policies.", marks: 15, explanation: "Assess argument structure" },
    { skill: "writing", difficulty: "hard", question_text: "Write technical report on project (250-300 words) with challenges, solutions, outcomes.", marks: 20, explanation: "Assess technical writing skills" },
    // Speaking (3)
    { skill: "speaking", difficulty: "easy", question_text: "Introduce yourself, describe education and career goals (2 min).", marks: 10, explanation: "Assess fluency and pronunciation" },
    { skill: "speaking", difficulty: "medium", question_text: "Describe challenging work situation and resolution (2-3 min).", marks: 15, explanation: "Assess storytelling ability" },
    { skill: "speaking", difficulty: "hard", question_text: "Present argument on controversial topic (3 min) with reasoning.", marks: 20, explanation: "Assess persuasive speaking" },
    // Listening (3)
    { skill: "listening_mcq", difficulty: "easy", question_text: "Listen to simple conversation. Main topic?", marks: 10, explanation: "Basic comprehension" },
    { skill: "listening_mcq", difficulty: "medium", question_text: "Listen to business meeting. Budget decision made?", marks: 15, explanation: "Extract specific information" },
    { skill: "listening_mcq", difficulty: "hard", question_text: "Listen to academic lecture excerpt. Summarize key arguments.", marks: 20, explanation: "Comprehension of complex content" },
];
// ─────────────────────────────────────────────────────────────────────────────
// MNC QUESTIONS (20)
// ─────────────────────────────────────────────────────────────────────────────
const mncQuestions = [
    // Quantitative (5)
    { category: "Quantitative", difficulty: "easy", question_text: "Shopkeeper 20% profit. If bought 10% less, sold for 21 less, gained 25%. CP?", marks: 2, negative_marks: 0.66, explanation: "Rs. 280", options: [{ text: "200", isCorrect: false }, { text: "240", isCorrect: false }, { text: "280", isCorrect: true }, { text: "300", isCorrect: false }] },
    { category: "Quantitative", difficulty: "medium", question_text: "A completes in 12 days, B in 15. Work together 5 days, C completes rest in 4 days. C alone?", marks: 3, negative_marks: 1, explanation: "16 days", options: [{ text: "12", isCorrect: false }, { text: "14", isCorrect: false }, { text: "16", isCorrect: true }, { text: "18", isCorrect: false }] },
    { category: "Quantitative", difficulty: "medium", question_text: "Pipe A fills in 6 hours, B in 4 hours. Both open, fill time?", marks: 3, negative_marks: 1, explanation: "2.4 hours", options: [{ text: "2h", isCorrect: false }, { text: "2.4h", isCorrect: true }, { text: "3h", isCorrect: false }, { text: "5h", isCorrect: false }] },
    { category: "Quantitative", difficulty: "hard", question_text: "Compound interest: 2 years at 10% is Rs. 420. Principal?", marks: 4, negative_marks: 1.33, explanation: "Rs. 2000", options: [{ text: "1800", isCorrect: false }, { text: "1900", isCorrect: false }, { text: "2000", isCorrect: true }, { text: "2100", isCorrect: false }] },
    { category: "Quantitative", difficulty: "hard", question_text: "Mixture of 60L milk and water 2:1. Add water to make 1:1?", marks: 4, negative_marks: 1.33, explanation: "20L", options: [{ text: "10L", isCorrect: false }, { text: "15L", isCorrect: false }, { text: "20L", isCorrect: true }, { text: "25L", isCorrect: false }] },
    // Logical (5)
    { category: "Logical", difficulty: "easy", question_text: "All students intelligent. Some intelligent creative. Conclusion?", marks: 2, negative_marks: 0.66, explanation: "Does not follow", options: [{ text: "Follows", isCorrect: false }, { text: "Does not follow", isCorrect: true }, { text: "Can't tell", isCorrect: false }, { text: "Both", isCorrect: false }] },
    { category: "Logical", difficulty: "medium", question_text: "Code: 'dom pul ta' = 'eat hot food', 'pul som tir' = 'hot sweet cake'. 'hot' code?", marks: 3, negative_marks: 1, explanation: "pul", options: [{ text: "dom", isCorrect: false }, { text: "pul", isCorrect: true }, { text: "ta", isCorrect: false }, { text: "som", isCorrect: false }] },
    { category: "Logical", difficulty: "medium", question_text: "If 2nd Feb 2004 is Sunday, what day is 9th April 2004?", marks: 3, negative_marks: 1, explanation: "Friday", options: [{ text: "Wed", isCorrect: false }, { text: "Thu", isCorrect: false }, { text: "Fri", isCorrect: true }, { text: "Sat", isCorrect: false }] },
    { category: "Logical", difficulty: "hard", question_text: "5 people in row. A right of B, C left of D, E right of A. Who is middle?", marks: 4, negative_marks: 1.33, explanation: "A", options: [{ text: "B", isCorrect: false }, { text: "A", isCorrect: true }, { text: "D", isCorrect: false }, { text: "C", isCorrect: false }] },
    { category: "Logical", difficulty: "hard", question_text: "Venn diagram: Doctors, Lawyers, Engineers. Where are Doctor-Lawyers who aren't Engineers?", marks: 4, negative_marks: 1.33, explanation: "Intersection of Doctors and Lawyers only", options: [{ text: "All three", isCorrect: false }, { text: "Doctors-Lawyers intersection only", isCorrect: true }, { text: "Doctors only", isCorrect: false }, { text: "Outside all", isCorrect: false }] },
    // Technical (5)
    { category: "Technical", difficulty: "easy", question_text: "Time complexity of accessing ArrayList by index?", marks: 2, negative_marks: 0.66, explanation: "O(1)", options: [{ text: "O(1)", isCorrect: true }, { text: "O(log n)", isCorrect: false }, { text: "O(n)", isCorrect: false }, { text: "O(n^2)", isCorrect: false }] },
    { category: "Technical", difficulty: "medium", question_text: "SQL keyword to eliminate duplicates?", marks: 3, negative_marks: 1, explanation: "DISTINCT", options: [{ text: "UNIQUE", isCorrect: false }, { text: "DISTINCT", isCorrect: true }, { text: "GROUP BY", isCorrect: false }, { text: "ORDER BY", isCorrect: false }] },
    { category: "Technical", difficulty: "medium", question_text: "HTTP status code for 'Not Found'?", marks: 3, negative_marks: 1, explanation: "404", options: [{ text: "400", isCorrect: false }, { text: "401", isCorrect: false }, { text: "404", isCorrect: true }, { text: "500", isCorrect: false }] },
    { category: "Technical", difficulty: "hard", question_text: "Which sorting has worst case O(n log n)?", marks: 4, negative_marks: 1.33, explanation: "Merge Sort", options: [{ text: "Quick Sort", isCorrect: false }, { text: "Bubble Sort", isCorrect: false }, { text: "Merge Sort", isCorrect: true }, { text: "Insertion Sort", isCorrect: false }] },
    { category: "Technical", difficulty: "hard", question_text: "TCP vs UDP: Which is connection-oriented?", marks: 4, negative_marks: 1.33, explanation: "TCP", options: [{ text: "TCP", isCorrect: true }, { text: "UDP", isCorrect: false }, { text: "Both", isCorrect: false }, { text: "Neither", isCorrect: false }] },
    // Verbal (5)
    { category: "Verbal", difficulty: "easy", question_text: "Correct spelling:", marks: 2, negative_marks: 0.66, explanation: "Accommodate", options: [{ text: "Acommodate", isCorrect: false }, { text: "Accomodate", isCorrect: false }, { text: "Accommodate", isCorrect: true }, { text: "Acommadate", isCorrect: false }] },
    { category: "Verbal", difficulty: "medium", question_text: "Meaning of 'bite off more than one can chew':", marks: 3, negative_marks: 1, explanation: "Take on more than can handle", options: [{ text: "Eat too much", isCorrect: false }, { text: "Take on more than can handle", isCorrect: true }, { text: "Be greedy", isCorrect: false }, { text: "Dental problems", isCorrect: false }] },
    { category: "Verbal", difficulty: "medium", question_text: "Correct sentence:", marks: 3, negative_marks: 1, explanation: "She and I are going", options: [{ text: "Her and me are going", isCorrect: false }, { text: "She and I are going", isCorrect: true }, { text: "Her and I are going", isCorrect: false }, { text: "She and me are going", isCorrect: false }] },
    { category: "Verbal", difficulty: "hard", question_text: "Antonym of 'EPHEMERAL':", marks: 4, negative_marks: 1.33, explanation: "Eternal", options: [{ text: "Transient", isCorrect: false }, { text: "Fleeting", isCorrect: false }, { text: "Eternal", isCorrect: true }, { text: "Momentary", isCorrect: false }] },
    { category: "Verbal", difficulty: "hard", question_text: "Analog: Book is to Reading as Fork is to:", marks: 4, negative_marks: 1.33, explanation: "Eating", options: [{ text: "Cooking", isCorrect: false }, { text: "Eating", isCorrect: true }, { text: "Serving", isCorrect: false }, { text: "Cutting", isCorrect: false }] },
];
// ─────────────────────────────────────────────────────────────────────────────
// ROLE QUESTIONS (15)
// ─────────────────────────────────────────────────────────────────────────────
const roleQuestions = [
    // Scenarios (8)
    { category: "Scenarios", difficulty: "easy", question_text: "Two team members conflict affecting productivity. First step?", marks: 2, explanation: "Meet individually", options: [{ text: "Ignore", isCorrect: false }, { text: "Meet together immediately", isCorrect: false }, { text: "Meet individually", isCorrect: true }, { text: "Report to management", isCorrect: false }] },
    { category: "Scenarios", difficulty: "medium", question_text: "Critical deadline, team overworked. How to handle?", marks: 3, explanation: "Prioritize and communicate risks", options: [{ text: "Push longer hours", isCorrect: false }, { text: "Request extension", isCorrect: false }, { text: "Prioritize and communicate", isCorrect: true }, { text: "Hire temporary staff", isCorrect: false }] },
    { category: "Scenarios", difficulty: "hard", question_text: "Senior member taking credit for junior work. Address how?", marks: 4, explanation: "Address privately, establish processes", options: [{ text: "Ignore it", isCorrect: false }, { text: "Confront publicly", isCorrect: false }, { text: "Address privately", isCorrect: true }, { text: "Report to HR", isCorrect: false }] },
    { category: "Scenarios", difficulty: "easy", question_text: "Key stakeholder requests change mid-project. What do you do?", marks: 2, explanation: "Assess impact and discuss options", options: [{ text: "Refuse immediately", isCorrect: false }, { text: "Implement right away", isCorrect: false }, { text: "Assess impact and discuss", isCorrect: true }, { text: "Ignore the request", isCorrect: false }] },
    { category: "Scenarios", difficulty: "medium", question_text: "Team member consistently misses deadlines. Action?", marks: 3, explanation: "Private conversation to understand", options: [{ text: "Fire immediately", isCorrect: false }, { text: "Public criticism", isCorrect: false }, { text: "Private conversation", isCorrect: true }, { text: "Do nothing", isCorrect: false }] },
    { category: "Scenarios", difficulty: "hard", question_text: "Budget cut by 30%. How to deliver project?", marks: 4, explanation: "Re-scope and prioritize features", options: [{ text: "Cut corners on quality", isCorrect: false }, { text: "Rescope and prioritize", isCorrect: true }, { text: "Ask team to work free", isCorrect: false }, { text: "Abandon project", isCorrect: false }] },
    { category: "Scenarios", difficulty: "medium", question_text: "Client unhappy with deliverable. Response?", marks: 3, explanation: "Listen, understand, propose solution", options: [{ text: "Defend the work", isCorrect: false }, { text: "Blame team", isCorrect: false }, { text: "Listen and propose solution", isCorrect: true }, { text: "Offer refund only", isCorrect: false }] },
    { category: "Scenarios", difficulty: "easy", question_text: "New requirement discovered late. Best action?", marks: 2, explanation: "Evaluate and communicate impact", options: [{ text: "Hide it until launch", isCorrect: false }, { text: "Add without telling anyone", isCorrect: false }, { text: "Evaluate and communicate", isCorrect: true }, { text: "Ignore it", isCorrect: false }] },
    // Conceptual (4)
    { category: "Conceptual", difficulty: "medium", question_text: "Difference between leadership and management?", marks: 3, explanation: "Leadership inspires, management maintains", options: [{ text: "No difference", isCorrect: false }, { text: "Management > leadership", isCorrect: false }, { text: "Leadership inspires, management maintains", isCorrect: true }, { text: "Only for executives", isCorrect: false }] },
    { category: "Conceptual", difficulty: "hard", question_text: "Agile retrospective purpose?", marks: 4, explanation: "Reflect and improve processes", options: [{ text: "Assign blame", isCorrect: false }, { text: "Plan next sprint", isCorrect: false }, { text: "Reflect and improve", isCorrect: true }, { text: "Report to stakeholders", isCorrect: false }] },
    { category: "Conceptual", difficulty: "medium", question_text: "What is technical debt?", marks: 3, explanation: "Cost of additional rework", options: [{ text: "Money owed to tech team", isCorrect: false }, { text: "Cost of additional rework", isCorrect: true }, { text: "Hardware loan", isCorrect: false }, { text: "Software license cost", isCorrect: false }] },
    { category: "Conceptual", difficulty: "hard", question_text: "Servant leadership means:", marks: 4, explanation: "Serve the team's needs first", options: [{ text: "Make team serve you", isCorrect: false }, { text: "Serve team's needs first", isCorrect: true }, { text: "Do all work yourself", isCorrect: false }, { text: "Let team make all decisions", isCorrect: false }] },
    // Situational (3)
    { category: "Situational", difficulty: "easy", question_text: "Top performer resigns mid-project. What do?", marks: 2, explanation: "Assess knowledge, redistribute work", options: [{ text: "Panic and cancel", isCorrect: false }, { text: "Hire immediately", isCorrect: false }, { text: "Assess and redistribute", isCorrect: true }, { text: "Cover tasks alone", isCorrect: false }] },
    { category: "Situational", difficulty: "medium", question_text: "Client requests feature outside scope. How respond?", marks: 3, explanation: "Acknowledge and explain scope", options: [{ text: "Agree immediately", isCorrect: false }, { text: "Refuse without explanation", isCorrect: false }, { text: "Acknowledge and explain", isCorrect: true }, { text: "Implement secretly", isCorrect: false }] },
    { category: "Situational", difficulty: "hard", question_text: "Critical system failure during demo. Action?", marks: 4, explanation: "Acknowledge, fix, reschedule if needed", options: [{ text: "Blame IT team", isCorrect: false }, { text: "Pretend nothing happened", isCorrect: false }, { text: "Acknowledge and fix", isCorrect: true }, { text: "Cancel permanently", isCorrect: false }] },
];
// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
async function seedAptitude(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments (assessment_code, assessment_name, module_type, total_time_minutes, total_questions, shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value, status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'aptitude', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code) DO UPDATE SET assessment_name = EXCLUDED.assessment_name, total_time_minutes = EXCLUDED.total_time_minutes, total_questions = EXCLUDED.total_questions, updated_at = NOW()
         RETURNING assessment_id`, ["TECH_APT_001", "Technical Aptitude Assessment", 60, aptitudeQuestions.length, true, true, true, 0.25, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of aptitudeQuestions) {
        const questionResult = await client.query(`INSERT INTO tech_aptitude_questions (assessment_id, subcategory, difficulty, question_text, correct_option_id, marks, negative_marks, explanation, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, 'active', NOW(), NOW()) RETURNING aptitude_question_id`, [assessmentId, question.subcategory, question.difficulty, question.question_text, question.marks, question.negative_marks, question.explanation]);
        const questionId = questionResult.rows[0].aptitude_question_id;
        let correctOptionId = null;
        for (const option of question.options) {
            const optionResult = await client.query(`INSERT INTO tech_aptitude_options (aptitude_question_id, option_text, created_at) VALUES ($1, $2, NOW()) RETURNING option_id`, [questionId, option.text]);
            if (option.isCorrect)
                correctOptionId = optionResult.rows[0].option_id;
        }
        if (correctOptionId) {
            await client.query(`UPDATE tech_aptitude_questions SET correct_option_id = $1, updated_at = NOW() WHERE aptitude_question_id = $2`, [correctOptionId, questionId]);
        }
    }
    console.log(`Seeded ${aptitudeQuestions.length} aptitude questions`);
}
async function seedCoding(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments (assessment_code, assessment_name, module_type, total_time_minutes, total_questions, shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value, status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'coding', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code) DO UPDATE SET assessment_name = EXCLUDED.assessment_name, total_time_minutes = EXCLUDED.total_time_minutes, total_questions = EXCLUDED.total_questions, updated_at = NOW()
         RETURNING assessment_id`, ["TECH_CODE_001", "Coding Assessment", 90, codingProblems.length, false, false, false, null, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const problem of codingProblems) {
        await client.query(`INSERT INTO tech_coding_questions (assessment_id, problem_title, problem_statement, difficulty, marks, negative_marks, limits_json, allowed_languages_json, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, 'active', NOW(), NOW())
             ON CONFLICT DO NOTHING`, [assessmentId, problem.title, problem.description, problem.difficulty, problem.marks, JSON.stringify({ time_limit_ms: problem.time_limit_ms, memory_limit_kb: problem.memory_limit_kb }), JSON.stringify(["python", "javascript", "java", "cpp"])]);
    }
    console.log(`Seeded ${codingProblems.length} coding problems`);
}
async function seedCommunication(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments (assessment_code, assessment_name, module_type, total_time_minutes, total_questions, shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value, status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'grammar', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code) DO UPDATE SET assessment_name = EXCLUDED.assessment_name, total_time_minutes = EXCLUDED.total_time_minutes, total_questions = EXCLUDED.total_questions, updated_at = NOW()
         RETURNING assessment_id`, ["TECH_COMM_001", "Communication Skills Assessment", 45, communicationQuestions.length, false, false, false, null, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of communicationQuestions) {
        await client.query(`INSERT INTO tech_grammar_questions (assessment_id, task_type, difficulty, question_text, reference_answer, rubric_json, marks, negative_marks, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'active', NOW(), NOW())
             ON CONFLICT DO NOTHING`, [assessmentId, question.skill, question.difficulty, question.question_text, "AI evaluated response", JSON.stringify({ criteria: ["grammar", "vocabulary", "coherence"] }), question.marks]);
    }
    console.log(`Seeded ${communicationQuestions.length} communication questions`);
}
async function seedMNC(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments (assessment_code, assessment_name, module_type, total_time_minutes, total_questions, shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value, status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'mnc', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code) DO UPDATE SET assessment_name = EXCLUDED.assessment_name, total_time_minutes = EXCLUDED.total_time_minutes, total_questions = EXCLUDED.total_questions, updated_at = NOW()
         RETURNING assessment_id`, ["TECH_MNC_001", "MNC Readiness Assessment", 60, mncQuestions.length, true, true, true, 0.33, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of mncQuestions) {
        const questionResult = await client.query(`INSERT INTO tech_mnc_questions (assessment_id, topic_group, difficulty, question_text, correct_option_id, marks, negative_marks, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, 'active', NOW(), NOW()) RETURNING mnc_question_id`, [assessmentId, question.category, question.difficulty, question.question_text, question.marks, question.negative_marks]);
        const questionId = questionResult.rows[0].mnc_question_id;
        let correctOptionId = null;
        for (const option of question.options) {
            const optionResult = await client.query(`INSERT INTO tech_mnc_options (mnc_question_id, option_text, created_at) VALUES ($1, $2, NOW()) RETURNING option_id`, [questionId, option.text]);
            if (option.isCorrect)
                correctOptionId = optionResult.rows[0].option_id;
        }
        if (correctOptionId) {
            await client.query(`UPDATE tech_mnc_questions SET correct_option_id = $1, updated_at = NOW() WHERE mnc_question_id = $2`, [correctOptionId, questionId]);
        }
    }
    console.log(`Seeded ${mncQuestions.length} MNC questions`);
}
async function seedRole(client, adminUserId) {
    const assessmentResult = await client.query(`INSERT INTO tech_assessments (assessment_code, assessment_name, module_type, total_time_minutes, total_questions, shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value, status, created_by, created_at, updated_at)
         VALUES ($1, $2, 'role', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
         ON CONFLICT (assessment_code) DO UPDATE SET assessment_name = EXCLUDED.assessment_name, total_time_minutes = EXCLUDED.total_time_minutes, total_questions = EXCLUDED.total_questions, updated_at = NOW()
         RETURNING assessment_id`, ["TECH_ROLE_001", "Role Fit Assessment", 45, roleQuestions.length, true, true, false, null, adminUserId]);
    const assessmentId = assessmentResult.rows[0].assessment_id;
    for (const question of roleQuestions) {
        const questionResult = await client.query(`INSERT INTO tech_role_questions (assessment_id, domain, question_type, question_text, scenario_context, correct_option_id, marks, negative_marks, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NULL, $6, 0, 'active', NOW(), NOW()) RETURNING role_question_id`, [assessmentId, question.category, 'mcq', question.question_text, 'Workplace scenario', question.marks]);
        const questionId = questionResult.rows[0].role_question_id;
        let correctOptionId = null;
        for (const option of question.options) {
            const optionResult = await client.query(`INSERT INTO tech_role_options (role_question_id, option_text, created_at) VALUES ($1, $2, NOW()) RETURNING option_id`, [questionId, option.text]);
            if (option.isCorrect)
                correctOptionId = optionResult.rows[0].option_id;
        }
        if (correctOptionId) {
            await client.query(`UPDATE tech_role_questions SET correct_option_id = $1, updated_at = NOW() WHERE role_question_id = $2`, [correctOptionId, questionId]);
        }
    }
    console.log(`Seeded ${roleQuestions.length} Role questions`);
}
// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL
// ─────────────────────────────────────────────────────────────────────────────
const run = async () => {
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const adminUserId = await getAdminUserId(client);
        if (!adminUserId)
            throw new Error("No users found. Add a user first or set ADMIN_USER_ID.");
        console.log("\nSeeding all assessment data...\n");
        await seedAptitude(client, adminUserId);
        await seedCoding(client, adminUserId);
        await seedCommunication(client, adminUserId);
        await seedMNC(client, adminUserId);
        await seedRole(client, adminUserId);
        await client.query("COMMIT");
        console.log("\nAll assessment data seeded successfully!");
        console.log(`\nSummary: ${aptitudeQuestions.length} Aptitude, ${codingProblems.length} Coding, ${communicationQuestions.length} Communication, ${mncQuestions.length} MNC, ${roleQuestions.length} Role`);
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("\nFailed to seed data:", error.message);
        process.exit(1);
    }
    finally {
        client.release();
        await db_1.default.end();
    }
};
run();
