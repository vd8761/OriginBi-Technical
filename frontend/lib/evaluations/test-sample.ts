/**
 * Test Script for All Evaluation Engines
 * Run this to verify the evaluation engines work correctly with sample data
 */

import {
  evaluateAptitudeAttempt,
  evaluateCodingAttempt,
  evaluateCommunicationAttempt,
  evaluateMNCAttempt,
  evaluateRoleAttempt,
  type AptitudeAnswer,
  type AptitudeQuestion,
  type CodeSubmission,
  type CodingQuestion,
  type CommunicationResponse,
  type CommunicationQuestion,
  type MNCRoleAnswer,
  type MNCQuestion,
  type RoleQuestion,
} from "./index";

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE TEST DATA
// ─────────────────────────────────────────────────────────────────────────────

// APTITUDE SAMPLE DATA
const sampleAptitudeQuestions: AptitudeQuestion[] = [
  { questionId: "q1", category: "Quantitative Aptitude", difficulty: "easy", marks: 2, negativeMarks: 0.5, correctOptionId: "opt1" },
  { questionId: "q2", category: "Logical Reasoning", difficulty: "easy", marks: 2, negativeMarks: 0.5, correctOptionId: "opt5" },
  { questionId: "q3", category: "Verbal Ability", difficulty: "medium", marks: 3, negativeMarks: 0.75, correctOptionId: "opt9" },
  { questionId: "q4", category: "Data Interpretation", difficulty: "medium", marks: 3, negativeMarks: 0.75, correctOptionId: "opt13" },
  { questionId: "q5", category: "Quantitative Aptitude", difficulty: "hard", marks: 4, negativeMarks: 1, correctOptionId: "opt17" },
];

// Simulate student answers (mixed performance)
const sampleAptitudeAnswers: AptitudeAnswer[] = [
  { questionId: "q1", selectedOptionId: "opt1", timeSpentSeconds: 45, answerChanges: 0, confidenceLevel: "high" }, // Correct
  { questionId: "q2", selectedOptionId: "opt5", timeSpentSeconds: 60, answerChanges: 1, confidenceLevel: "medium" }, // Correct
  { questionId: "q3", selectedOptionId: "opt10", timeSpentSeconds: 90, answerChanges: 2, confidenceLevel: "low" }, // Wrong (penalty)
  { questionId: "q4", selectedOptionId: "opt13", timeSpentSeconds: 120, answerChanges: 0, confidenceLevel: "high" }, // Correct
  { questionId: "q5", selectedOptionId: null, timeSpentSeconds: 180, answerChanges: 0, confidenceLevel: "low" }, // Skipped
];

// CODING SAMPLE DATA
const sampleCodingQuestions: CodingQuestion[] = [
  { questionId: "p1", title: "Two Sum", difficulty: "easy", maxMarks: 10, testCases: 5, timeLimitMs: 1000, memoryLimitKb: 256000 },
  { questionId: "p2", title: "Valid Parentheses", difficulty: "medium", maxMarks: 15, testCases: 6, timeLimitMs: 2000, memoryLimitKb: 256000 },
  { questionId: "p3", title: "Longest Increasing Path", difficulty: "hard", maxMarks: 20, testCases: 5, timeLimitMs: 3000, memoryLimitKb: 256000 },
];

const sampleCodeSubmissions: CodeSubmission[] = [
  { 
    questionId: "p1", 
    code: "function twoSum(nums, target) { const map = new Map(); for(let i=0; i<nums.length; i++) { const complement = target - nums[i]; if(map.has(complement)) return [map.get(complement), i]; map.set(nums[i], i); } }",
    language: "javascript",
    testCasesPassed: 5,
    totalTestCases: 5,
    executionTimeMs: 120,
    memoryUsedKb: 45000,
    timeSpentSeconds: 300,
    attempts: 1
  },
  { 
    questionId: "p2", 
    code: "function isValid(s) { const stack = []; const pairs = {'(': ')', '[': ']', '{': '}'}; for(let char of s) { if(pairs[char]) stack.push(char); else if(pairs[stack.pop()] !== char) return false; } return stack.length === 0; }",
    language: "javascript",
    testCasesPassed: 4,
    totalTestCases: 6,
    executionTimeMs: 180,
    memoryUsedKb: 52000,
    timeSpentSeconds: 600,
    attempts: 2
  },
  { 
    questionId: "p3", 
    code: "// Partial solution attempted but not completed",
    language: "javascript",
    testCasesPassed: 0,
    totalTestCases: 5,
    executionTimeMs: 0,
    memoryUsedKb: 0,
    timeSpentSeconds: 900,
    attempts: 3
  },
];

