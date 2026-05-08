
const { Client } = require('pg');

async function removeColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres:072005@localhost:5432/originbi'
  });

  try {
    await client.connect();
    console.log('Connected to database. Removing columns...');

    const tables = [
      'tech_aptitude_questions',
      'tech_grammar_questions',
      'tech_mnc_questions',
      'tech_role_questions'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS explanation;`);
        console.log(`✅ Removed explanation column from ${table}`);
      } catch (err) {
        console.error(`❌ Error updating ${table}:`, err.message);
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Connection error:', err.stack);
  } finally {
    await client.end();
  }
}

removeColumns();
