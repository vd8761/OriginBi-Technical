const BASE = process.env.ASSESS_BASE_URL || 'http://localhost:5501/api';
const USER_ID = Number(process.env.ASSESS_USER_ID || '33');

async function call(path, { method = 'GET', body } = {}) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return {
    ok: res.ok,
    status: res.status,
    elapsedMs: Date.now() - started,
    data,
  };
}

function pickAnswer(q) {
  const kind = String(q?.metadata?.kind || 'mcq').toLowerCase();
  const opts = Array.isArray(q?.options) ? q.options : [];
  if (kind === 'msq') {
    return opts.slice(0, 2).map((o) => String(o.id));
  }
  if (kind === 'numerical') {
    const expected = q?.metadata?.correctAnswer;
    return expected !== undefined && expected !== null ? String(expected) : '1';
  }
  return opts[0] ? String(opts[0].id) : null;
}

async function runStandard(module, assessmentCode) {
  const report = {
    module,
    assessmentCode,
    endpoints: [],
    validations: {},
  };

  const start = await call(`/assessment/${module}/attempts`, {
    method: 'POST',
    body: { assessmentCode, userId: USER_ID, mode: 'main' },
  });
  report.endpoints.push({ endpoint: `POST /assessment/${module}/attempts`, ...start });
  if (!start.ok) return report;
  const token = start.data?.attemptToken || start.data?.token;
  report.token = token;

  const questionsRes = await call(`/assessment/${module}/attempts/${token}/questions`);
  report.endpoints.push({ endpoint: `GET /assessment/${module}/attempts/${token}/questions`, ...questionsRes });
  if (!questionsRes.ok) return report;
  const questions = questionsRes.data?.questions || [];
  const answers = {};

  for (const q of questions) {
    const qid = String(q.id);
    if (module === 'grammar') {
      const t = String(q.taskType || '').toLowerCase();
      if (t === 'listening_mcq' || t === 'reading_mcq' || t === 'mcq') {
        const a = pickAnswer(q);
        if (a) answers[qid] = { optionId: a };
      } else if (t === 'writing') {
        answers[qid] = { text: 'Detailed API test writing answer.' };
      } else if (t === 'speaking') {
        answers[qid] = { text: 'Detailed API test speaking placeholder.' };
      }
    } else {
      const a = pickAnswer(q);
      if (a !== null && a !== undefined && a !== '') answers[qid] = { optionId: a };
    }
  }

  report.validations.questionCount = questions.length;
  report.validations.kindsSeen = [...new Set(questions.map((q) => String(q?.metadata?.kind || 'mcq')))];
  report.validations.answersPrepared = Object.keys(answers).length;

  const saveRes = await call(`/assessment/${module}/attempts/${token}/answers`, {
    method: 'PATCH',
    body: { answers },
  });
  report.endpoints.push({ endpoint: `PATCH /assessment/${module}/attempts/${token}/answers`, ...saveRes });

  const submitRes = await call(`/assessment/${module}/attempts/${token}/submit`, {
    method: 'POST',
    body: { answers },
  });
  report.endpoints.push({ endpoint: `POST /assessment/${module}/attempts/${token}/submit`, ...submitRes });

  const latestRes = await call(
    `/assessment/${module}/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(USER_ID))}`,
  );
  report.endpoints.push({ endpoint: `GET /assessment/${module}/latest-result`, ...latestRes });

  if (submitRes.ok && latestRes.ok) {
    report.validations.submittedScore = submitRes.data?.totalScore;
    report.validations.latestScore = latestRes.data?.totalScore;
    report.validations.submittedAnswered = submitRes.data?.answeredCount;
    report.validations.latestAnswered = latestRes.data?.answeredCount;
    report.validations.scoreMatches = submitRes.data?.totalScore === latestRes.data?.totalScore;
    report.validations.answeredMatches = submitRes.data?.answeredCount === latestRes.data?.answeredCount;
  }

  return report;
}

