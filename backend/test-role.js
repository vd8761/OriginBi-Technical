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
    // Get role assessment
    const assessment = await client.query('SELECT assessment_id FROM tech_assessments WHERE assessment_code = $1', ['TECH_ROLE_001']);
    console.log('Assessment ID:', assessment.rows[0]?.assessment_id);
    
    if (assessment.rows[0]) {
      // Try the query that would be used
      const query = `
        SELECT q.role_question_id, q.question_text, q.difficulty, q.domain, q.question_type, q.scenario_context, q.marks, q.negative_marks,
               COALESCE(json_agg(json_build_object('id', o.option_id::text, 'text', o.option_text)) FILTER (WHERE o.option_id IS NOT NULL), '[]'::json) as options
        FROM tech_role_questions q
        LEFT JOIN tech_role_options o ON o.role_question_id = q.role_question_id
        WHERE q.assessment_id = $1 AND q.status = 'active'
        GROUP BY q.role_question_id, q.question_text, q.difficulty, q.domain, q.question_type, q.scenario_context, q.marks, q.negative_marks
      `;
      const result = await client.query(query, [assessment.rows[0].assessment_id]);
      console.log('Query success, rows:', result.rows.length);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

test();