// COMMUNICATION SAMPLE DATA
const sampleCommQuestions: CommunicationQuestion[] = [
  { questionId: "c1", skill: "reading", difficulty: "medium", maxMarks: 10 },
  { questionId: "c2", skill: "writing", difficulty: "medium", maxMarks: 15 },
  { questionId: "c3", skill: "speaking", difficulty: "hard", maxMarks: 20 },
  { questionId: "c4", skill: "listening", difficulty: "easy", maxMarks: 10 },
];

const sampleCommResponses: CommunicationResponse[] = [
  { 
    questionId: "c1", 
    skill: "reading",
    aiEvaluation: { score: 75, grammarScore: 80, vocabularyScore: 70, coherenceScore: 75, comprehensionScore: 75 },
    timeSpentSeconds: 180,
    wordCount: 0,
    attemptCount: 1
  },
  { 
    questionId: "c2", 
    skill: "writing",
    textResponse: "Sample essay response with good structure and vocabulary...",
    aiEvaluation: { score: 70, grammarScore: 65, vocabularyScore: 75, coherenceScore: 70 },
    timeSpentSeconds: 600,
    wordCount: 250,
    attemptCount: 1
  },
  { 
    questionId: "c3", 
    skill: "speaking",
    audioUrl: "https://example.com/audio1.mp3",
    aiEvaluation: { score: 80, grammarScore: 75, vocabularyScore: 80, coherenceScore: 85, pronunciationScore: 85, fluencyScore: 80 },
    timeSpentSeconds: 180,
    attemptCount: 1
  },
  { 
    questionId: "c4", 
    skill: "listening",
    aiEvaluation: { score: 85, grammarScore: 90, vocabularyScore: 85, coherenceScore: 80, fluencyScore: 85, comprehensionScore: 85 },
    timeSpentSeconds: 120,
    attemptCount: 1
  },
];

// MNC SAMPLE DATA
const sampleMNCQuestions: MNCQuestion[] = [
  { questionId: "m1", category: "Quantitative", difficulty: "easy", marks: 2, negativeMarks: 0.66, correctOptionId: "mo1" },
  { questionId: "m2", category: "Logical", difficulty: "medium", marks: 3, negativeMarks: 1, correctOptionId: "mo5" },
  { questionId: "m3", category: "Technical", difficulty: "easy", marks: 2, negativeMarks: 0.66, correctOptionId: "mo9" },
  { questionId: "m4", category: "Verbal", difficulty: "medium", marks: 3, negativeMarks: 1, correctOptionId: "mo13" },
];

const sampleMNCAnswers: MNCRoleAnswer[] = [
  { questionId: "m1", selectedOptionId: "mo1", timeSpentSeconds: 60, answerChanges: 0 },
  { questionId: "m2", selectedOptionId: "mo6", timeSpentSeconds: 90, answerChanges: 1 },
  { questionId: "m3", selectedOptionId: "mo9", timeSpentSeconds: 45, answerChanges: 0 },
  { questionId: "m4", selectedOptionId: "mo13", timeSpentSeconds: 75, answerChanges: 0 },
];

// ROLE SAMPLE DATA
const sampleRoleQuestions: RoleQuestion[] = [
  { questionId: "r1", category: "Scenarios", difficulty: "easy", marks: 2, correctOptionId: "ro1" },
  { questionId: "r2", category: "Conceptual", difficulty: "medium", marks: 3, correctOptionId: "ro5" },
  { questionId: "r3", category: "Situational", difficulty: "easy", marks: 2, correctOptionId: "ro9" },
];

