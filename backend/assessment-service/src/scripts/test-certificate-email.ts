/**
 * TEST SCRIPT — Certificate Email
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds all completed tech assessments for jai@gmail.com (user_id=879),
 * then sends a certificate email for each one to jayakrishna0023@gmail.com.
 *
 * Run:
 *   npx ts-node src/scripts/test-certificate-email.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Pool } from 'pg';
import axios from 'axios';
import * as crypto from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────
const SOURCE_USER_EMAIL   = process.env.SOURCE_USER_EMAIL   || 'jai@gmail.com';
const TEST_RECIPIENT      = process.env.TEST_RECIPIENT      || 'jayakrishna0023@gmail.com';
const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL || 'http://localhost:4004';
const TECH_FRONTEND_URL   = process.env.TECH_FRONTEND_URL   || 'http://localhost:3000';

// ── DB pool ───────────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  user:     process.env.DB_USER     || 'postgres',
  password: String(process.env.DB_PASS || '0023'),
  database: process.env.DB_NAME     || 'originbi',
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const SERIAL_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  const buf = crypto.randomBytes(length);
  return Array.from(buf).map(b => SERIAL_CHARSET[b % SERIAL_CHARSET.length]).join('');
}

function getYyMm(d: Date): string {
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

function assessmentCode(module: string): string {
  const map: Record<string, string> = {
    aptitude: 'APT', grammar: 'COM', communication: 'COM',
    mnc: 'MNC', role: 'RBA', coding: 'COD',
  };
  return map[module] || module.slice(0, 3).toUpperCase();
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function moduleDisplayLabel(module: string): string {
  const map: Record<string, string> = {
    aptitude: 'Technical Aptitude',
    grammar: 'Communication Skills',
    communication: 'Communication Skills',
    mnc: 'MNC Readiness',
    role: 'Role-Based Assessment',
    coding: 'Coding Assessment',
  };
  return map[module] || module;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('─'.repeat(62));
  console.log('  Tech Assessment Certificate — Email Test');
  console.log('─'.repeat(62));
  console.log(`  Source user  : ${SOURCE_USER_EMAIL}`);
  console.log(`  Send to      : ${TEST_RECIPIENT}`);
  console.log(`  Student svc  : ${STUDENT_SERVICE_URL}`);
  console.log(`  Frontend URL : ${TECH_FRONTEND_URL}`);
  console.log('─'.repeat(62));

  // 1. Resolve user — users table has 'name' column (not first_name/last_name)
  const userRes = await pool.query(
    `SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [SOURCE_USER_EMAIL],
  );

  if (!userRes.rows.length) {
    console.error(`\n❌  User not found: ${SOURCE_USER_EMAIL}`);
    process.exit(1);
  }

  const user = userRes.rows[0];
  const userName: string = user.name || 'Jaya Krishna';

  console.log(`\n✅  Found user: "${userName}" (id=${user.id}, email=${user.email})`);

  // 2. Query all submitted attempts across every module
  const modules = [
    { module: 'aptitude', table: 'tech_aptitude_attempts', idCol: 'aptitude_attempt_id' },
    { module: 'grammar',  table: 'tech_grammar_attempts',  idCol: 'grammar_attempt_id'  },
    { module: 'mnc',      table: 'tech_mnc_attempts',      idCol: 'mnc_attempt_id'      },
    { module: 'role',     table: 'tech_role_attempts',     idCol: 'role_attempt_id'     },
    { module: 'coding',   table: 'tech_coding_attempts',   idCol: 'coding_attempt_id'   },
  ];

  interface CompletedAttempt {
    module: string;
    assessmentTitle: string;
    totalScore: number;
    maxScore: number;
    overallScorePercent: number;
    submittedAt: Date;
  }

  const completed: CompletedAttempt[] = [];

  for (const m of modules) {
    try {
      // Get the LATEST submitted attempt per assessment for this user
      const res = await pool.query(
        `SELECT DISTINCT ON (a.assessment_id)
                a.${m.idCol}, a.total_score, a.submitted_at,
                ass.assessment_name, ass.assessment_id
         FROM ${m.table} a
         JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
         WHERE a.user_id = $1 AND a.status IN ('submitted', 'evaluated')
         ORDER BY a.assessment_id, a.submitted_at DESC NULLS LAST`,
        [user.id],
      );

      for (const row of res.rows) {
        // Get max possible score from the attempt's questions
        const junctionTable = `tech_${m.module}_attempt_questions`;
        const questionTable  = `tech_${m.module}_questions`;
        const qIdCol         = `${m.module}_question_id`;

        const maxRes = await pool.query(
          `SELECT COALESCE(SUM(q.marks), COUNT(*)) AS max_score
           FROM ${junctionTable} aq
           JOIN ${questionTable} q ON q.${qIdCol} = aq.${qIdCol}
           WHERE aq.${m.idCol} = $1`,
          [row[m.idCol]],
        ).catch(() => ({ rows: [{ max_score: 100 }] }));

        const maxScore   = Math.max(1, Number(maxRes.rows[0]?.max_score || 100));
        const totalScore = Math.max(0, Number(row.total_score || 0));
        const pct        = Math.round((totalScore / maxScore) * 100);

        completed.push({
          module:              m.module,
          assessmentTitle:     row.assessment_name || moduleDisplayLabel(m.module),
          totalScore,
          maxScore,
          overallScorePercent: pct,
          submittedAt:         row.submitted_at ? new Date(row.submitted_at) : new Date(),
        });
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Could not query ${m.table}: ${err.message}`);
    }
  }

  if (!completed.length) {
    console.error(`\n❌  No submitted assessments found for ${SOURCE_USER_EMAIL} (id=${user.id})`);
    process.exit(1);
  }

  console.log(`\n📋  Found ${completed.length} completed assessment(s):\n`);
  completed.forEach((c, i) => {
    const grade = gradeFromScore(c.overallScorePercent);
    console.log(`  ${i + 1}. [${c.module.toUpperCase().padEnd(10)}] ${c.assessmentTitle}`);
    console.log(`     Score: ${c.totalScore}/${c.maxScore} = ${c.overallScorePercent}%  |  Grade: ${grade}`);
    console.log(`     Submitted: ${c.submittedAt.toLocaleString()}`);
  });

  // 3. Send one certificate email per completed assessment
  console.log(`\n📧  Sending ${completed.length} certificate email(s) → ${TEST_RECIPIENT}\n`);

  let sent = 0;
  let failed = 0;

  for (const attempt of completed) {
    const dateCode      = getYyMm(attempt.submittedAt);
    const aCode         = assessmentCode(attempt.module);
    const certificateId = `OBX-${dateCode}-${aCode}-${randomCode(4)}`;
    const grade         = gradeFromScore(attempt.overallScorePercent);
    const verifyUrl     = `${TECH_FRONTEND_URL}/verify/${certificateId}`;

    const payload = {
      toEmail:             TEST_RECIPIENT,
      userName,
      assessmentTitle:     attempt.assessmentTitle,
      assessmentModule:    attempt.module,
      overallScorePercent: attempt.overallScorePercent,
      grade,
      certificateId,
      completedAt:         attempt.submittedAt.toISOString(),
      verifyUrl,
    };

    console.log(`  → [${attempt.module.toUpperCase()}] ${attempt.assessmentTitle}`);
    console.log(`    Certificate ID : ${certificateId}`);
    console.log(`    Grade          : ${grade}  (${attempt.overallScorePercent}%)`);

    try {
      const res = await axios.post(
        `${STUDENT_SERVICE_URL}/student/tech-certificate-email`,
        payload,
        { timeout: 15_000, headers: { 'Content-Type': 'application/json' } },
      );
      console.log(`    ✅  Sent!  Response: ${JSON.stringify(res.data)}\n`);
      sent++;
    } catch (err: any) {
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      console.error(`    ❌  Failed: ${detail}\n`);
      failed++;
    }
  }

  // 4. Summary
  console.log('─'.repeat(62));
  console.log(`  Done.  ✅ Sent: ${sent}   ❌ Failed: ${failed}`);
  console.log('─'.repeat(62));

  await pool.end();
}

main().catch(err => {
  console.error('\n💥  Unexpected error:', err.message || err);
  process.exit(1);
});
