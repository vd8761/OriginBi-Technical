const BASE = process.env.ASSESS_BASE_URL || 'http://localhost:5000/api';
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

async function runMncAdaptive(assessmentCode) {
  console.log(`\n======================================================`);
  console.log(`STARTING MNC ADAPTIVE ASSESSMENT TEST: ${assessmentCode}`);
  console.log(`======================================================`);

  const report = {
    module: 'mnc-adaptive',
    assessmentCode,
    endpoints: [],
    validations: {},
  };

  // 1. Start block-based attempt
  console.log(`\n[Step 1] POST /assessment/mnc/attempts/block-based`);
  const start = await call('/assessment/mnc/attempts/block-based', {
    method: 'POST',
    body: { assessmentCode, userId: USER_ID, mode: 'main' },
  });
  report.endpoints.push({ endpoint: 'POST /assessment/mnc/attempts/block-based', ...start });
  
  if (!start.ok) {
    console.error(`Failed to start block-based attempt:`, start.data);
    return report;
  }

  const token = start.data?.attemptToken;
  report.token = token;
  let currentBlock = start.data?.currentBlock;
  let blockNo = Number(start.data?.currentBlockNumber || 1);
  const allAnswers = {};
  const path = [];

  console.log(`Attempt Token: ${token}`);
  console.log(`Initial Block questions count: ${currentBlock?.questions?.length || 0}`);

  // Loop through adaptive blocks
  for (let i = 0; i < 8; i++) {
    console.log(`\n------------------------------------------------------`);
    console.log(`Processing Block #${blockNo} (Difficulty profile: ${currentBlock?.difficultyProfile || 'unknown'})`);
    console.log(`------------------------------------------------------`);

    const blockAnswers = {};
    for (const q of currentBlock?.questions || []) {
      const a = pickAnswer(q);
      if (a !== null && a !== undefined && a !== '') {
        blockAnswers[String(q.id)] = a;
        allAnswers[String(q.id)] = a;
      }
      console.log(`  Question ID ${q.id} (Category: ${q.category}, Subcategory: ${q.subcategory}, Difficulty: ${q.difficulty}): answered -> ${JSON.stringify(a)}`);
    }

    // 2. Save block answers
    console.log(`Saving Block #${blockNo} answers...`);
    const saveBlock = await call(`/assessment/mnc/attempts/${token}/blocks/${blockNo}/answers`, {
      method: 'PATCH',
      body: { answers: blockAnswers },
    });
    report.endpoints.push({ endpoint: `PATCH /assessment/mnc/attempts/${token}/blocks/${blockNo}/answers`, ...saveBlock });

    // 3. Move to next block / adapt
    console.log(`Submitting Block #${blockNo} and requesting NEXT block...`);
    const next = await call(`/assessment/mnc/attempts/${token}/blocks/${blockNo}/next`, {
      method: 'POST',
      body: { timeTaken: 120, answers: blockAnswers },
    });
    report.endpoints.push({ endpoint: `POST /assessment/mnc/attempts/${token}/blocks/${blockNo}/next`, ...next });
    
    if (!next.ok) {
      console.error(`Failed to progress to next block:`, next.data);
      break;
    }

    path.push({
      block: blockNo,
      canProceed: Boolean(next.data?.canProceed),
      nextDifficulty: next.data?.blockSummary?.nextBlockDifficulty ?? null,
      accuracyScore: next.data?.blockSummary?.accuracyScore ?? null,
    });

    console.log(`Block #${blockNo} completed. Accuracy: ${next.data?.blockSummary?.accuracyScore}, Next Difficulty: ${next.data?.blockSummary?.nextBlockDifficulty}`);

    if (!next.data?.canProceed) {
      console.log(`No more blocks to proceed. Adaptive session completed!`);
      break;
    }
    blockNo += 1;
    currentBlock = next.data?.nextBlock;
  }

  // 4. Get blocks status
  console.log(`\n[Step 3] GET /assessment/mnc/attempts/${token}/blocks/status`);
  const status = await call(`/assessment/mnc/attempts/${token}/blocks/status`);
  report.endpoints.push({ endpoint: `GET /assessment/mnc/attempts/${token}/blocks/status`, ...status });

  // 5. Finalize block-based submit
  console.log(`\n[Step 4] POST /assessment/mnc/attempts/${token}/submit-block-based`);
  const submit = await call(`/assessment/mnc/attempts/${token}/submit-block-based`, {
    method: 'POST',
    body: { answers: allAnswers },
  });
  report.endpoints.push({ endpoint: `POST /assessment/mnc/attempts/${token}/submit-block-based`, ...submit });

  // 6. Get latest result
  console.log(`\n[Step 5] GET /assessment/mnc/latest-result`);
  const latest = await call(
    `/assessment/mnc/latest-result?attemptToken=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(USER_ID))}`,
  );
  report.endpoints.push({ endpoint: 'GET /assessment/mnc/latest-result', ...latest });

  // Report validations mapping
  report.validations.path = path;
  report.validations.blocksSeen = status.data?.blocks?.length ?? 0;
  report.validations.submittedScore = submit.data?.totalScore ?? null;
  report.validations.latestScore = latest.data?.totalScore ?? null;
  report.validations.scoreMatches = submit.data?.totalScore === latest.data?.totalScore;
  report.validations.answered = submit.data?.answeredCount ?? null;
  report.validations.totalQuestions = submit.data?.totalQuestions ?? null;

  console.log(`\n======================================================`);
  console.log(`MNC ADAPTIVE TEST RESULTS SUMMARY`);
  console.log(`======================================================`);
  console.log(`Blocks Seen: ${report.validations.blocksSeen}`);
  console.log(`Path: ${JSON.stringify(report.validations.path, null, 2)}`);
  console.log(`Submitted Score: ${report.validations.submittedScore}`);
  console.log(`Latest Score: ${report.validations.latestScore}`);
  console.log(`Score Matches: ${report.validations.scoreMatches}`);
  console.log(`Answered Questions: ${report.validations.answered} / ${report.validations.totalQuestions}`);
  console.log(`======================================================\n`);

  return report;
}

async function main() {
  const assessments = await call('/assessment/admin/assessments');
  if (!assessments.ok) {
    throw new Error(`Failed to load assessments: ${assessments.status}`);
  }
  const byModule = new Map((assessments.data?.data || []).map((a) => [a.module_type, a]));
  const mncCode = byModule.get('mnc')?.assessment_code || 'TECH_MNC_001';

  // Ensure MNC assessment is configured for adaptive block delivery
  // Usually this corresponds to the "adaptive_enabled" column or auto-blueprint
  console.log(`Found MNC Assessment Code: ${mncCode}`);
  
  const mncAdaptiveReport = await runMncAdaptive(mncCode);
  console.log(JSON.stringify(mncAdaptiveReport, null, 2));
}

main().catch((err) => {
  console.error('MNC_ADAPTIVE_TEST_FAILED');
  console.error(err?.message || err);
  process.exit(1);
});
