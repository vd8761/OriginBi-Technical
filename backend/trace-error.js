require('dotenv').config();
const http = require('http');

function testEndpoint(module, code) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/assessment/${module}/attempts`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          console.log(`${module.toUpperCase()}: SUCCESS - ${parsed.totalQuestions} questions`);
          resolve(true);
        } else {
          console.log(`${module.toUpperCase()}: FAILED - Status ${res.statusCode}`);
          console.log(`Response: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`${module.toUpperCase()}: ERROR - ${e.message}`);
      resolve(false);
    });

    req.write(JSON.stringify({ assessmentCode: code, userId: 1, mode: 'main' }));
    req.end();
  });
}

async function testAll() {
  console.log('Testing all assessments...\n');
  await testEndpoint('aptitude', 'TECH_APT_001');
  await testEndpoint('mnc', 'TECH_MNC_001');
  await testEndpoint('role', 'TECH_ROLE_001');
  await testEndpoint('coding', 'TECH_CODE_001');
  await testEndpoint('grammar', 'TECH_COMM_001');
  console.log('\nDone!');
}

testAll();
