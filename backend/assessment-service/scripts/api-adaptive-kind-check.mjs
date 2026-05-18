import pg from 'pg';

const BASE = process.env.ASSESS_BASE_URL || 'http://localhost:5501/api';
const USER_ID = Number(process.env.ASSESS_USER_ID || '33');
const ASSESSMENT_CODE = process.env.ASSESSMENT_CODE || 'TECH_APT_001';

const db = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '0023',
  database: process.env.DB_NAME || 'originbi',
});

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function firstOptionId(question) {
  return Array.isArray(question?.options) && question.options.length > 0
    ? String(question.options[0].id)
    : null;
}

async function main() {
  await db.connect();
  let snapshot = null;
  try {
    const start = await req('/assessment/aptitude/attempts/block-based', {
      method: 'POST',
      body: { assessmentCode: ASSESSMENT_CODE, userId: USER_ID, mode: 'main' },
    });
    const token = start.attemptToken;
    let currentBlock = start.currentBlock;
    let currentBlockNumber = Number(start.currentBlockNumber || 1);
    const allAnswers = {};

    if (!currentBlock?.questions?.length) {
      throw new Error('No questions returned in first adaptive block');
    }

    const targetQuestion = currentBlock.questions[0];
    const qid = String(targetQuestion.id);

    const optsRes = await db.query(
      `SELECT option_id::text AS id
       FROM tech_aptitude_options
       WHERE aptitude_question_id=$1
       ORDER BY option_id ASC
       LIMIT 2`,
      [qid],
    );
    if (optsRes.rows.length < 2) {
      throw new Error(`Need at least 2 options for MSQ check, found ${optsRes.rows.length}`);
    }
    const msqAnswer = [String(optsRes.rows[0].id), String(optsRes.rows[1].id)];

    const qState = await db.query(
      `SELECT metadata, correct_option_id
       FROM tech_aptitude_questions
       WHERE aptitude_question_id=$1`,
      [qid],
    );
    snapshot = {
      qid,
      metadata: qState.rows[0]?.metadata ?? {},
      correctOptionId: qState.rows[0]?.correct_option_id ?? null,
      token,
    };

    await db.query(
      `UPDATE tech_aptitude_questions
       SET metadata=$1::jsonb, correct_option_id=NULL
       WHERE aptitude_question_id=$2`,
      [JSON.stringify({ ...(snapshot.metadata || {}), kind: 'msq', correctOptionIds: msqAnswer }), qid],
    );

    await req(`/assessment/aptitude/attempts/${token}/blocks/${currentBlockNumber}/answers`, {
      method: 'PATCH',
      body: { answers: { [qid]: msqAnswer } },
    });

    const blockReload = await req(
      `/assessment/aptitude/attempts/${token}/blocks/${currentBlockNumber}/questions`,
    );
    const restored = (blockReload.questions || []).find((q) => String(q.id) === qid);

    const nextResult = await req(
      `/assessment/aptitude/attempts/${token}/blocks/${currentBlockNumber}/next`,
      {
        method: 'POST',
        body: { timeTaken: 90, answers: { [qid]: msqAnswer } },
      },
    );
    allAnswers[qid] = msqAnswer;

    while (nextResult.canProceed) {
      currentBlockNumber += 1;
      currentBlock = nextResult.nextBlock;
      const blockAnswers = {};
      for (const q of currentBlock.questions || []) {
        const opt = firstOptionId(q);
        if (opt) {
          blockAnswers[String(q.id)] = opt;
          allAnswers[String(q.id)] = opt;
        }
      }
      const nr = await req(
        `/assessment/aptitude/attempts/${token}/blocks/${currentBlockNumber}/next`,
        { method: 'POST', body: { timeTaken: 90, answers: blockAnswers } },
      );
      if (!nr.canProceed) {
        break;
      }
      Object.assign(nextResult, nr);
    }

    const submitted = await req(`/assessment/aptitude/attempts/${token}/submit-block-based`, {
      method: 'POST',
      body: { answers: allAnswers },
    });
    const review = (submitted.questionReviews || []).find((q) => String(q.questionId) === qid);

    console.log(
      JSON.stringify(
        {
          token,
          targetQuestionId: qid,
          restoredAnswerFromBlockGet: restored?.selectedOptionId ?? null,
          submittedReview: {
            type: review?.type ?? null,
            selectedOptionId: review?.selectedOptionId ?? null,
            status: review?.status ?? null,
            isCorrect: review?.isCorrect ?? null,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    if (snapshot) {
      await db.query(
        `UPDATE tech_aptitude_questions
         SET metadata=$1::jsonb, correct_option_id=$2
         WHERE aptitude_question_id=$3`,
        [
          snapshot.metadata ? JSON.stringify(snapshot.metadata) : '{}',
          snapshot.correctOptionId,
          snapshot.qid,
        ],
      );
    }
    await db.end();
  }
}

main().catch((err) => {
  console.error('ADAPTIVE_KIND_CHECK_FAILED');
  console.error(err?.message || err);
  process.exit(1);
});
