"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitCode = exports.getQuestionById = exports.getQuestions = exports.submitAptitudeAttempt = exports.getAptitudeAttempt = exports.startAptitudeAttempt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../config/db"));
const codeExecutionService_1 = require("../services/codeExecutionService");
const moduleConfig = {
    aptitude: {
        questionTable: "tech_aptitude_questions",
        idColumn: "aptitude_question_id",
        optionsTable: "tech_aptitude_options",
        optionsFk: "aptitude_question_id",
    },
    grammar: {
        questionTable: "tech_grammar_questions",
        idColumn: "grammar_question_id",
        optionsTable: "tech_grammar_options",
        optionsFk: "grammar_question_id",
    },
    coding: {
        questionTable: "tech_coding_questions",
        idColumn: "coding_question_id",
    },
    mnc: {
        questionTable: "tech_mnc_questions",
        idColumn: "mnc_question_id",
        optionsTable: "tech_mnc_options",
        optionsFk: "mnc_question_id",
    },
    role: {
        questionTable: "tech_role_questions",
        idColumn: "role_question_id",
        optionsTable: "tech_role_options",
        optionsFk: "role_question_id",
    },
};
const resolveModule = (req) => {
    const module = String(req.params.module || req.query.module || "coding").toLowerCase();
    return (module in moduleConfig ? module : null);
};
const toTitleCase = (value) => {
    if (!value)
        return "Easy";
    return value.charAt(0).toUpperCase() + value.slice(1);
};
const buildCodingPrompt = (row) => {
    const parts = [row.problem_statement];
    if (row.input_format) {
        parts.push(`Input Format:\n${row.input_format}`);
    }
    if (row.output_format) {
        parts.push(`Output Format:\n${row.output_format}`);
    }
    if (row.constraints) {
        parts.push(`Constraints:\n${row.constraints}`);
    }
    return parts.filter(Boolean).join("\n\n");
};
const parseTimeMs = (value) => {
    if (!value)
        return null;
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (!match)
        return null;
    const numeric = Number(match[1]);
    if (Number.isNaN(numeric))
        return null;
    return value.toLowerCase().includes("s") && !value.toLowerCase().includes("ms")
        ? Math.round(numeric * 1000)
        : Math.round(numeric);
};
const parseMemoryKb = (value) => {
    if (!value)
        return null;
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (!match)
        return null;
    const numeric = Number(match[1]);
    if (Number.isNaN(numeric))
        return null;
    const lower = value.toLowerCase();
    if (lower.includes("gb"))
        return Math.round(numeric * 1024 * 1024);
    if (lower.includes("mb"))
        return Math.round(numeric * 1024);
    if (lower.includes("kb"))
        return Math.round(numeric);
    return Math.round(numeric);
};
const sectionLabelMap = {
    QA: "Quantitative Aptitude",
    LR: "Logical Reasoning",
    DI: "Data Interpretation",
    AR: "Abstract Reasoning",
};
const hashSeed = (seed) => {
    const hash = crypto_1.default.createHash("sha256").update(seed).digest();
    return hash.readUInt32LE(0);
};
const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
};
const shuffleWithSeed = (items, seed) => {
    const rng = mulberry32(hashSeed(seed));
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
const resolveUserId = async (client, userId) => {
    const parsed = userId !== undefined && userId !== null ? Number(userId) : NaN;
    if (Number.isFinite(parsed)) {
        return parsed;
    }
    const { rows } = await client.query("SELECT id FROM users ORDER BY id LIMIT 1");
    return rows[0]?.id ?? null;
};
const normalizeAnswerPairs = (answers) => {
    if (Array.isArray(answers)) {
        return answers
            .map((entry) => ({
            attemptQuestionId: Number(entry?.attemptQuestionId),
            optionId: Number(entry?.optionId),
        }))
            .filter((entry) => Number.isFinite(entry.attemptQuestionId) && Number.isFinite(entry.optionId));
    }
    if (answers && typeof answers === "object") {
        return Object.entries(answers)
            .map(([attemptQuestionId, optionId]) => ({
            attemptQuestionId: Number(attemptQuestionId),
            optionId: Number(optionId),
        }))
            .filter((entry) => Number.isFinite(entry.attemptQuestionId) && Number.isFinite(entry.optionId));
    }
    return [];
};
// @desc    Start aptitude attempt (creates frozen order)
// @route   POST /api/assessment/aptitude/attempts
const startAptitudeAttempt = async (req, res) => {
    const { assessmentId, assessmentCode, userId } = req.body || {};
    if (!assessmentId && !assessmentCode) {
        res.status(400).json({ message: "assessmentId or assessmentCode is required" });
        return;
    }
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const assessmentQuery = assessmentId
            ? "SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = 'aptitude'"
            : "SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = 'aptitude'";
        const assessmentResult = await client.query(assessmentQuery, [assessmentId || assessmentCode]);
        const assessment = assessmentResult.rows[0];
        if (!assessment) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Aptitude assessment not found" });
            return;
        }
        const resolvedUserId = await resolveUserId(client, userId);
        if (!resolvedUserId) {
            await client.query("ROLLBACK");
            res.status(400).json({ message: "No users found. Provide userId." });
            return;
        }
        const now = new Date();
        const durationMinutes = Number(assessment.total_time_minutes || 60);
        const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
        const attemptToken = crypto_1.default.randomUUID();
        const shuffleSeed = crypto_1.default.randomBytes(8).toString("hex");
        const attemptInsert = await client.query(`INSERT INTO tech_aptitude_attempts
                (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW())
             RETURNING aptitude_attempt_id`, [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt]);
        const attemptId = attemptInsert.rows[0].aptitude_attempt_id;
        const questionResult = await client.query(`SELECT aptitude_question_id, subcategory, question_text, image_url
             FROM tech_aptitude_questions
             WHERE assessment_id = $1 AND status = 'active'
             ORDER BY aptitude_question_id`, [assessment.assessment_id]);
        const questionIds = questionResult.rows.map((row) => row.aptitude_question_id);
        if (questionIds.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "No aptitude questions found" });
            return;
        }
        const optionResult = await client.query(`SELECT option_id, aptitude_question_id, option_text
             FROM tech_aptitude_options
             WHERE aptitude_question_id = ANY($1)
             ORDER BY option_id`, [questionIds]);
        const optionsByQuestion = new Map();
        for (const row of optionResult.rows) {
            const list = optionsByQuestion.get(row.aptitude_question_id) || [];
            list.push({ id: Number(row.option_id), text: row.option_text });
            optionsByQuestion.set(row.aptitude_question_id, list);
        }
        const orderedQuestions = assessment.shuffle_questions
            ? shuffleWithSeed(questionResult.rows, shuffleSeed)
            : questionResult.rows;
        const responseQuestions = [];
        for (let index = 0; index < orderedQuestions.length; index += 1) {
            const question = orderedQuestions[index];
            const attemptQuestionInsert = await client.query(`INSERT INTO tech_aptitude_attempt_questions
                    (aptitude_attempt_id, aptitude_question_id, display_order, is_locked)
                 VALUES ($1, $2, $3, FALSE)
                 RETURNING attempt_question_id`, [attemptId, question.aptitude_question_id, index + 1]);
            const attemptQuestionId = attemptQuestionInsert.rows[0].attempt_question_id;
            const baseOptions = optionsByQuestion.get(question.aptitude_question_id) || [];
            const orderedOptions = assessment.shuffle_options
                ? shuffleWithSeed(baseOptions, `${shuffleSeed}:${question.aptitude_question_id}`)
                : baseOptions;
            for (let optIndex = 0; optIndex < orderedOptions.length; optIndex += 1) {
                const option = orderedOptions[optIndex];
                await client.query(`INSERT INTO tech_aptitude_attempt_question_options
                        (attempt_question_id, option_id, display_order)
                     VALUES ($1, $2, $3)`, [attemptQuestionId, option.id, optIndex + 1]);
            }
            responseQuestions.push({
                id: String(attemptQuestionId),
                category: question.subcategory,
                text: question.question_text,
                imageUrl: question.image_url,
                options: orderedOptions.map((opt) => ({ id: String(opt.id), text: opt.text })),
            });
        }
        await client.query("COMMIT");
        res.json({
            attemptToken,
            attemptId,
            assessmentId: assessment.assessment_id,
            durationSeconds: durationMinutes * 60,
            questions: responseQuestions,
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.startAptitudeAttempt = startAptitudeAttempt;
// @desc    Get aptitude attempt questions (frozen order)
// @route   GET /api/assessment/aptitude/attempts/:token
const getAptitudeAttempt = async (req, res) => {
    const token = req.params.token;
    if (!token) {
        res.status(400).json({ message: "Attempt token is required" });
        return;
    }
    try {
        const attemptResult = await db_1.default.query(`SELECT a.aptitude_attempt_id, a.assessment_id, a.started_at, a.expires_at,
                    t.total_time_minutes
             FROM tech_aptitude_attempts a
             JOIN tech_assessments t ON t.assessment_id = a.assessment_id
             WHERE a.attempt_token = $1`, [token]);
        const attempt = attemptResult.rows[0];
        if (!attempt) {
            res.status(404).json({ message: "Attempt not found" });
            return;
        }
        const questionResult = await db_1.default.query(`SELECT aq.attempt_question_id, aq.display_order, q.subcategory, q.question_text, q.image_url
             FROM tech_aptitude_attempt_questions aq
             JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
             WHERE aq.aptitude_attempt_id = $1
             ORDER BY aq.display_order`, [attempt.aptitude_attempt_id]);
        const optionResult = await db_1.default.query(`SELECT aqo.attempt_question_id, aqo.display_order, o.option_id, o.option_text
             FROM tech_aptitude_attempt_question_options aqo
             JOIN tech_aptitude_options o ON o.option_id = aqo.option_id
             WHERE aqo.attempt_question_id = ANY($1)
             ORDER BY aqo.attempt_question_id, aqo.display_order`, [questionResult.rows.map((row) => row.attempt_question_id)]);
        const optionsByAttemptQuestion = new Map();
        for (const row of optionResult.rows) {
            const list = optionsByAttemptQuestion.get(row.attempt_question_id) || [];
            list.push({ id: String(row.option_id), text: row.option_text });
            optionsByAttemptQuestion.set(row.attempt_question_id, list);
        }
        const questions = questionResult.rows.map((row) => ({
            id: String(row.attempt_question_id),
            category: row.subcategory,
            text: row.question_text,
            imageUrl: row.image_url,
            options: optionsByAttemptQuestion.get(row.attempt_question_id) || [],
        }));
        const now = Date.now();
        const expiresAt = new Date(attempt.expires_at).getTime();
        const timeLeftSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
        res.json({
            attemptToken: token,
            attemptId: attempt.aptitude_attempt_id,
            assessmentId: attempt.assessment_id,
            durationSeconds: Number(attempt.total_time_minutes || 60) * 60,
            timeLeftSeconds,
            questions,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getAptitudeAttempt = getAptitudeAttempt;
// @desc    Submit aptitude attempt and score
// @route   POST /api/assessment/aptitude/attempts/:token/submit
const submitAptitudeAttempt = async (req, res) => {
    const token = req.params.token;
    const answerPairs = normalizeAnswerPairs(req.body?.answers ?? req.body?.answerMap);
    if (!token) {
        res.status(400).json({ message: "Attempt token is required" });
        return;
    }
    if (answerPairs.length === 0) {
        res.status(400).json({ message: "No answers provided" });
        return;
    }
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const attemptResult = await client.query(`SELECT a.aptitude_attempt_id, a.assessment_id, a.started_at, t.negative_mark_enabled
             FROM tech_aptitude_attempts a
             JOIN tech_assessments t ON t.assessment_id = a.assessment_id
             WHERE a.attempt_token = $1`, [token]);
        const attempt = attemptResult.rows[0];
        if (!attempt) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Attempt not found" });
            return;
        }
        const questionResult = await client.query(`SELECT aq.attempt_question_id, q.correct_option_id, q.marks, q.negative_marks, q.subcategory
             FROM tech_aptitude_attempt_questions aq
             JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
             WHERE aq.aptitude_attempt_id = $1`, [attempt.aptitude_attempt_id]);
        const questionMap = new Map();
        for (const row of questionResult.rows) {
            questionMap.set(Number(row.attempt_question_id), row);
        }
        let correctCount = 0;
        let answeredCount = 0;
        let totalScore = 0;
        let positiveScore = 0;
        let negativeScore = 0;
        const sectionStats = {};
        for (const answer of answerPairs) {
            const row = questionMap.get(answer.attemptQuestionId);
            if (!row) {
                continue;
            }
            answeredCount += 1;
            const isCorrect = Number(row.correct_option_id) === answer.optionId;
            const scoreAwarded = isCorrect ? Number(row.marks) : 0;
            const negativeApplied = !isCorrect && attempt.negative_mark_enabled
                ? Number(row.negative_marks || 0)
                : 0;
            totalScore += scoreAwarded - negativeApplied;
            positiveScore += scoreAwarded;
            negativeScore += negativeApplied;
            if (isCorrect) {
                correctCount += 1;
            }
            const sectionKey = row.subcategory || "General";
            if (!sectionStats[sectionKey]) {
                sectionStats[sectionKey] = { correct: 0, total: 0 };
            }
            sectionStats[sectionKey].total += 1;
            if (isCorrect) {
                sectionStats[sectionKey].correct += 1;
            }
            await client.query(`UPDATE tech_aptitude_attempt_questions
                 SET selected_option_id = $1,
                     is_correct = $2,
                     score_awarded = $3,
                     negative_applied = $4,
                     answered_at = NOW(),
                     is_locked = TRUE
                 WHERE attempt_question_id = $5
                   AND aptitude_attempt_id = $6`, [
                answer.optionId,
                isCorrect,
                scoreAwarded,
                negativeApplied,
                answer.attemptQuestionId,
                attempt.aptitude_attempt_id,
            ]);
        }
        await client.query(`UPDATE tech_aptitude_attempt_questions
             SET is_locked = TRUE
             WHERE aptitude_attempt_id = $1`, [attempt.aptitude_attempt_id]);
        const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000));
        await client.query(`UPDATE tech_aptitude_attempts
             SET status = 'submitted',
                 submitted_at = NOW(),
                 total_score = $2,
                 positive_score = $3,
                 negative_score = $4,
                 time_taken_seconds = $5,
                 updated_at = NOW()
             WHERE aptitude_attempt_id = $1`, [attempt.aptitude_attempt_id, totalScore, positiveScore, negativeScore, timeTakenSeconds]);
        const totalQuestions = questionResult.rows.length || 1;
        const overallScore = Math.round((correctCount / totalQuestions) * 100);
        const accuracy = Math.round((correctCount / Math.max(1, answeredCount)) * 100);
        const sections = Object.entries(sectionStats).map(([key, stats]) => ({
            name: sectionLabelMap[key] || key,
            score: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
            weight: "25%",
        }));
        await client.query("COMMIT");
        res.json({
            attemptId: attempt.aptitude_attempt_id,
            assessmentId: attempt.assessment_id,
            totalScore,
            overallScore,
            accuracy,
            timeTakenSeconds,
            sections,
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.submitAptitudeAttempt = submitAptitudeAttempt;
// @desc    Get all questions
// @route   GET /api/assessment/questions?module=coding
const getQuestions = async (req, res) => {
    const module = resolveModule(req);
    if (!module) {
        res.status(400).json({ message: "Invalid module" });
        return;
    }
    const assessmentId = req.query.assessmentId ? Number(req.query.assessmentId) : null;
    const config = moduleConfig[module];
    try {
        if (module === "coding") {
            const { rows } = await db_1.default.query(`SELECT coding_question_id, assessment_id, difficulty, problem_title, problem_statement,
                        input_format, output_format, constraints, starter_code, starter_code_json,
                        starter_files_json, entry_file_json, limits_json, sample_io_json,
                        hidden_testcases_ref, allowed_languages_json, marks, negative_marks, status
                 FROM tech_coding_questions
                 WHERE ($1::BIGINT IS NULL OR assessment_id = $1)
                   AND status = 'active'
                 ORDER BY coding_question_id`, [assessmentId]);
            const questions = rows.map((row) => ({
                id: Number(row.coding_question_id),
                type: "code-pretext",
                difficulty: toTitleCase(row.difficulty),
                marks: Number(row.marks),
                section: "Coding",
                title: row.problem_title,
                prompt: buildCodingPrompt(row),
                starterCode: row.starter_code_json || (row.starter_code ? { python: row.starter_code } : undefined),
                starterFiles: row.starter_files_json || undefined,
                entryFile: row.entry_file_json || undefined,
                testCases: Array.isArray(row.sample_io_json) ? row.sample_io_json : undefined,
                limits: row.limits_json || undefined,
                allowedLanguages: row.allowed_languages_json || undefined,
            }));
            res.json(questions);
            return;
        }
        const { rows } = await db_1.default.query(`SELECT q.*, COALESCE(
                        json_agg(o ORDER BY o.option_id) FILTER (WHERE o.option_id IS NOT NULL),
                        '[]'::json
                    ) AS options
             FROM ${config.questionTable} q
             LEFT JOIN ${config.optionsTable} o
                ON o.${config.optionsFk} = q.${config.idColumn}
             WHERE ($1::BIGINT IS NULL OR q.assessment_id = $1)
             GROUP BY q.${config.idColumn}
             ORDER BY q.${config.idColumn}`, [assessmentId]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getQuestions = getQuestions;
// @desc    Get single question
// @route   GET /api/assessment/questions/:id?module=coding
const getQuestionById = async (req, res) => {
    const module = resolveModule(req);
    if (!module) {
        res.status(400).json({ message: "Invalid module" });
        return;
    }
    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId)) {
        res.status(400).json({ message: "Invalid question id" });
        return;
    }
    const config = moduleConfig[module];
    try {
        if (module === "coding") {
            const { rows } = await db_1.default.query(`SELECT coding_question_id, assessment_id, difficulty, problem_title, problem_statement,
                        input_format, output_format, constraints, starter_code, starter_code_json,
                        starter_files_json, entry_file_json, limits_json, sample_io_json,
                        hidden_testcases_ref, allowed_languages_json, marks, negative_marks, status
                 FROM tech_coding_questions
                 WHERE coding_question_id = $1`, [questionId]);
            const row = rows[0];
            if (!row) {
                res.status(404).json({ message: "Question not found" });
                return;
            }
            res.json({
                id: Number(row.coding_question_id),
                type: "code-pretext",
                difficulty: toTitleCase(row.difficulty),
                marks: Number(row.marks),
                section: "Coding",
                title: row.problem_title,
                prompt: buildCodingPrompt(row),
                starterCode: row.starter_code_json || (row.starter_code ? { python: row.starter_code } : undefined),
                starterFiles: row.starter_files_json || undefined,
                entryFile: row.entry_file_json || undefined,
                testCases: Array.isArray(row.sample_io_json) ? row.sample_io_json : undefined,
                limits: row.limits_json || undefined,
                allowedLanguages: row.allowed_languages_json || undefined,
            });
            return;
        }
        const { rows } = await db_1.default.query(`SELECT q.*, COALESCE(
                        json_agg(o ORDER BY o.option_id) FILTER (WHERE o.option_id IS NOT NULL),
                        '[]'::json
                    ) AS options
             FROM ${config.questionTable} q
             LEFT JOIN ${config.optionsTable} o
                ON o.${config.optionsFk} = q.${config.idColumn}
             WHERE q.${config.idColumn} = $1
             GROUP BY q.${config.idColumn}`, [questionId]);
        const row = rows[0];
        if (!row) {
            res.status(404).json({ message: "Question not found" });
            return;
        }
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getQuestionById = getQuestionById;
// @desc    Submit code for execution
// @route   POST /api/assessment/submit?module=coding
const submitCode = async (req, res) => {
    const module = resolveModule(req);
    if (!module || module !== "coding") {
        res.status(400).json({ message: "Submission is only supported for coding." });
        return;
    }
    const { userId, assessmentId, questionId, code, language, testCases } = req.body;
    if (!userId || !assessmentId || !questionId || !code || !language) {
        res.status(400).json({ message: "userId, assessmentId, questionId, code, and language are required" });
        return;
    }
    const parsedUserId = Number(userId);
    const parsedAssessmentId = Number(assessmentId);
    const parsedQuestionId = Number(questionId);
    if (!Number.isFinite(parsedUserId) || !Number.isFinite(parsedAssessmentId) || !Number.isFinite(parsedQuestionId)) {
        res.status(400).json({ message: "userId, assessmentId, and questionId must be numbers" });
        return;
    }
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const assessmentResult = await client.query("SELECT total_time_minutes, negative_mark_enabled FROM tech_assessments WHERE assessment_id = $1", [parsedAssessmentId]);
        const assessment = assessmentResult.rows[0];
        if (!assessment) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Assessment not found" });
            return;
        }
        const questionResult = await client.query("SELECT marks, negative_marks FROM tech_coding_questions WHERE coding_question_id = $1", [parsedQuestionId]);
        const question = questionResult.rows[0];
        if (!question) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Question not found" });
            return;
        }
        const now = new Date();
        const durationMinutes = Number(assessment.total_time_minutes || 60);
        const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
        const attemptToken = crypto_1.default.randomUUID();
        const attemptInsert = await client.query(`INSERT INTO tech_coding_attempts
                (assessment_id, user_id, attempt_token, status, started_at, expires_at, created_at, updated_at)
             VALUES ($1, $2, $3, 'in_progress', $4, $5, NOW(), NOW())
             RETURNING coding_attempt_id`, [parsedAssessmentId, parsedUserId, attemptToken, now, expiresAt]);
        const codingAttemptId = attemptInsert.rows[0].coding_attempt_id;
        const result = await (0, codeExecutionService_1.executeCode)(code, language, testCases);
        const compileStatus = result.type === "compile-error" ? "compile_error" : "success";
        const runStatus = compileStatus === "compile_error"
            ? "not_run"
            : result.type === "success"
                ? "passed"
                : result.type === "partial"
                    ? "partial"
                    : "failed";
        const isCorrect = runStatus === "passed";
        const scoreAwarded = isCorrect ? Number(question.marks) : 0;
        const negativeApplied = !isCorrect && assessment.negative_mark_enabled
            ? Number(question.negative_marks || 0)
            : 0;
        const executionTimeMs = parseTimeMs(result.time || null);
        const memoryUsedKb = parseMemoryKb(result.memory || null);
        const attemptQuestionInsert = await client.query(`INSERT INTO tech_coding_attempt_questions
                (coding_attempt_id, coding_question_id, display_order, language, submitted_code,
                 compile_status, run_status, judge_result_json, is_correct, score_awarded,
                 negative_applied, execution_time_ms, memory_used_kb, submitted_at, is_locked)
             VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), TRUE)
             RETURNING attempt_question_id`, [
            codingAttemptId,
            parsedQuestionId,
            language,
            code,
            compileStatus,
            runStatus,
            result.testResults || null,
            isCorrect,
            scoreAwarded,
            negativeApplied,
            executionTimeMs,
            memoryUsedKb,
        ]);
        const totalScore = scoreAwarded - negativeApplied;
        await client.query(`UPDATE tech_coding_attempts
             SET status = 'submitted', submitted_at = NOW(), total_score = $2,
                 positive_score = $3, negative_score = $4, updated_at = NOW()
             WHERE coding_attempt_id = $1`, [codingAttemptId, totalScore, scoreAwarded, negativeApplied]);
        await client.query("COMMIT");
        res.json({
            ...result,
            attemptId: codingAttemptId,
            attemptQuestionId: attemptQuestionInsert.rows[0].attempt_question_id,
            totalScore,
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.submitCode = submitCode;