async function runAdaptive(assessmentCode) {
  const report = {
    module: 'aptitude-adaptive',
    assessmentCode,
    endpoints: [],
    validations: {},
  };

  const start = await call('/assessment/aptitude/attempts/block-based', {
    method: 'POST',
    body: { assessmentCode, userId: USER_ID, mode: 'main' },
  });
  report.endpoints.push({ endpoint: 'POST /assessment/aptitude/attempts/block-based', ...start });
  if (!start.ok) return report;

  const token = start.data?.attemptToken;
  report.token = token;
  let currentBlock = start.data?.currentBlock;
  let blockNo = Number(start.data?.currentBlockNumber || 1);
  const allAnswers = {};
  const path = [];

  for (let i = 0; i < 8; i++) {
    const blockAnswers = {};
    for (const q of currentBlock?.questions || []) {
      const a = pickAnswer(q);
      if (a !== null && a !== undefined && a !== '') {
        blockAnswers[String(q.id)] = a;
        allAnswers[String(q.id)] = a;
      }
    }

    const saveBlock = await call(`/assessment/aptitude/attempts/${token}/blocks/${blockNo}/answers`, {
      method: 'PATCH',
      body: { answers: blockAnswers },
    });
    report.endpoints.push({ endpoint: `PATCH /assessment/aptitude/attempts/${token}/blocks/${blockNo}/answers`, ...saveBlock });

    const next = await call(`/assessment/aptitude/attempts/${token}/blocks/${blockNo}/next`, {
      method: 'POST',
      body: { timeTaken: 90, answers: blockAnswers },
    });
    report.endpoints.push({ endpoint: `POST /assessment/aptitude/attempts/${token}/blocks/${blockNo}/next`, ...next });
    if (!next.ok) break;

    path.push({
      block: blockNo,
      canProceed: Boolean(next.data?.canProceed),
      nextDifficulty: next.data?.blockSummary?.nextBlockDifficulty ?? null,
      accuracyScore: next.data?.blockSummary?.accuracyScore ?? null,
    });

    if (!next.data?.canProceed) break;
    blockNo += 1;
    currentBlock = next.data?.nextBlock;
  }

  const status = await call(`/assessment/aptitude/attempts/${token}/blocks/status`);
  report.endpoints.push({ endpoint: `GET /assessment/aptitude/attempts/${token}/blocks/status`, ...status });

  const submit = await call(`/assessment/aptitude/attempts/${token}/submit-block-based`, {
    method: 'POST',
    body: { answers: allAnswers },
  });
  report.endpoints.push({ endpoint: `POST /assessment/aptitude/attempts/${token}/submit-block-based`, ...submit });

  const latest = await call(
    `/assessment/aptitude/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(USER_ID))}`,
  );
  report.endpoints.push({ endpoint: 'GET /assessment/aptitude/latest-result', ...latest });

  report.validations.path = path;
  report.validations.blocksSeen = status.data?.blocks?.length ?? 0;
  report.validations.submittedScore = submit.data?.totalScore ?? null;
  report.validations.latestScore = latest.data?.totalScore ?? null;
  report.validations.scoreMatches = submit.data?.totalScore === latest.data?.totalScore;
  report.validations.answered = submit.data?.answeredCount ?? null;
  report.validations.totalQuestions = submit.data?.totalQuestions ?? null;

  return report;
}

async function main() {
  const assessments = await call('/assessment/admin/assessments');
  if (!assessments.ok) {
    throw new Error(`Failed to load assessments: ${assessments.status}`);
  }
  const byModule = new Map((assessments.data?.data || []).map((a) => [a.module_type, a]));

  const preStats = await call(`/assessment/attempts-stats?userId=${encodeURIComponent(String(USER_ID))}`);
  const preInProgress = await call(`/assessment/in-progress?userId=${encodeURIComponent(String(USER_ID))}`);

  const standardModules = [
    ['aptitude', byModule.get('aptitude')?.assessment_code || 'TECH_APT_001'],
    ['grammar', byModule.get('grammar')?.assessment_code || 'TECH_COMM_001'],
    ['mnc', byModule.get('mnc')?.assessment_code || 'TECH_MNC_001'],
    ['role', byModule.get('role')?.assessment_code || 'TECH_ROLE_001'],
  ];

  const standardReports = [];
  for (const [module, code] of standardModules) {
    standardReports.push(await runStandard(module, code));
  }
  const adaptiveReport = await runAdaptive(byModule.get('aptitude')?.assessment_code || 'TECH_APT_001');

  const postStats = await call(`/assessment/attempts-stats?userId=${encodeURIComponent(String(USER_ID))}`);
  const postInProgress = await call(`/assessment/in-progress?userId=${encodeURIComponent(String(USER_ID))}`);

  const out = {
    baseUrl: BASE,
    userId: USER_ID,
    pre: {
      attemptsStats: preStats.data,
      inProgress: preInProgress.data,
    },
    standardReports,
    adaptiveReport,
    post: {
      attemptsStats: postStats.data,
      inProgress: postInProgress.data,
    },
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('DETAILED_API_AUDIT_FAILED');
  console.error(err?.message || err);
  process.exit(1);
});
