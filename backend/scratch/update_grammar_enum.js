
const { Client } = require('pg');

async function updateEnum() {
  const client = new Client({
    connectionString: 'postgresql://postgres:072005@localhost:5432/originbi'
  });

  try {
    await client.connect();
    console.log('Connected to database. Updating TechGrammarTaskType enum...');

    // Postgres doesn't allow adding enum values inside a transaction, 
    // so we run them individually.
    const newValues = ['mcq', 'reading'];
    
    for (const val of newValues) {
      try {
        await client.query(`ALTER TYPE tech_grammar_task_type ADD VALUE IF NOT EXISTS '${val}';`);
        console.log(`✅ Added '${val}' to tech_grammar_task_type enum`);
      } catch (err) {
        console.error(`❌ Error adding '${val}':`, err.message);
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Connection error:', err.stack);
  } finally {
    await client.end();
  }
}

updateEnum();
