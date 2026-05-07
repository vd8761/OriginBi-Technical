
const { Client } = require('pg');

async function testModeLeakage() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'originbi',
    port: 5432,
  });

  await client.connect();

  try {
    console.log('--- Database State ---');
    const res = await client.query('SELECT aptitude_question_id, question_text, mode FROM tech_aptitude_questions;');
    console.table(res.rows);

    const assessmentId = 2; // Default Aptitude Assessment
    const mode = 'trial';

    console.log(`\n--- Querying for mode: ${mode} ---`);
    const qRes = await client.query(
      `SELECT aptitude_question_id FROM tech_aptitude_questions WHERE assessment_id = $1 AND status = 'active' AND mode = $2`,
      [assessmentId, mode]
    );
    console.log(`Found ${qRes.rows.length} questions for mode ${mode}`);
    console.table(qRes.rows);

  } finally {
    await client.end();
  }
}

testModeLeakage();
