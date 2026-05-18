const BASE = process.env.ASSESS_BASE_URL || 'http://localhost:5501/api';
const USER_ID = Number(process.env.ASSESS_USER_ID || '45');
const ASSESSMENT_CODE = process.env.ASSESSMENT_CODE || 'TECH_APT_001';

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function pickAnswer(q) {
  const kind = String(q?.metadata?.kind || 'mcq').toLowerCase();
  const opts = Array.isArray(q?.options) ? q.options : [];
  if (kind === 'msq') return opts.slice(0, 2).map((o) => String(o.id));
  if (kind === 'numerical') return String(q?.metadata?.correctAnswer ?? '1');
  return opts[0] ? String(opts[0].id) : null;
}

async function main() {
  const report = [];
  const start = await req('/assessment/aptitude/attempts', {
    method: 'POST',
    body: { assessmentCode: ASSESSMENT_CODE, userId: USER_ID, mode: 'main' },
  });
  report.push({ endpoint: 'POST /assessment/aptitude/attempts', ok: start.ok, status: start.status });
  if (!start.ok) {
    console.log(JSON.stringify({ report, error: start.data }, null, 2));
    return;
  }

  const token = start.data.attemptToken || start.data.token;
  const questions = await req(`/assessment/aptitude/attempts/${token}/questions`);
  report.push({ endpoint: 'GET /assessment/aptitude/attempts/:token/questions', ok: questions.ok, status: questions.status });
  if (!questions.ok) {
    console.log(JSON.stringify({ report, error: questions.data }, null, 2));
    return;
  }

  const answers = {};
  for (const q of questions.data.questions || []) {
    const a = pickAnswer(q);
    if (a !== null && a !== undefined && a !== '') answers[String(q.id)] = { optionId: a };
  }

  const save = await req(`/assessment/aptitude/attempts/${token}/answers`, {
    method: 'PATCH',
    body: { answers },
  });
  report.push({ endpoint: 'PATCH /assessment/aptitude/attempts/:token/answers', ok: save.ok, status: save.status });

  const submit = await req(`/assessment/aptitude/attempts/${token}/submit`, {
    method: 'POST',
    body: { answers },
  });
  report.push({ endpoint: 'POST /assessment/aptitude/attempts/:token/submit', ok: submit.ok, status: submit.status });

  const latest = await req(`/assessment/aptitude/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(USER_ID))}`);
  report.push({ endpoint: 'GET /assessment/aptitude/latest-result', ok: latest.ok, status: latest.status });

  console.log(JSON.stringify({
    baseUrl: BASE,
    userId: USER_ID,
    token,
    report,
    questionCount: (questions.data.questions || []).length,
    kindsSeen: [...new Set((questions.data.questions || []).map((q) => String(q?.metadata?.kind || 'mcq')))],
    submittedScore: submit.data?.totalScore,
    latestScore: latest.data?.totalScore,
    submittedAnswered: submit.data?.answeredCount,
    latestAnswered: latest.data?.answeredCount,
    scoreMatches: submit.data?.totalScore === latest.data?.totalScore,
    answeredMatches: submit.data?.answeredCount === latest.data?.answeredCount,
  }, null, 2));
}

main().catch((e) => {
  console.error('APTITUDE_STANDARD_ONCE_FAILED');
  console.error(e?.message || e);
  process.exit(1);
});
