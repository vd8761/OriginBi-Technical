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
    const assessment = await client.query('SELECT assessment_id FROM tech_assessments WHERE assessment_code = $1', ['TECH_CODE_001']);
    const assessmentId = assessment.rows[0]?.assessment_id;
    console.log('Assessment ID:', assessmentId);

    // Create a test attempt
    const attemptResult = await client.query(
      `INSERT INTO tech_coding_attempts (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'in_progress', NOW(), NOW() + INTERVAL '90 minutes', NOW(), NOW())
       RETURNING coding_attempt_id`,
      [assessmentId, 1, 'TEST-CODE-' + Date.now(), 'testseed']
    );
    const attemptId = attemptResult.rows[0].coding_attempt_id;
    console.log('Attempt ID:', attemptId);

    // Get questions
    const questions = await client.query(
      'SELECT coding_question_id FROM tech_coding_questions WHERE assessment_id = $1 AND status = $2',
      [assessmentId, 'active']
    );
    console.log('Questions count:', questions.rows.length);

    // Insert junction records
    for (let i = 0; i < Math.min(3, questions.rows.length); i++) {
      await client.query(
        `INSERT INTO tech_coding_attempt_questions (coding_attempt_id, coding_question_id, display_order)
         VALUES ($1, $2, $3)`,
        [attemptId, questions.rows[i].coding_question_id, i + 1]
      );
    }

    // Now test the query
    const query = `
      SELECT aq.display_order, q.coding_question_id as question_id, q.problem_statement as question_text,
             q.difficulty, q.problem_title as title, q.marks,
             q.starter_code_json as starterCode, q.starter_files_json as starterFiles,
             q.entry_file_json as entryFile, q.limits_json as limits,
             q.sample_io_json as sampleIo, q.allowed_languages_json as allowedLanguages,
             q.input_format as inputFormat, q.output_format as outputFormat, q.constraints,
             '[]'::json as options
      FROM tech_coding_attempt_questions aq
      JOIN tech_coding_questions q ON q.coding_question_id = aq.coding_question_id
      WHERE aq.coding_attempt_id = $1
      GROUP BY aq.display_order, q.coding_question_id, q.problem_statement, q.difficulty,
               q.problem_title, q.marks,
               q.starter_code_json::text, q.starter_files_json::text,
               q.entry_file_json::text, q.limits_json::text,
               q.sample_io_json::text, q.allowed_languages_json::text,
               q.input_format, q.output_format, q.constraints
      ORDER BY aq.display_order ASC
    `;

    console.log('Running query...');
    const result = await client.query(query, [attemptId]);
    console.log('Query success! Rows:', result.rows.length);
    console.log('First row:', JSON.stringify(result.rows[0], null, 2));

    // Cleanup
    await client.query('DELETE FROM tech_coding_attempt_questions WHERE coding_attempt_id = $1', [attemptId]);
    await client.query('DELETE FROM tech_coding_attempts WHERE coding_attempt_id = $1', [attemptId]);
    console.log('Cleanup done');

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    pool.end();
  }
}

test();
