"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = __importDefault(require("../config/db"));
const getAdminUserId = async (client) => {
    const envId = process.env.ADMIN_USER_ID ? Number(process.env.ADMIN_USER_ID) : null;
    if (envId && Number.isFinite(envId)) {
        return envId;
    }
    const { rows } = await client.query("SELECT id FROM users ORDER BY id LIMIT 1");
    return rows[0]?.id ?? null;
};
const run = async () => {
    const client = await db_1.default.connect();
    try {
        await client.query("BEGIN");
        const adminUserId = await getAdminUserId(client);
        if (!adminUserId) {
            throw new Error("No users found. Add a user first or set ADMIN_USER_ID.");
        }
        const assessmentResult = await client.query(`INSERT INTO tech_assessments
                (assessment_code, assessment_name, module_type, total_time_minutes, total_questions,
                 shuffle_questions, shuffle_options, negative_mark_enabled, negative_mark_value,
                 status, created_by, created_at, updated_at)
             VALUES ($1, $2, 'aptitude', $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW())
             ON CONFLICT (assessment_code)
             DO UPDATE SET
                 assessment_name = EXCLUDED.assessment_name,
                 total_time_minutes = EXCLUDED.total_time_minutes,
                 total_questions = EXCLUDED.total_questions,
                 shuffle_questions = EXCLUDED.shuffle_questions,
                 shuffle_options = EXCLUDED.shuffle_options,
                 negative_mark_enabled = EXCLUDED.negative_mark_enabled,
                 negative_mark_value = EXCLUDED.negative_mark_value,
                 status = EXCLUDED.status,
                 updated_at = NOW()
             RETURNING assessment_id`, [
            "TECH_APT_001",
            "Aptitude Assessment",
            60,
            2,
            true,
            true,
            true,
            0.25,
            adminUserId,
        ]);
        const assessmentId = assessmentResult.rows[0].assessment_id;
        const questions = [
            {
                subcategory: "QA",
                difficulty: "easy",
                question_text: "If the price of a book is first decreased by 25% and then increased by 20%, then the net change in the price will be:",
                image_url: null,
                marks: 10,
                negative_marks: 0.25,
                explanation: "A 25% decrease followed by a 20% increase results in a 5% net decrease.",
                options: [
                    { text: "10% decrease", isCorrect: false },
                    { text: "5% decrease", isCorrect: true },
                    { text: "No change", isCorrect: false },
                    { text: "5% increase", isCorrect: false },
                ],
            },
            {
                subcategory: "LR",
                difficulty: "easy",
                question_text: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
                image_url: null,
                marks: 10,
                negative_marks: 0.25,
                explanation: "Each term is half the previous term, so the next term is 1/8.",
                options: [
                    { text: "(1/3)", isCorrect: false },
                    { text: "(1/8)", isCorrect: true },
                    { text: "(2/8)", isCorrect: false },
                    { text: "(1/16)", isCorrect: false },
                ],
            },
        ];
        for (const question of questions) {
            const questionResult = await client.query(`INSERT INTO tech_aptitude_questions
                    (assessment_id, subcategory, difficulty, question_text, image_url, image_metadata,
                     correct_option_id, marks, negative_marks, explanation, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7, $8, 'active', NOW(), NOW())
                 RETURNING aptitude_question_id`, [
                assessmentId,
                question.subcategory,
                question.difficulty,
                question.question_text,
                question.image_url,
                question.marks,
                question.negative_marks,
                question.explanation,
            ]);
            const questionId = questionResult.rows[0].aptitude_question_id;
            let correctOptionId = null;
            for (const option of question.options) {
                const optionResult = await client.query(`INSERT INTO tech_aptitude_options
                        (aptitude_question_id, option_text, created_at)
                     VALUES ($1, $2, NOW())
                     RETURNING option_id`, [questionId, option.text]);
                const optionId = optionResult.rows[0].option_id;
                if (option.isCorrect) {
                    correctOptionId = optionId;
                }
            }
            if (correctOptionId) {
                await client.query(`UPDATE tech_aptitude_questions
                     SET correct_option_id = $1, updated_at = NOW()
                     WHERE aptitude_question_id = $2`, [correctOptionId, questionId]);
            }
        }
        await client.query("COMMIT");
        console.log("Seeded aptitude assessment data.");
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to seed data:", error.message);
        process.exit(1);
    }
    finally {
        client.release();
        await db_1.default.end();
    }
};
run();