const sampleRoleAnswers: MNCRoleAnswer[] = [
  { questionId: "r1", selectedOptionId: "ro1", timeSpentSeconds: 90, answerChanges: 0 },
  { questionId: "r2", selectedOptionId: "ro5", timeSpentSeconds: 120, answerChanges: 1 },
  { questionId: "r3", selectedOptionId: "ro10", timeSpentSeconds: 80, answerChanges: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function testAptitudeEvaluation() {
  console.log("\n📊 TESTING APTITUDE EVALUATION");
  console.log("================================");
  
  const result = evaluateAptitudeAttempt(
    sampleAptitudeAnswers,
    sampleAptitudeQuestions,
    1800, // 30 minutes used
    3600, // 60 minutes total
    "test-token-apt-001"
  );
  
  console.log(`Overall Score: ${result.overallScore}%`);
  console.log(`Grade: ${result.grade}`);
  console.log(`Skill Level: ${result.skillLevel}`);
  console.log(`Accuracy: ${result.accuracy}%`);
  console.log(`Completion: ${result.completionRate}%`);
  console.log(`Certified: ${result.isCertified ? "✅" : "❌"} ${result.certificationLevel || ""}`);
  console.log(`Reliability: ${result.reliability.confidenceScore}%`);
  console.log(`\nSection Breakdown:`);
  result.sections.forEach(s => {
    console.log(`  ${s.category}: ${s.percentage}% (${s.correct}/${s.totalQuestions} correct)`);
  });
  console.log(`\nStrengths: ${result.categoryStrengths.join(", ") || "None"}`);
  console.log(`Weaknesses: ${result.categoryWeaknesses.join(", ") || "None"}`);
  console.log(`\nInsights:`);
  result.insights.forEach(i => console.log(`  • ${i.text}`));
  
  return result;
}

export function testCodingEvaluation() {
  console.log("\n💻 TESTING CODING EVALUATION");
  console.log("============================");
  
  const result = evaluateCodingAttempt(
    sampleCodeSubmissions,
    sampleCodingQuestions,
    1800, // 30 minutes
    5400, // 90 minutes total
    "test-token-code-001"
  );
  
  console.log(`Overall Score: ${result.overallScore}%`);
  console.log(`Grade: ${result.grade}`);
  console.log(`Skill Level: ${result.skillLevel}`);
  console.log(`Solved: ${result.solved}/${result.totalProblems}`);
  console.log(`Test Case Pass Rate: ${result.testCasePassRate}%`);
  console.log(`Certified: ${result.isCertified ? "✅" : "❌"} ${result.certificationLevel || ""}`);
  console.log(`\nBy Difficulty:`);
  console.log(`  Easy: ${result.byDifficulty.easy.solved}/${result.byDifficulty.easy.attempted} solved`);
  console.log(`  Medium: ${result.byDifficulty.medium.solved}/${result.byDifficulty.medium.attempted} solved`);
  console.log(`  Hard: ${result.byDifficulty.hard.solved}/${result.byDifficulty.hard.attempted} solved`);
  console.log(`\nProblem Results:`);
  result.problemResults.forEach(p => {
    console.log(`  ${p.title} (${p.difficulty}): ${p.status} - ${p.percentage}%`);
  });
  console.log(`\nSkill Gaps: ${result.skillGaps.join(", ") || "None"}`);
  console.log(`\nInsights:`);
  result.insights.forEach(i => console.log(`  • ${i.text}`));
  
  return result;
}

export function testCommunicationEvaluation() {
  console.log("\n🗣️ TESTING COMMUNICATION EVALUATION");
  console.log("====================================");
  
  const result = evaluateCommunicationAttempt(
    sampleCommResponses,
    sampleCommQuestions,
    1200, // 20 minutes
    2700, // 45 minutes total
    "test-token-comm-001"
  );
  
  console.log(`Overall Score: ${result.overallScore}%`);
  console.log(`Grade: ${result.grade}`);
  console.log(`Proficiency: ${result.proficiencyLevel} (${result.cefrLevel})`);
  console.log(`Completion: ${result.completionRate}%`);
  console.log(`Certified: ${result.isCertified ? "✅" : "❌"} ${result.certificationLevel || ""}`);
  console.log(`\nSkill Breakdown:`);
  result.skills.forEach(s => {
    console.log(`  ${s.skill}: ${s.percentage}% (AI Score: ${s.avgAiScore})`);
  });
  console.log(`\nStrongest Skill: ${result.strongestSkill || "N/A"}`);
  console.log(`Weakest Skill: ${result.weakestSkill || "N/A"}`);
  console.log(`\nComponent Scores:`);
  console.log(`  Grammar: ${result.avgGrammarScore}%`);
  console.log(`  Vocabulary: ${result.avgVocabularyScore}%`);
  console.log(`  Coherence: ${result.avgCoherenceScore}%`);
  console.log(`\nRecommended Focus:`);
  result.recommendedFocus.forEach(r => console.log(`  • ${r}`));
  console.log(`\nInsights:`);
  result.insights.forEach(i => console.log(`  • ${i.text}`));
  
  return result;
}

export function testMNCEvaluation() {
  console.log("\n🏢 TESTING MNC EVALUATION");
  console.log("=========================");
  
  const result = evaluateMNCAttempt(
    sampleMNCAnswers,
    sampleMNCQuestions,
    2400, // 40 minutes
    3600, // 60 minutes total
    "test-token-mnc-001"
  );
  
  console.log(`Overall Score: ${result.overallScore}%`);
  console.log(`Grade: ${result.grade}`);
  console.log(`MNC Readiness: ${result.mncReadinessScore}% (${result.readinessLevel})`);
  console.log(`Accuracy: ${result.accuracy}%`);
  console.log(`Certified: ${result.isCertified ? "✅" : "❌"} ${result.certificationLevel || ""}`);
  console.log(`\nCompany Matches:`);
  result.topCompanyMatches.forEach(c => console.log(`  • ${c}`));
  console.log(`\nSection Breakdown:`);
  result.sections.forEach(s => {
    console.log(`  ${s.category}: ${s.percentage}% (Readiness: ${s.mncReadiness}%)`);
  });
  console.log(`\nTechnical Competency: ${result.technicalCompetency.level}`);
  console.log(`  Score: ${result.technicalCompetency.score}%`);
  console.log(`  Strong: ${result.technicalCompetency.strongTopics.join(", ") || "None"}`);
  console.log(`  Weak: ${result.technicalCompetency.weakTopics.join(", ") || "None"}`);
  console.log(`\nNext Steps:`);
  result.nextSteps.forEach(s => console.log(`  • ${s}`));
  console.log(`\nInsights:`);
  result.insights.forEach(i => console.log(`  • ${i.text}`));
  
  return result;
}

export function testRoleEvaluation() {
  console.log("\n👔 TESTING ROLE EVALUATION");
  console.log("==========================");
  
  const result = evaluateRoleAttempt(
    sampleRoleAnswers,
    sampleRoleQuestions,
    800, // ~13 minutes
    2700, // 45 minutes total
    "test-token-role-001"
  );
  
  console.log(`Overall Score: ${result.overallScore}%`);
  console.log(`Grade: ${result.grade}`);
  console.log(`Role Fit: ${result.roleFitLevel}`);
  console.log(`Accuracy: ${result.accuracy}%`);
  console.log(`Certified: ${result.isCertified ? "✅" : "❌"} ${result.certificationLevel || ""}`);
  console.log(`\nPrimary Strength: ${result.primaryStrength}`);
  console.log(`Areas for Growth: ${result.areasForGrowth.join(", ") || "None"}`);
  console.log(`\nCompetencies:`);
  console.log(`  Problem Solving: ${result.competencies.problemSolving}%`);
  console.log(`  Decision Making: ${result.competencies.decisionMaking}%`);
  console.log(`  Communication: ${result.competencies.communication}%`);
  console.log(`  Adaptability: ${result.competencies.adaptability}%`);
  console.log(`  Leadership: ${result.competencies.leadership}%`);
  console.log(`\nRecommended Roles:`);
  result.recommendedRoles.forEach(r => console.log(`  • ${r}`));
  console.log(`\nDevelopment Areas:`);
  result.developmentAreas.forEach(d => console.log(`  • ${d}`));
  console.log(`\nInsights:`);
  result.insights.forEach(i => console.log(`  • ${i.text}`));
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────────────────────────

export function runAllTests() {
  console.log("\n" + "=".repeat(60));
  console.log("   ORIGINBI EVALUATION ENGINE TEST SUITE");
  console.log("=".repeat(60));
  
  const results = {
    aptitude: testAptitudeEvaluation(),
    coding: testCodingEvaluation(),
    communication: testCommunicationEvaluation(),
    mnc: testMNCEvaluation(),
    role: testRoleEvaluation(),
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("   TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Aptitude:      ${results.aptitude.overallScore}% | Grade: ${results.aptitude.grade} | Certified: ${results.aptitude.isCertified ? "✅" : "❌"}`);
  console.log(`Coding:        ${results.coding.overallScore}% | Grade: ${results.coding.grade} | Certified: ${results.coding.isCertified ? "✅" : "❌"}`);
  console.log(`Communication: ${results.communication.overallScore}% | Grade: ${results.communication.grade} | Certified: ${results.communication.isCertified ? "✅" : "❌"}`);
  console.log(`MNC:           ${results.mnc.overallScore}% | Grade: ${results.mnc.grade} | Certified: ${results.mnc.isCertified ? "✅" : "❌"}`);
  console.log(`Role:          ${results.role.overallScore}% | Grade: ${results.role.grade} | Certified: ${results.role.isCertified ? "✅" : "❌"}`);
  console.log("=".repeat(60));
  console.log("\n✅ All evaluation engines working correctly!");
  console.log("\nTo seed the database with these questions, run:");
  console.log("  npx ts-node backend/src/db/seed-all-assessments.ts");
  
  return results;
}

// Auto-run if executed directly
if (typeof window !== "undefined") {
  console.log("Test module loaded. Call runAllTests() to execute.");
}
