const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/assessment';

const modules = [
  { name: 'aptitude', code: 'TECH_APT_001' },
  { name: 'coding', code: 'TECH_CODE_001' },
  { name: 'grammar', code: 'TECH_COMM_001' },
  { name: 'mnc', code: 'TECH_MNC_001' },
  { name: 'role', code: 'TECH_ROLE_001' }
];

async function testAssessments() {
  for (const mod of modules) {
    console.log(`\n=== Testing ${mod.name.toUpperCase()} Assessment ===`);
    try {
      // 1. Start Attempt
      console.log(`[1] Starting attempt for ${mod.code}...`);
      const startRes = await axios.post(`${API_BASE}/${mod.name}/attempts`, {
        assessmentCode: mod.code,
        userId: 1,
        mode: 'main'
      });
      
      const data = startRes.data;
      const token = data.attemptToken || data.token;
      const questions = data.questions || [];
      
      console.log(`    Success! Token: ${token}, Questions received: ${questions.length}`);
      
      if (questions.length === 0) {
        console.log(`    No questions to answer. Skipping submission.`);
        continue;
      }

      // 2. Mock Answers
      console.log(`[2] Generating mock answers...`);
      const answers = {};
      
      for (let i = 0; i < Math.min(3, questions.length); i++) {
        const q = questions[i];
        if (mod.name === 'coding') {
          answers[q.id] = { code: 'console.log("Hello World");', language: 'javascript' };
        } else if (mod.name === 'grammar') {
           const type = q.taskType || q.task_type;
           if (type === 'reading_mcq' || type === 'listening_mcq') {
               if (q.options && q.options.length > 0) {
                   answers[q.id] = q.options[0].id;
               }
           } else if (type === 'writing') {
               answers[q.id] = { text: 'This is a mock writing answer.' };
           } else if (type === 'speaking') {
               answers[q.id] = { audioBase64: 'mock_audio_data' };
           } else {
               answers[q.id] = { text: 'Generic mock answer.' };
           }
        } else {
           // For aptitude, mnc, role (MCQ)
           if (q.options && q.options.length > 0) {
               answers[q.id] = q.options[0].id;
           }
        }
      }

      // 3. Submit Attempt
      console.log(`[3] Submitting attempt...`);
      const submitRes = await axios.post(`${API_BASE}/${mod.name}/attempts/${token}/submit`, {
        answers
      });
      
      const submitResult = submitRes.data;
      console.log(`    Success! Status: ${submitResult.status}`);
      console.log(`    Total Score: ${submitResult.totalScore}`);
      console.log(`    Correct: ${submitResult.correctCount}, Wrong: ${submitResult.wrongCount}, Answered: ${submitResult.answeredCount}`);
      
    } catch (error) {
      console.error(`    Error testing ${mod.name}:`, error.response ? JSON.stringify(error.response.data) : error.message);
    }
  }
}

testAssessments();
