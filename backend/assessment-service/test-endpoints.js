// Quick test script to verify new endpoints
const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testEndpoints() {
  const baseOptions = {
    hostname: 'localhost',
    port: 5000,
    headers: { 'Content-Type': 'application/json' }
  };
  
  console.log('Testing new security endpoints...');
  
  // Test validate-eligibility endpoint
  try {
    const eligibilityOptions = {
      ...baseOptions,
      path: '/api/assessment/validate-eligibility',
      method: 'POST'
    };
    
    const eligibilityData = JSON.stringify({
      userId: 1,
      assessmentCode: 'TECH_APT_001',
      mode: 'trial'
    });
    
    const eligibilityRes = await makeRequest(eligibilityOptions, eligibilityData);
    console.log('Eligibility endpoint status:', eligibilityRes.status);
    console.log('Eligibility response:', eligibilityRes.data);
  } catch (err) {
    console.log('Eligibility endpoint error:', err.message);
  }
  
  // Test validate-certificate endpoint
  try {
    const certOptions = {
      ...baseOptions,
      path: '/api/assessment/validate-certificate',
      method: 'POST'
    };
    
    const certData = JSON.stringify({
      userId: 1,
      examId: 'aptitude',
      mode: 'main'
    });
    
    const certRes = await makeRequest(certOptions, certData);
    console.log('Certificate endpoint status:', certRes.status);
    console.log('Certificate response:', certRes.data);
  } catch (err) {
    console.log('Certificate endpoint error:', err.message);
  }
}

// Run test
testEndpoints();