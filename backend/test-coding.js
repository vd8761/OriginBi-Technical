require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'originbi'
});

async function test() {
  const client = await pool.connect();
  try {
    // Get coding assessment
    const assessment = await client.query(
      'SELECT * FROM tech_assessments WHERE assessment_code = $1',
      ['TECH_CODE_001']
    );
    console.log('Assessment:', assessment.rows[0]?.assessment_id, assessment.rows[0]?.assessment_code);

    if (assessment.rows[0]) {
      // Check questions
      const questions = await client.query(
        'SELECT COUNT(*) FROM tech_coding_questions WHERE assessment_id = $1 AND status = $2',
        [assessment.rows[0].assessment_id, 'active']
      );
      console.log('Questions count:', questions.rows[0].count);

      // Test query similar to what backend does
      const query = `
        SELECT 'dummy' as test, q.coding_question_id, q.problem_statement as question_text, q.difficulty,
               q.problem_title, q.problem_statement, q.starter_code_json::text, q.starter_files_json::text
        FROM tech_coding_questions q
        WHERE q.assessment_id = $1 AND q.status = 'active'
        LIMIT 1
      `;
      const result = await client.query(query, [assessment.rows[0].assessment_id]);
      console.log('Query success:', result.rows.length);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

test();
