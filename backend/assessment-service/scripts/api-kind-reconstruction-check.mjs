import pg from 'pg';

const BASE = process.env.ASSESS_BASE_URL || 'http://localhost:5501/api';
const TOKEN = process.env.TEST_TOKEN;
const USER_ID = process.env.ASSESS_USER_ID || '32';

if (!TOKEN) {
  console.error('TEST_TOKEN is required');
  process.exit(1);
}

const db = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '0023',
  database: process.env.DB_NAME || 'originbi',
});

async function latest(module, token, userId) {
  const url = `${BASE}/assessment/${module}/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(userId))}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`latest-result failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function main() {
  await db.connect();
  let snapshot = null;
  try {
    const rowRes = await db.query(
      `
      SELECT a.mnc_attempt_id, aq.attempt_question_id, aq.mnc_question_id,
             aq.selected_option_id as aq_selected_option_id, aq.metadata as aq_metadata,
             q.correct_option_id as q_correct_option_id, q.metadata as q_metadata
      FROM tech_mnc_attempts a
      JOIN tech_mnc_attempt_questions aq ON aq.mnc_attempt_id = a.mnc_attempt_id
      JOIN tech_mnc_questions q ON q.mnc_question_id = aq.mnc_question_id
      WHERE a.attempt_token = $1
      ORDER BY aq.display_order ASC
      LIMIT 1
      `,
      [TOKEN],
    );
    if (rowRes.rows.length === 0) {
      throw new Error(`No attempt-question found for token: ${TOKEN}`);
    }
    const target = rowRes.rows[0];

    const optRes = await db.query(
      `SELECT option_id::text AS id
       FROM tech_mnc_options
       WHERE mnc_question_id=$1
       ORDER BY option_id ASC
       LIMIT 2`,
      [target.mnc_question_id],
    );
    if (optRes.rows.length === 0) {
      throw new Error('No options found for target MNC question');
    }
    const opt1 = String(optRes.rows[0].id);
    const opt2 = String(optRes.rows[Math.min(1, optRes.rows.length - 1)].id);

    snapshot = {
      qid: target.mnc_question_id,
      aqid: target.attempt_question_id,
      qMetadata: target.q_metadata,
      qCorrectOptionId: target.q_correct_option_id,
      aqMetadata: target.aq_metadata,
      aqSelectedOptionId: target.aq_selected_option_id,
    };

    const baseQMeta = asObject(snapshot.qMetadata);
    const baseAQMeta = asObject(snapshot.aqMetadata);

    // Scenario 1: numerical
    await db.query(
      `UPDATE tech_mnc_questions
       SET metadata=$1::jsonb, correct_option_id=NULL
       WHERE mnc_question_id=$2`,
      [JSON.stringify({ ...baseQMeta, kind: 'numerical', correctAnswer: '42' }), snapshot.qid],
    );
    await db.query(
      `UPDATE tech_mnc_attempt_questions
       SET selected_option_id=NULL, metadata=$1::jsonb
       WHERE attempt_question_id=$2`,
      [JSON.stringify({ ...baseAQMeta, submittedAnswer: '42' }), snapshot.aqid],
    );
    const numericalLatest = await latest('mnc', TOKEN, USER_ID);
    const numericalReview = (numericalLatest.questionReviews || []).find(
      (q) => String(q.questionId) === String(snapshot.qid),
    );

    // Scenario 2: msq
    await db.query(
      `UPDATE tech_mnc_questions
       SET metadata=$1::jsonb, correct_option_id=NULL
       WHERE mnc_question_id=$2`,
      [JSON.stringify({ ...baseQMeta, kind: 'msq', correctOptionIds: [opt1, opt2] }), snapshot.qid],
    );
    await db.query(
      `UPDATE tech_mnc_attempt_questions
       SET selected_option_id=NULL, metadata=$1::jsonb
       WHERE attempt_question_id=$2`,
      [JSON.stringify({ ...baseAQMeta, submittedAnswer: [opt1, opt2] }), snapshot.aqid],
    );
    const msqLatest = await latest('mnc', TOKEN, USER_ID);
    const msqReview = (msqLatest.questionReviews || []).find(
      (q) => String(q.questionId) === String(snapshot.qid),
    );

    console.log(
      JSON.stringify(
        {
          token: TOKEN,
          questionId: String(snapshot.qid),
          numerical: {
            type: numericalReview?.type || null,
            selectedOptionId: numericalReview?.selectedOptionId ?? null,
            status: numericalReview?.status || null,
            isCorrect: numericalReview?.isCorrect ?? null,
          },
          msq: {
            type: msqReview?.type || null,
            selectedOptionId: msqReview?.selectedOptionId ?? null,
            status: msqReview?.status || null,
            isCorrect: msqReview?.isCorrect ?? null,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    if (snapshot) {
      await db.query(
        `UPDATE tech_mnc_questions
         SET metadata=$1::jsonb, correct_option_id=$2
         WHERE mnc_question_id=$3`,
        [
          snapshot.qMetadata ? JSON.stringify(snapshot.qMetadata) : '{}',
          snapshot.qCorrectOptionId,
          snapshot.qid,
        ],
      );
      await db.query(
        `UPDATE tech_mnc_attempt_questions
         SET selected_option_id=$1, metadata=$2::jsonb
         WHERE attempt_question_id=$3`,
        [
          snapshot.aqSelectedOptionId,
          snapshot.aqMetadata ? JSON.stringify(snapshot.aqMetadata) : '{}',
          snapshot.aqid,
        ],
      );
    }
    await db.end();
  }
}

main().catch((err) => {
  console.error('KIND_CHECK_FAILED');
  console.error(err?.message || err);
  process.exit(1);
});
