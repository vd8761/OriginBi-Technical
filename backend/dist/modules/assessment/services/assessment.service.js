"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssessmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const crypto = __importStar(require("crypto"));
let AssessmentService = AssessmentService_1 = class AssessmentService {
    dataSource;
    logger = new common_1.Logger(AssessmentService_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    // ─── Helpers ───────────────────────────────────────────────────────────────────
    hashSeed(seed) {
        const hash = crypto.createHash('sha256').update(seed).digest();
        return hash.readUInt32LE(0);
    }
    mulberry32(seed) {
        let t = seed >>> 0;
        return () => {
            t += 0x6d2b79f5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }
    shuffleWithSeed(items, seed) {
        const rng = this.mulberry32(this.hashSeed(seed));
        const array = [...items];
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    async resolveUserId(queryRunner, userId) {
        const parsed = userId !== undefined && userId !== null ? Number(userId) : NaN;
        if (Number.isFinite(parsed))
            return parsed;
        const rows = await queryRunner.query('SELECT id FROM users ORDER BY id LIMIT 1');
        return rows[0]?.id ?? null;
    }
    // ─── Aptitude Assessment logic ──────────────────────────────────────────────────
    async startAptitudeAttempt(data) {
        const { assessmentId, assessmentCode, userId } = data;
        if (!assessmentId && !assessmentCode)
            throw new common_1.BadRequestException('assessmentId or assessmentCode is required');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const assessmentQuery = assessmentId
                ? "SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = 'aptitude'"
                : "SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = 'aptitude'";
            const assessments = await queryRunner.query(assessmentQuery, [assessmentId || assessmentCode]);
            const assessment = assessments[0];
            if (!assessment)
                throw new common_1.NotFoundException('Aptitude assessment not found');
            const resolvedUserId = await this.resolveUserId(queryRunner, userId);
            if (!resolvedUserId)
                throw new common_1.BadRequestException('No users found.');
            const now = new Date();
            const durationMinutes = Number(assessment.total_time_minutes || 60);
            const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
            const attemptToken = crypto.randomUUID();
            const shuffleSeed = crypto.randomBytes(8).toString('hex');
            const attemptResult = await queryRunner.query(`INSERT INTO tech_aptitude_attempts
            (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW())
         RETURNING aptitude_attempt_id`, [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt]);
            const attemptId = attemptResult[0].aptitude_attempt_id;
            const questions = await queryRunner.query(`SELECT aptitude_question_id FROM tech_aptitude_questions WHERE assessment_id = $1 AND status = 'active'`, [assessment.assessment_id]);
            const shuffled = this.shuffleWithSeed(questions, shuffleSeed);
            for (let i = 0; i < shuffled.length; i++) {
                await queryRunner.query(`INSERT INTO tech_aptitude_attempt_questions (aptitude_attempt_id, aptitude_question_id, display_order)
           VALUES ($1, $2, $3)`, [attemptId, shuffled[i].aptitude_question_id, i + 1]);
            }
            await queryRunner.commitTransaction();
            return {
                token: attemptToken,
                expiresAt,
                totalQuestions: shuffled.length,
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('startAptitudeAttempt error:', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getAttemptQuestions(token) {
        try {
            const attemptRows = await this.dataSource.query(`SELECT a.*, ass.shuffle_options
         FROM tech_aptitude_attempts a
         JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
         WHERE a.attempt_token = $1`, [token]);
            const attempt = attemptRows[0];
            if (!attempt)
                throw new common_1.NotFoundException('Attempt not found');
            const questionRows = await this.dataSource.query(`SELECT aq.attempt_question_id, q.aptitude_question_id, q.question_text, q.image_url, q.subcategory as category,
                COALESCE(
                  json_agg(
                    json_build_object('id', o.option_id, 'text', o.option_text)
                  ) FILTER (WHERE o.option_id IS NOT NULL),
                  '[]'::json
                ) as options
         FROM tech_aptitude_attempt_questions aq
         JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
         LEFT JOIN tech_aptitude_options o ON o.aptitude_question_id = q.aptitude_question_id
         WHERE aq.aptitude_attempt_id = $1
         GROUP BY aq.attempt_question_id, q.aptitude_question_id
         ORDER BY aq.display_order ASC`, [attempt.aptitude_attempt_id]);
            const results = questionRows.map((q) => {
                let finalOptions = q.options;
                if (attempt.shuffle_options) {
                    finalOptions = this.shuffleWithSeed(q.options, `${attempt.shuffle_seed}_${q.aptitude_question_id}`);
                }
                return {
                    id: q.attempt_question_id,
                    questionId: q.aptitude_question_id,
                    text: q.question_text,
                    imageUrl: q.image_url,
                    category: q.category,
                    options: finalOptions,
                };
            });
            return {
                questions: results,
                expiresAt: attempt.expires_at,
                status: attempt.status,
            };
        }
        catch (error) {
            this.logger.error('getAttemptQuestions error:', error);
            throw error;
        }
    }
    async submitAptitudeAttempt(token, body) {
        const { answers } = body;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Get attempt with questions
            const attemptRows = await queryRunner.query(`SELECT a.* FROM tech_aptitude_attempts a WHERE a.attempt_token = $1`, [token]);
            const attempt = attemptRows[0];
            if (!attempt)
                throw new common_1.NotFoundException('Attempt not found');
            if (attempt.status === 'submitted')
                throw new common_1.BadRequestException('Attempt already submitted');
            // Get all questions with correct answers
            const questionRows = await queryRunner.query(`SELECT aq.attempt_question_id, aq.aptitude_question_id, q.correct_option_id, q.marks, q.negative_marks
         FROM tech_aptitude_attempt_questions aq
         JOIN tech_aptitude_questions q ON q.aptitude_question_id = aq.aptitude_question_id
         WHERE aq.aptitude_attempt_id = $1`, [attempt.aptitude_attempt_id]);
            let totalScore = 0;
            let correctCount = 0;
            let wrongCount = 0;
            const answerEntries = Object.entries(answers || {});
            for (const question of questionRows) {
                const selectedOptionId = answers[question.attempt_question_id] || answers[question.aptitude_question_id];
                if (selectedOptionId) {
                    const isCorrect = Number(selectedOptionId) === Number(question.correct_option_id);
                    await queryRunner.query(`UPDATE tech_aptitude_attempt_questions 
             SET selected_option_id = $1, is_correct = $2
             WHERE attempt_question_id = $3`, [selectedOptionId, isCorrect, question.attempt_question_id]);
                    if (isCorrect) {
                        totalScore += Number(question.marks);
                        correctCount++;
                    }
                    else {
                        totalScore -= Number(question.negative_marks || 0);
                        wrongCount++;
                    }
                }
            }
            // Calculate time taken
            const timeTakenSeconds = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
            // Update attempt
            await queryRunner.query(`UPDATE tech_aptitude_attempts 
         SET status = 'submitted', submitted_at = NOW(), total_score = $1, 
             positive_score = $2, negative_score = $3, time_taken_seconds = $4
         WHERE aptitude_attempt_id = $5`, [totalScore, correctCount * 10, wrongCount * (attempt.negative_mark_value || 0), timeTakenSeconds, attempt.aptitude_attempt_id]);
            await queryRunner.commitTransaction();
            return {
                success: true,
                token,
                totalScore,
                correctCount,
                wrongCount,
                timeTakenSeconds,
                status: 'completed',
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('submitAptitudeAttempt error:', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.AssessmentService = AssessmentService;
exports.AssessmentService = AssessmentService = AssessmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AssessmentService);
