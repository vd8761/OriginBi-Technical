"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssessments = exports.bulkImportAptitudeQuestions = exports.deleteAptitudeQuestion = exports.updateAptitudeQuestion = exports.createAptitudeQuestion = exports.getAptitudeQuestion = exports.listAptitudeQuestions = void 0;
const db_1 = __importDefault(require("../config/db"));
// ─── Helpers ───────────────────────────────────────────────────────────────────
const DEFAULT_ASSESSMENT_CODE = "APTITUDE_DEFAULT";
const DEFAULT_ASSESSMENT_NAME = "Default Aptitude Assessment";
/**
 * Ensures a default aptitude assessment exists. Returns its assessment_id.
 * Uses ON CONFLICT to be idempotent.
 */
const ensureDefaultAssessment = async (client, createdById) => {
    const { rows } = await client.query(`INSERT INTO tech_assessments
            (assessment_code, assessment_name, module_type, total_time_minutes,
             total_questions, shuffle_questions, shuffle_options,
             negative_mark_enabled, negative_mark_value, status, created_by)
         VALUES ($1, $2, 'aptitude', 60, 0, TRUE, TRUE, FALSE, NULL, 'active', $3)
         ON CONFLICT (assessment_code) DO UPDATE SET updated_at = NOW()
         RETURNING assessment_id`, [DEFAULT_ASSESSMENT_CODE, DEFAULT_ASSESSMENT_NAME, createdById]);
    return Number(rows[0].assessment_id);
};
/**
 * Resolves a valid user ID — uses provided or falls back to first user.
 */
const resolveUserId = async (client, userId) => {
    if (userId && Number.isFinite(userId))
        return userId;
    const { rows } = await client.query("SELECT id FROM users ORDER BY id LIMIT 1");
    return rows[0]?.id ?? null;
};
/**
 * Formats a DB row + options into the API response shape.
 */
