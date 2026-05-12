#!/usr/bin/env node

/**
 * Test script for the Block-Based Adaptive Assessment System
 * 
 * This script tests the complete adaptive assessment flow including:
 * - Database schema validation
 * - API endpoint testing
 * - Adaptive logic verification
 * - Fallback mechanism testing
 */

const http = require('http');
const { Pool } = require('pg');

// Configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tech_assessments',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  }
};

const pool = new Pool(config.db);

// Test utilities
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// HTTP request helper
function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Database query helper
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Test functions
async function testDatabaseSchema() {
  logInfo('Testing database schema...');
  
  try {
    // Check adaptive tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('adaptive_blocks', 'block_attempts', 'adaptive_paths', 'question_pool_metadata', 'block_generation_cache', 'adaptive_performance_analytics')
    `);

    const expectedTables = ['adaptive_blocks', 'block_attempts', 'adaptive_paths', 'question_pool_metadata', 'block_generation_cache', 'adaptive_performance_analytics'];
    const foundTables = tables.map(t => t.table_name);

    for (const table of expectedTables) {
      if (foundTables.includes(table)) {
        logSuccess(`Table ${table} exists`);
      } else {
        logError(`Table ${table} missing`);
        return false;
      }
    }

    // Check assessment configuration
    const assessments = await query(`
      SELECT assessment_id, assessment_code, block_config, adaptive_config
      FROM tech_assessments 
      WHERE (block_config->>'enabled')::boolean = true
    `);

    if (assessments.length === 0) {
      logWarning('No assessments configured for adaptive mode');
      logInfo('Run the setup script to enable adaptive mode');
    } else {
      logSuccess(`Found ${assessments.length} adaptive assessment(s)`);
      for (const assessment of assessments) {
        logInfo(`  - ${assessment.assessment_code}: ${JSON.stringify(assessment.block_config)}`);
      }
    }

    return true;
  } catch (error) {
    logError(`Database schema test failed: ${error.message}`);
    return false;
  }
}

async function testQuestionPool() {
  logInfo('Testing question pool adequacy...');
  
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_questions,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_questions,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_questions,
        COUNT(DISTINCT subcategory) as categories
      FROM tech_aptitude_questions 
      WHERE status = 'active'
    `);

    const pool = result[0];
    const minPerDifficulty = 5;
    const minTotal = 20;

    logInfo(`Question pool summary:`);
    logInfo(`  Total questions: ${pool.total_questions}`);
    logInfo(`  Easy questions: ${pool.easy_questions}`);
    logInfo(`  Medium questions: ${pool.medium_questions}`);
    logInfo(`  Hard questions: ${pool.hard_questions}`);
    logInfo(`  Categories: ${pool.categories}`);

    let adequate = true;

    if (pool.total_questions < minTotal) {
      logError(`Insufficient total questions: ${pool.total_questions} (minimum ${minTotal})`);
      adequate = false;
    } else {
      logSuccess(`Sufficient total questions: ${pool.total_questions}`);
    }

    if (pool.easy_questions < minPerDifficulty) {
      logError(`Insufficient easy questions: ${pool.easy_questions} (minimum ${minPerDifficulty})`);
      adequate = false;
    } else {
      logSuccess(`Sufficient easy questions: ${pool.easy_questions}`);
    }

    if (pool.medium_questions < minPerDifficulty) {
      logError(`Insufficient medium questions: ${pool.medium_questions} (minimum ${minPerDifficulty})`);
      adequate = false;
    } else {
      logSuccess(`Sufficient medium questions: ${pool.medium_questions}`);
    }

    if (pool.hard_questions < minPerDifficulty) {
      logError(`Insufficient hard questions: ${pool.hard_questions} (minimum ${minPerDifficulty})`);
      adequate = false;
    } else {
      logSuccess(`Sufficient hard questions: ${pool.hard_questions}`);
    }

    return adequate;
  } catch (error) {
    logError(`Question pool test failed: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoints() {
  logInfo('Testing API endpoints...');
  
  try {
    // Test adaptive block initialization
    logInfo('Testing block initialization...');
    const initResponse = await makeRequest('POST', `${config.apiBaseUrl}/api/assessment/adaptive/blocks/initialize/1`);
    
    if (initResponse.statusCode === 200) {
      logSuccess('Block initialization endpoint working');
    } else {
      logError(`Block initialization failed: ${initResponse.statusCode}`);
      return false;
    }

    // Test assessment overview
    logInfo('Testing assessment overview...');
    const overviewResponse = await makeRequest('GET', `${config.apiBaseUrl}/api/assessment/adaptive/assessments/1/overview`);
    
    if (overviewResponse.statusCode === 200) {
      logSuccess('Assessment overview endpoint working');
    } else {
      logError(`Assessment overview failed: ${overviewResponse.statusCode}`);
    }

    // Test adaptive paths
    logInfo('Testing adaptive paths...');
    const pathsResponse = await makeRequest('GET', `${config.apiBaseUrl}/api/assessment/adaptive/paths/1`);
    
    if (pathsResponse.statusCode === 200) {
      logSuccess('Adaptive paths endpoint working');
      logInfo(`Found ${pathsResponse.body.paths.length} adaptive paths`);
    } else {
      logError(`Adaptive paths failed: ${pathsResponse.statusCode}`);
    }

    // Test system health
    logInfo('Testing system health...');
    const healthResponse = await makeRequest('GET', `${config.apiBaseUrl}/api/assessment/adaptive/analytics/1`);
    
    if (healthResponse.statusCode === 200) {
      logSuccess('System health endpoint working');
      const health = healthResponse.body;
      logInfo(`System status: ${health.summary.status}`);
      logInfo(`Adaptive tables: ${health.summary.adaptiveTables ? 'OK' : 'Missing'}`);
      logInfo(`Question pools: ${health.summary.questionPools ? 'OK' : 'Insufficient'}`);
    } else {
      logError(`System health check failed: ${healthResponse.statusCode}`);
    }

    return true;
  } catch (error) {
    logError(`API endpoint test failed: ${error.message}`);
    return false;
  }
}

async function testBlockGeneration() {
  logInfo('Testing block generation...');
  
  try {
    const blockRequest = {
      assessmentId: 1,
      blockNumber: 1,
      userId: 1,
      mode: 'main'
    };

    const response = await makeRequest('POST', `${config.apiBaseUrl}/api/assessment/adaptive/blocks/generate`, blockRequest);
    
    if (response.statusCode === 200) {
      const block = response.body;
      logSuccess('Block generation successful');
      logInfo(`Generated block ${block.blockNumber} with ${block.questions.length} questions`);
      logInfo(`Difficulty: ${block.difficulty}`);
      logInfo(`Adaptive: ${block.isAdaptive}`);
      
      // Validate block structure
      if (block.questions && Array.isArray(block.questions) && block.questions.length > 0) {
        logSuccess('Block structure valid');
        const question = block.questions[0];
        if (question.id && question.text && question.options && Array.isArray(question.options)) {
          logSuccess('Question structure valid');
        } else {
          logError('Question structure invalid');
          return false;
        }
      } else {
        logError('No questions in generated block');
        return false;
      }
    } else {
      logError(`Block generation failed: ${response.statusCode}`);
      if (response.body && response.body.message) {
        logError(`Error: ${response.body.message}`);
      }
      return false;
    }

    return true;
  } catch (error) {
    logError(`Block generation test failed: ${error.message}`);
    return false;
  }
}

async function testAdaptiveLogic() {
  logInfo('Testing adaptive logic...');
  
  try {
    // Test with high performance (should increase difficulty)
    const highPerfRequest = {
      assessmentId: 1,
      blockNumber: 2,
      userId: 1,
      mode: 'main',
      previousPerformance: {
        accuracy: 0.9,
        timeTaken: 200,
        difficultyAchieved: 'easy'
      }
    };

    const highPerfResponse = await makeRequest('POST', `${config.apiBaseUrl}/api/assessment/adaptive/blocks/generate`, highPerfRequest);
    
    if (highPerfResponse.statusCode === 200) {
      const block = highPerfResponse.body;
      logSuccess('High performance block generation successful');
      logInfo(`Generated difficulty: ${block.difficulty} (expected: medium or hard)`);
      
      if (block.difficulty === 'medium' || block.difficulty === 'hard') {
        logSuccess('Adaptive difficulty correctly increased');
      } else {
        logWarning('Adaptive difficulty may not have increased as expected');
      }
    }

    // Test with low performance (should decrease difficulty)
    const lowPerfRequest = {
      assessmentId: 1,
      blockNumber: 2,
      userId: 2,
      mode: 'main',
      previousPerformance: {
        accuracy: 0.3,
        timeTaken: 600,
        difficultyAchieved: 'hard'
      }
    };

    const lowPerfResponse = await makeRequest('POST', `${config.apiBaseUrl}/api/assessment/adaptive/blocks/generate`, lowPerfRequest);
    
    if (lowPerfResponse.statusCode === 200) {
      const block = lowPerfResponse.body;
      logSuccess('Low performance block generation successful');
      logInfo(`Generated difficulty: ${block.difficulty} (expected: easy or medium)`);
      
      if (block.difficulty === 'easy' || block.difficulty === 'medium') {
        logSuccess('Adaptive difficulty correctly decreased');
      } else {
        logWarning('Adaptive difficulty may not have decreased as expected');
      }
    }

    return true;
  } catch (error) {
    logError(`Adaptive logic test failed: ${error.message}`);
    return false;
  }
}

async function testFallbackMechanism() {
  logInfo('Testing fallback mechanism...');
  
  try {
    // Test with invalid assessment ID (should trigger fallback)
    const invalidRequest = {
      assessmentId: 99999,
      blockNumber: 1,
      userId: 1,
      mode: 'main'
    };

    const response = await makeRequest('POST', `${config.apiBaseUrl}/api/assessment/adaptive/blocks/generate`, invalidRequest);
    
    // Should either fail gracefully or return a fallback assessment
    if (response.statusCode === 400 || response.statusCode === 404) {
      logSuccess('Invalid request properly rejected');
    } else if (response.statusCode === 200 && response.body.isFallback) {
      logSuccess('Fallback mechanism activated');
      logInfo('Fallback assessment returned');
    } else {
      logWarning('Unexpected response for invalid request');
    }

    // Test system health check for fallback readiness
    const healthResponse = await makeRequest('GET', `${config.apiBaseUrl}/api/assessment/adaptive/analytics/1`);
    
    if (healthResponse.statusCode === 200) {
      const health = healthResponse.body;
      if (health.summary.recommendations && health.summary.recommendations.length > 0) {
        logInfo('System recommendations:');
        health.summary.recommendations.forEach(rec => logInfo(`  - ${rec}`));
      } else {
        logSuccess('No system issues detected');
      }
    }

    return true;
  } catch (error) {
    logError(`Fallback mechanism test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Block-Based Adaptive Assessment System Tests', colors.blue);
  log('='.repeat(60));
  
  const tests = [
    { name: 'Database Schema', fn: testDatabaseSchema },
    { name: 'Question Pool', fn: testQuestionPool },
    { name: 'API Endpoints', fn: testAPIEndpoints },
    { name: 'Block Generation', fn: testBlockGeneration },
    { name: 'Adaptive Logic', fn: testAdaptiveLogic },
    { name: 'Fallback Mechanism', fn: testFallbackMechanism }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log(`\n📋 Running ${test.name} Tests...`, colors.blue);
    log('-'.repeat(40));
    
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        logSuccess(`${test.name} tests passed`);
      } else {
        failed++;
        logError(`${test.name} tests failed`);
      }
    } catch (error) {
      failed++;
      logError(`${test.name} tests crashed: ${error.message}`);
    }
  }

  // Summary
  log('\n' + '='.repeat(60));
  log('📊 Test Summary', colors.blue);
  log(`✅ Passed: ${passed}`, colors.green);
  log(`❌ Failed: ${failed}`, colors.red);
  log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    logSuccess('All tests passed! The adaptive assessment system is ready.');
  } else {
    logWarning(`${failed} test suite(s) failed. Please review and fix issues.`);
  }

  // Cleanup
  await pool.end();
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    logError(`Test runner crashed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testDatabaseSchema,
  testQuestionPool,
  testAPIEndpoints,
  testBlockGeneration,
  testAdaptiveLogic,
  testFallbackMechanism
};
