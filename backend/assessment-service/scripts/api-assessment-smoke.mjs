const BASE = process.env.ASSESS_BASE_URL || 'http://localhost:5501/api';
const USER_ID = Number(process.env.ASSESS_USER_ID || '1');

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} failed: ${res.status}`);
    err.payload = data;
    throw err;
  }
  return data;
}

function firstOptionId(question) {
  return Array.isArray(question?.options) && question.options.length > 0
    ? String(question.options[0].id)
    : null;
}

function buildObjectiveAnswer(question) {
  const kind = String(question?.metadata?.kind || 'mcq').toLowerCase();
  if (kind === 'msq') {
    const id = firstOptionId(question);
    return id ? [id] : [];
  }
  if (kind === 'numerical') {
    const expected = question?.metadata?.correctAnswer;
    if (expected !== undefined && expected !== null && String(expected).trim() !== '') {
      return String(expected);
    }
    return '1';
  }
  return firstOptionId(question);
}

async function runStandardModule(module, assessmentCode) {
  const started = await req(`/assessment/${module}/attempts`, {
    method: 'POST',
    body: { assessmentCode, mode: 'main', userId: USER_ID },
  });
  const token = started.attemptToken || started.token;
  const qPayload = await req(`/assessment/${module}/attempts/${token}/questions`);
  const questions = qPayload.questions || [];
  const answers = {};

  for (const q of questions) {
    const qid = String(q.id);
    if (module === 'grammar') {
      const taskType = String(q.taskType || '').toLowerCase();
      if (taskType === 'listening_mcq' || taskType === 'reading_mcq' || taskType === 'mcq') {
        const opt = firstOptionId(q);
        if (opt) answers[qid] = { optionId: opt };
      } else if (taskType === 'writing') {
        answers[qid] = { text: 'Smoke-test writing response.' };
      } else if (taskType === 'speaking') {
        answers[qid] = { text: 'Smoke-test speaking placeholder.' };
      }
    } else {
      const answer = buildObjectiveAnswer(q);
      if (answer !== null && answer !== undefined && answer !== '') {
        answers[qid] = { optionId: answer };
      }
    }
  }

  await req(`/assessment/${module}/attempts/${token}/answers`, {
    method: 'PATCH',
    body: { answers },
  });

  const submitted = await req(`/assessment/${module}/attempts/${token}/submit`, {
    method: 'POST',
    body: { answers },
  });

  const latest = await req(
    `/assessment/${module}/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(USER_ID))}`,
  );

  return {
    module,
    token,
    questionCount: questions.length,
    submittedScore: submitted.totalScore,
    latestScore: latest?.totalScore,
    submittedAnswered: submitted.answeredCount,
    latestAnswered: latest?.answeredCount,
    kindsSeen: [...new Set(questions.map((q) => String(q?.metadata?.kind || 'mcq')))],
  };
}

async function runAdaptive(assessmentCode) {
  const start = await req('/assessment/aptitude/attempts/block-based', {
    method: 'POST',
    body: { assessmentCode, mode: 'main', userId: USER_ID },
  });
  const token = start.attemptToken;
  let currentBlock = start.currentBlock;
  let currentBlockNumber = Number(start.currentBlockNumber || 1);
  const allAnswers = {};
  const path = [];

  for (let guard = 0; guard < 8; guard++) {
    const blockAnswers = {};
    for (const q of currentBlock.questions || []) {
      const ans = buildObjectiveAnswer(q);
      if (ans !== null && ans !== undefined && ans !== '') {
        blockAnswers[String(q.id)] = ans;
        allAnswers[String(q.id)] = ans;
      }
    }

    const nextRes = await req(
      `/assessment/aptitude/attempts/${token}/blocks/${currentBlockNumber}/next`,
      {
        method: 'POST',
        body: { timeTaken: 120, answers: blockAnswers },
      },
    );
    path.push({
      block: currentBlockNumber,
      nextDifficulty: nextRes?.blockSummary?.nextBlockDifficulty || null,
      accuracy: nextRes?.blockSummary?.accuracyScore || null,
    });

    if (!nextRes.canProceed) break;
    currentBlock = nextRes.nextBlock;
    currentBlockNumber += 1;
  }

  const status = await req(`/assessment/aptitude/attempts/${token}/blocks/status`);
  const submitted = await req(`/assessment/aptitude/attempts/${token}/submit-block-based`, {
    method: 'POST',
    body: { answers: allAnswers },
  });
  const latest = await req(
    `/assessment/aptitude/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(USER_ID))}`,
  );

  return {
    token,
    blocksSeen: status.blocks?.length || 0,
    path,
    submittedScore: submitted.totalScore,
    latestScore: latest?.totalScore,
    answered: submitted.answeredCount,
    totalQuestions: submitted.totalQuestions,
  };
}

async function main() {
  const asm = await req('/assessment/admin/assessments');
  const byModule = new Map((asm.data || []).map((a) => [a.module_type, a]));

  const standardModules = [
    ['aptitude', byModule.get('aptitude')?.assessment_code || 'TECH_APT_001'],
    ['grammar', byModule.get('grammar')?.assessment_code || 'TECH_COMM_001'],
    ['mnc', byModule.get('mnc')?.assessment_code || 'TECH_MNC_001'],
    ['role', byModule.get('role')?.assessment_code || 'TECH_ROLE_001'],
  ];

  const results = [];
  for (const [module, code] of standardModules) {
    results.push(await runStandardModule(module, code));
  }

  const adaptive = await runAdaptive(byModule.get('aptitude')?.assessment_code || 'TECH_APT_001');

  const report = { base: BASE, standard: results, adaptive };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('SMOKE_TEST_FAILED');
  console.error(err?.message || err);
  if (err?.payload) console.error(JSON.stringify(err.payload, null, 2));
  process.exit(1);
});