const formatQuestionResponse = (row, options) => ({
    aptitudeQuestionId: Number(row.aptitude_question_id),
    assessmentId: Number(row.assessment_id),
    subcategory: row.subcategory,
    difficulty: row.difficulty,
    questionText: row.question_text,
    options: options.map((o) => ({
        optionId: Number(o.option_id),
        optionText: o.option_text,
    })),
    correctOptionId: row.correct_option_id ? Number(row.correct_option_id) : null,
    explanation: row.explanation,
    marks: Number(row.marks),
    negativeMarks: Number(row.negative_marks),
    status: row.status,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
// ─── LIST ──────────────────────────────────────────────────────────────────────
/** GET /api/assessment/admin/aptitude/questions */
const listAptitudeQuestions = async (req, res) => {
    const assessmentId = req.query.assessmentId ? Number(req.query.assessmentId) : null;
    const subcategory = req.query.subcategory ? String(req.query.subcategory) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const search = req.query.search ? String(req.query.search).toLowerCase() : null;
    try {
        const conditions = [];
        const params = [];
        let paramIdx = 1;
        if (assessmentId) {
            conditions.push(`q.assessment_id = $${paramIdx++}`);
            params.push(assessmentId);
        }
        if (subcategory) {
            conditions.push(`q.subcategory = $${paramIdx++}`);
            params.push(subcategory);
        }
        if (status) {
            conditions.push(`q.status = $${paramIdx++}`);
            params.push(status);
        }
        if (search) {
            conditions.push(`LOWER(q.question_text) LIKE $${paramIdx++}`);
            params.push(`%${search}%`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const { rows } = await db_1.default.query(`SELECT q.*,
                    COALESCE(
                        json_agg(
                            json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                            ORDER BY o.option_id
                        ) FILTER (WHERE o.option_id IS NOT NULL),
                        '[]'::json
                    ) AS options
             FROM tech_aptitude_questions q
             LEFT JOIN tech_aptitude_options o ON o.aptitude_question_id = q.aptitude_question_id
             ${whereClause}
             GROUP BY q.aptitude_question_id
             ORDER BY q.aptitude_question_id DESC`, params);
        const questions = rows.map((row) => formatQuestionResponse(row, row.options));
        res.json({ data: questions, total: questions.length });
    }
    catch (error) {
        console.error("listAptitudeQuestions error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.listAptitudeQuestions = listAptitudeQuestions;
// ─── GET BY ID ─────────────────────────────────────────────────────────────────
/** GET /api/assessment/admin/aptitude/questions/:id */
const getAptitudeQuestion = async (req, res) => {
    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId)) {
        res.status(400).json({ message: "Invalid question ID" });
        return;
    }
    try {
        const { rows } = await db_1.default.query(`SELECT q.*,
                    COALESCE(
                        json_agg(
                            json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                            ORDER BY o.option_id
                        ) FILTER (WHERE o.option_id IS NOT NULL),
                        '[]'::json
                    ) AS options
             FROM tech_aptitude_questions q
             LEFT JOIN tech_aptitude_options o ON o.aptitude_question_id = q.aptitude_question_id
             WHERE q.aptitude_question_id = $1
             GROUP BY q.aptitude_question_id`, [questionId]);
        if (rows.length === 0) {
            res.status(404).json({ message: "Question not found" });
            return;
        }
        res.json({ data: formatQuestionResponse(rows[0], rows[0].options) });
    }
    catch (error) {
        console.error("getAptitudeQuestion error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getAptitudeQuestion = getAptitudeQuestion;
// ─── CREATE ────────────────────────────────────────────────────────────────────
/** POST /api/assessment/admin/aptitude/questions */
const createAptitudeQuestion = async (req, res) => {
    const { assessmentId: reqAssessmentId, subcategory, difficulty = "medium", questionText, options, correctOptionIndex = 0, explanation, marks = 1, negativeMarks = 0, status = "active", imageUrl = null, userId, } = req.body;
    // Validation
    if (!subcategory || !questionText) {
        res.status(400).json({ message: "subcategory and questionText are required" });
        return;
    }
    if (!Array.isArray(options) || options.length < 2) {
        res.status(400).json({ message: "At least 2 options are required" });
        return;
    }
    if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
        res.status(400).json({ message: "correctOptionIndex is out of range" });
        return;
    }
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        // Resolve assessment
        let assessmentId = reqAssessmentId ? Number(reqAssessmentId) : null;
        if (!assessmentId) {
            const resolvedUser = await resolveUserId(client, userId);
            if (!resolvedUser) {
                await client.query("ROLLBACK");
                res.status(400).json({ message: "No users found. Provide userId." });
                return;
            }
            assessmentId = await ensureDefaultAssessment(client, resolvedUser);
        }
        // 1. Insert question with correct_option_id = NULL (circular FK)
        const qInsert = await client.query(`INSERT INTO tech_aptitude_questions
                (assessment_id, subcategory, difficulty, question_text, image_url,
                 correct_option_id, marks, negative_marks, explanation, status)
             VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9)
             RETURNING *`, [assessmentId, subcategory, difficulty, questionText, imageUrl,
            marks, negativeMarks, explanation || null, status]);
        const questionRow = qInsert.rows[0];
        const questionId = questionRow.aptitude_question_id;
        // 2. Insert options
        const insertedOptions = [];
        for (const opt of options) {
            const optInsert = await client.query(`INSERT INTO tech_aptitude_options (aptitude_question_id, option_text)
                 VALUES ($1, $2) RETURNING *`, [questionId, opt.text]);
            insertedOptions.push(optInsert.rows[0]);
        }
        // 3. Set correct_option_id
        const correctOptionId = insertedOptions[correctOptionIndex].option_id;
        await client.query(`UPDATE tech_aptitude_questions SET correct_option_id = $1 WHERE aptitude_question_id = $2`, [correctOptionId, questionId]);
        // 4. Update assessment question count
        await client.query(`UPDATE tech_assessments
             SET total_questions = (
                 SELECT COUNT(*) FROM tech_aptitude_questions WHERE assessment_id = $1
             ), updated_at = NOW()
             WHERE assessment_id = $1`, [assessmentId]);
        await client.query("COMMIT");
        questionRow.correct_option_id = correctOptionId;
        res.status(201).json({
            message: "Question created",
            data: formatQuestionResponse(questionRow, insertedOptions),
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("createAptitudeQuestion error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.createAptitudeQuestion = createAptitudeQuestion;
// ─── UPDATE ────────────────────────────────────────────────────────────────────
/** PUT /api/assessment/admin/aptitude/questions/:id */
const updateAptitudeQuestion = async (req, res) => {
    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId)) {
        res.status(400).json({ message: "Invalid question ID" });
        return;
    }
    const { subcategory, difficulty, questionText, options, correctOptionIndex, explanation, marks, negativeMarks, status, imageUrl, } = req.body;
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        // Check question exists
        const existing = await client.query("SELECT * FROM tech_aptitude_questions WHERE aptitude_question_id = $1", [questionId]);
        if (existing.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Question not found" });
            return;
        }
        // 1. Null out correct_option_id to break circular FK before deleting options
        await client.query("UPDATE tech_aptitude_questions SET correct_option_id = NULL WHERE aptitude_question_id = $1", [questionId]);
        // 2. Build dynamic UPDATE for question fields
        const updates = [];
        const updateParams = [];
        let pIdx = 1;
        if (subcategory !== undefined) {
            updates.push(`subcategory = $${pIdx++}`);
            updateParams.push(subcategory);
        }
        if (difficulty !== undefined) {
            updates.push(`difficulty = $${pIdx++}`);
            updateParams.push(difficulty);
        }
        if (questionText !== undefined) {
            updates.push(`question_text = $${pIdx++}`);
            updateParams.push(questionText);
        }
        if (explanation !== undefined) {
            updates.push(`explanation = $${pIdx++}`);
            updateParams.push(explanation || null);
        }
        if (marks !== undefined) {
            updates.push(`marks = $${pIdx++}`);
            updateParams.push(marks);
        }
        if (negativeMarks !== undefined) {
            updates.push(`negative_marks = $${pIdx++}`);
            updateParams.push(negativeMarks);
        }
        if (status !== undefined) {
            updates.push(`status = $${pIdx++}`);
            updateParams.push(status);
        }
        if (imageUrl !== undefined) {
            updates.push(`image_url = $${pIdx++}`);
            updateParams.push(imageUrl);
        }
        updates.push("updated_at = NOW()");
        if (updates.length > 1) {
            updateParams.push(questionId);
            await client.query(`UPDATE tech_aptitude_questions SET ${updates.join(", ")} WHERE aptitude_question_id = $${pIdx}`, updateParams);
        }
        // 3. Replace options if provided
        let insertedOptions = [];
        if (Array.isArray(options) && options.length >= 2) {
            await client.query("DELETE FROM tech_aptitude_options WHERE aptitude_question_id = $1", [questionId]);
            for (const opt of options) {
                const optInsert = await client.query(`INSERT INTO tech_aptitude_options (aptitude_question_id, option_text)
                     VALUES ($1, $2) RETURNING *`, [questionId, opt.text]);
                insertedOptions.push(optInsert.rows[0]);
            }
            // Set correct option
            const cIdx = typeof correctOptionIndex === "number" ? correctOptionIndex : 0;
            const safeIdx = Math.min(Math.max(0, cIdx), insertedOptions.length - 1);
            const correctOptId = insertedOptions[safeIdx].option_id;
            await client.query("UPDATE tech_aptitude_questions SET correct_option_id = $1 WHERE aptitude_question_id = $2", [correctOptId, questionId]);
        }
        await client.query("COMMIT");
        // Fetch updated question
        const { rows } = await client.query(`SELECT q.*,
                    COALESCE(
                        json_agg(
                            json_build_object('option_id', o.option_id, 'option_text', o.option_text)
                            ORDER BY o.option_id
                        ) FILTER (WHERE o.option_id IS NOT NULL),
                        '[]'::json
                    ) AS options
             FROM tech_aptitude_questions q
             LEFT JOIN tech_aptitude_options o ON o.aptitude_question_id = q.aptitude_question_id
             WHERE q.aptitude_question_id = $1
             GROUP BY q.aptitude_question_id`, [questionId]);
        res.json({
            message: "Question updated",
            data: formatQuestionResponse(rows[0], rows[0].options),
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("updateAptitudeQuestion error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.updateAptitudeQuestion = updateAptitudeQuestion;
// ─── DELETE ────────────────────────────────────────────────────────────────────
/** DELETE /api/assessment/admin/aptitude/questions/:id */
const deleteAptitudeQuestion = async (req, res) => {
    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId)) {
        res.status(400).json({ message: "Invalid question ID" });
        return;
    }
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT assessment_id FROM tech_aptitude_questions WHERE aptitude_question_id = $1", [questionId]);
        if (existing.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Question not found" });
            return;
        }
        const assessmentId = existing.rows[0].assessment_id;
        // 1. Null out correct_option_id to break circular FK
        await client.query("UPDATE tech_aptitude_questions SET correct_option_id = NULL WHERE aptitude_question_id = $1", [questionId]);
        // 2. Delete question (options cascade)
        await client.query("DELETE FROM tech_aptitude_questions WHERE aptitude_question_id = $1", [questionId]);
        // 3. Update assessment question count
        await client.query(`UPDATE tech_assessments
             SET total_questions = (
                 SELECT COUNT(*) FROM tech_aptitude_questions WHERE assessment_id = $1
             ), updated_at = NOW()
             WHERE assessment_id = $1`, [assessmentId]);
        await client.query("COMMIT");
        res.json({ message: "Question deleted" });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("deleteAptitudeQuestion error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.deleteAptitudeQuestion = deleteAptitudeQuestion;
// ─── BULK IMPORT ───────────────────────────────────────────────────────────────
/** POST /api/assessment/admin/aptitude/questions/bulk */
const bulkImportAptitudeQuestions = async (req, res) => {
    const { questions: questionList, assessmentId: reqAssessmentId, userId } = req.body;
    if (!Array.isArray(questionList) || questionList.length === 0) {
        res.status(400).json({ message: "questions array is required and must not be empty" });
        return;
    }
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        let assessmentId = reqAssessmentId ? Number(reqAssessmentId) : null;
        if (!assessmentId) {
            const resolvedUser = await resolveUserId(client, userId);
            if (!resolvedUser) {
                await client.query("ROLLBACK");
                res.status(400).json({ message: "No users found." });
                return;
            }
            assessmentId = await ensureDefaultAssessment(client, resolvedUser);
        }
        let imported = 0;
        const errors = [];
        for (let i = 0; i < questionList.length; i++) {
            const q = questionList[i];
            try {
                const subcategory = q.subcategory || q.category || "QA";
                const questionText = q.questionText || q.text || q.question_text;
                const opts = q.options;
                const correctIdx = q.correctOptionIndex ?? q.correctOptionId ?? 0;
                const difficulty = q.difficulty || "medium";
                const qMarks = q.marks ?? 1;
                const qNegMarks = q.negativeMarks ?? q.negative_marks ?? 0;
                const explanation = q.explanation || null;
                const qStatus = q.status || "active";
                if (!questionText || !Array.isArray(opts) || opts.length < 2) {
                    errors.push(`Question ${i + 1}: missing text or options`);
                    continue;
                }
                // Insert question
                const qInsert = await client.query(`INSERT INTO tech_aptitude_questions
                        (assessment_id, subcategory, difficulty, question_text,
                         correct_option_id, marks, negative_marks, explanation, status)
                     VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)
                     RETURNING aptitude_question_id`, [assessmentId, subcategory, difficulty, questionText,
                    qMarks, qNegMarks, explanation, qStatus]);
                const newQId = qInsert.rows[0].aptitude_question_id;
                // Insert options
                const insertedOpts = [];
                for (const opt of opts) {
                    const optText = typeof opt === "string" ? opt : opt.text || opt.option_text;
                    const oInsert = await client.query(`INSERT INTO tech_aptitude_options (aptitude_question_id, option_text)
                         VALUES ($1, $2) RETURNING option_id`, [newQId, optText]);
                    insertedOpts.push(oInsert.rows[0]);
                }
                // Set correct option
                const safeIdx = Math.min(Math.max(0, Number(correctIdx)), insertedOpts.length - 1);
                await client.query("UPDATE tech_aptitude_questions SET correct_option_id = $1 WHERE aptitude_question_id = $2", [insertedOpts[safeIdx].option_id, newQId]);
                imported++;
            }
            catch (qErr) {
                errors.push(`Question ${i + 1}: ${qErr.message}`);
            }
        }
        // Update assessment count
        await client.query(`UPDATE tech_assessments
             SET total_questions = (
                 SELECT COUNT(*) FROM tech_aptitude_questions WHERE assessment_id = $1
             ), updated_at = NOW()
             WHERE assessment_id = $1`, [assessmentId]);
        await client.query("COMMIT");
        res.status(201).json({
            message: `${imported} of ${questionList.length} questions imported`,
            imported,
            total: questionList.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("bulkImportAptitudeQuestions error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
    finally {
        client.release();
    }
};
exports.bulkImportAptitudeQuestions = bulkImportAptitudeQuestions;
// ─── LIST ASSESSMENTS ──────────────────────────────────────────────────────────
/** GET /api/assessment/admin/assessments */
const listAssessments = async (req, res) => {
    const moduleType = req.query.module ? String(req.query.module) : null;
    try {
        const conditions = [];
        const params = [];
        if (moduleType) {
            conditions.push("module_type = $1");
            params.push(moduleType);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const { rows } = await db_1.default.query(`SELECT assessment_id, assessment_code, assessment_name, module_type,
                    total_time_minutes, total_questions, status, created_at
             FROM tech_assessments
             ${where}
             ORDER BY assessment_id DESC`, params);
        res.json({ data: rows });
    }
    catch (error) {
        console.error("listAssessments error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.listAssessments = listAssessments;
