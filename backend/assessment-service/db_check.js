const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '0023',
    database: 'originbi',
  });

  await client.connect();
  console.log('Connected to DB');

  // Check columns in registrations table
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'registrations'
  `);
  console.log('Registrations columns:', colRes.rows.map(r => `${r.column_name} (${r.data_type})`));

  // Check if any row has mobile_number or country_code populated
  const sampleRes = await client.query(`
    SELECT r.id, r.full_name, r.mobile_number, r.country_code, r.phone, r.metadata
    FROM registrations r
    LIMIT 10
  `);
  console.log('Registrations sample rows:');
  console.dir(sampleRes.rows, { depth: null });

  await client.end();
}

main().catch(console.error);
