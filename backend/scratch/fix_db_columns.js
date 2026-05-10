
const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:072005@localhost:5432/originbi'
  });

  try {
    await client.connect();
    console.log('Connected to database. Applying fixes...');

    const tables = ['tech_grammar_questions', 'tech_mnc_questions', 'tech_role_questions'];
    
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN explanation TEXT;`);
        console.log(`✅ Added explanation column to ${table}`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`ℹ️ Column already exists in ${table}, skipping.`);
        } else {
          console.error(`❌ Error updating ${table}:`, err.message);
        }
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Connection error:', err.stack);
  } finally {
    await client.end();
  }
}

fixDatabase();
