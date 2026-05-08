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

    // Check coding questions columns
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tech_coding_questions' ORDER BY ordinal_position
    `);
    console.log('Coding questions columns:', cols.rows.map(r => r.column_name).join(', '));

    // Test simple query first
    const simple = await client.query('SELECT coding_question_id, problem_title FROM tech_coding_questions WHERE assessment_id = $1 LIMIT 1', [assessmentId]);
    console.log('Simple query works:', simple.rows.length);

    // Try the complex query with all columns
    try {
      const query = `
        SELECT q.coding_question_id, q.problem_statement as question_text, q.difficulty,
               q.problem_title as title, q.marks,
               q.starter_code_json::text as startercode, q.starter_files_json::text as starterfiles,
               q.entry_file_json::text as entryfile, q.limits_json::text as limits,
               q.sample_io_json::text as sampleio, q.allowed_languages_json::text as allowedlanguages,
               q.input_format as inputformat, q.output_format as outputformat, q.constraints
        FROM tech_coding_questions q
        WHERE q.assessment_id = $1 AND q.status = 'active'
        LIMIT 1
      `;
      const result = await client.query(query, [assessmentId]);
      console.log('Complex query works:', result.rows.length);
    } catch (e) {
      console.error('Complex query error:', e.message);
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

test();
