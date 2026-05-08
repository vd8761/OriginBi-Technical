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
    // ─── Generic Assessment logic ──────────────────────────────────────────────────
    async startAttempt(module, data) {
        const { assessmentId, assessmentCode, userId, mode = 'main' } = data;
        this.logger.log(`startAttempt: module=${module}, code=${assessmentCode}, mode=${mode}`);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const dbModule = module === 'communication' ? 'grammar' : module;
            let assessment;
            if (assessmentId) {
                const assessments = await queryRunner.query(`SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = $2`, [assessmentId, dbModule]);
                assessment = assessments[0];
            }
            else if (assessmentCode) {
                const assessments = await queryRunner.query(`SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = $2`, [assessmentCode, dbModule]);
                assessment = assessments[0];
            }
            else {
                // Fallback: Get the latest active assessment for this module
                const assessments = await queryRunner.query(`SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`, [dbModule]);
                assessment = assessments[0];
            }
            if (!assessment)
                throw new common_1.NotFoundException(`${module} assessment not found`);
            const resolvedUserId = await this.resolveUserId(queryRunner, userId);
            if (!resolvedUserId)
                throw new common_1.BadRequestException('No users found.');
            const now = new Date();
            const durationMinutes = Number(assessment.total_time_minutes || 60);
            const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
            const attemptToken = `${module.substring(0, 3).toUpperCase()}-${crypto.randomUUID()}`;
            const shuffleSeed = crypto.randomBytes(8).toString('hex');
            // Table mapping
            const tableMap = {
                aptitude: {
                    attempts: 'tech_aptitude_attempts',
                    questions: 'tech_aptitude_questions',
                    junction: 'tech_aptitude_attempt_questions',
                    idCol: 'aptitude_question_id',
                    options: 'tech_aptitude_options',
                    attemptIdCol: 'aptitude_attempt_id',
                    catCol: 'subcategory'
                },
                grammar: {
                    attempts: 'tech_grammar_attempts',
                    questions: 'tech_grammar_questions',
                    junction: 'tech_grammar_attempt_questions',
                    idCol: 'grammar_question_id',
                    options: 'tech_grammar_options',
                    attemptIdCol: 'grammar_attempt_id',
                    catCol: 'task_type'
                },
                communication: {
                    attempts: 'tech_grammar_attempts',
                    questions: 'tech_grammar_questions',
                    junction: 'tech_grammar_attempt_questions',
                    idCol: 'grammar_question_id',
                    options: 'tech_grammar_options',
                    attemptIdCol: 'grammar_attempt_id',
                    catCol: 'task_type'
                },
                mnc: {
                    attempts: 'tech_mnc_attempts',
                    questions: 'tech_mnc_questions',
                    junction: 'tech_mnc_attempt_questions',
                    idCol: 'mnc_question_id',
                    options: 'tech_mnc_options',
                    attemptIdCol: 'mnc_attempt_id',
                    catCol: 'topic_group'
                },
                role: {
                    attempts: 'tech_role_attempts',
                    questions: 'tech_role_questions',
                    junction: 'tech_role_attempt_questions',
                    idCol: 'role_question_id',
                    options: 'tech_role_options',
                    attemptIdCol: 'role_attempt_id',
                    catCol: 'domain'
                }
            };
            const config = tableMap[module];
            if (!config)
                throw new common_1.BadRequestException(`Module ${module} not supported yet`);
            this.logger.log(`startAttempt: module=${module}, code=${assessmentCode || 'LATEST'}, mode=${mode || 'main'}`);
            const attemptResult = await queryRunner.query(`INSERT INTO ${config.attempts}
            (assessment_id, user_id, attempt_token, shuffle_seed, status, started_at, expires_at, created_at, updated_at, mode)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW(), $7)
         RETURNING *`, [assessment.assessment_id, resolvedUserId, attemptToken, shuffleSeed, now, expiresAt, mode]);
            const attemptId = attemptResult[0][config.attemptIdCol];
            const requestedMode = mode === 'trial' ? 'trial' : 'main';
            const questions = await queryRunner.query(`SELECT ${config.idCol} FROM ${config.questions} WHERE assessment_id = $1 AND status = 'active' AND mode = $2`, [assessment.assessment_id, requestedMode]);
            if (questions.length === 0) {
                throw new common_1.BadRequestException(`No active ${requestedMode} questions found for this assessment.`);
            }
            const shuffled = assessment.shuffle_questions
                ? this.shuffleWithSeed(questions, shuffleSeed)
                : questions;
            for (let i = 0; i < shuffled.length; i++) {
                await queryRunner.query(`INSERT INTO ${config.junction} (${config.attemptIdCol}, ${config.idCol}, display_order)
           VALUES ($1, $2, $3)`, [attemptId, shuffled[i][config.idCol], i + 1]);
            }
            await queryRunner.commitTransaction();
            // Get full questions for the response
            const fullQuestions = await this.getAttemptQuestionsByConfig(attemptId, config, assessment.shuffle_options, shuffleSeed);
            return {
                attemptToken,
                expiresAt,
                durationSeconds: durationMinutes * 60,
                mode: requestedMode,
                questions: fullQuestions,
                totalQuestions: fullQuestions.length,
            };
        }
        catch (error) {
            if (queryRunner.isTransactionActive)
                await queryRunner.rollbackTransaction();
            this.logger.error(`startAttempt (${module}) error:`, error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getAttemptQuestionsByConfig(attemptId, config, shuffleOptions, seed) {
        const questionRows = await this.dataSource.query(`SELECT q.*, aq.display_order, q.${config.idCol} as question_id
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       WHERE aq.${config.attemptIdCol} = $1
       ORDER BY aq.display_order ASC`, [attemptId]);
        // Fetch options separately to avoid massive duplication in join or complex aggregations for simple mapping
        const questions = [];
        for (const q of questionRows) {
            const options = await this.dataSource.query(`SELECT option_id::text as id, option_text as text 
             FROM ${config.options} 
             WHERE ${config.idCol} = $1 
             ORDER BY option_id ASC`, [q[config.idCol]]);
            let finalOptions = options;
            if (shuffleOptions) {
                finalOptions = this.shuffleWithSeed(options, seed + q[config.idCol]);
            }
            // Map to frontend shape
            questions.push({
                ...q,
                id: String(q[config.idCol]),
                text: q.question_text,
                instructions: q.question_text, // For communication tasks
                type: q[config.catCol], // For communication tasks
                category: q[config.catCol],
                imageUrl: q.image_url,
                options: finalOptions
            });
        }
        return questions;
    }
    async startAptitudeAttempt(data) {
        return this.startAttempt('aptitude', data);
    }
    async getAttemptQuestions(token) {
        try {
            // Table mapping
            const tableMap = {
                aptitude: {
                    attempts: 'tech_aptitude_attempts',
                    questions: 'tech_aptitude_questions',
                    junction: 'tech_aptitude_attempt_questions',
                    idCol: 'aptitude_question_id',
                    options: 'tech_aptitude_options',
                    attemptIdCol: 'aptitude_attempt_id'
                },
                grammar: {
                    attempts: 'tech_grammar_attempts',
                    questions: 'tech_grammar_questions',
                    junction: 'tech_grammar_attempt_questions',
                    idCol: 'grammar_question_id',
                    options: 'tech_grammar_options',
                    attemptIdCol: 'grammar_attempt_id'
                },
                mnc: {
                    attempts: 'tech_mnc_attempts',
                    questions: 'tech_mnc_questions',
                    junction: 'tech_mnc_attempt_questions',
                    idCol: 'mnc_question_id',
                    options: 'tech_mnc_options',
                    attemptIdCol: 'mnc_attempt_id'
                },
                role: {
                    attempts: 'tech_role_attempts',
                    questions: 'tech_role_questions',
                    junction: 'tech_role_attempt_questions',
                    idCol: 'role_question_id',
                    options: 'tech_role_options',
                    attemptIdCol: 'role_attempt_id'
                }
            };
            const moduleType = (token.startsWith('APT-') ? 'aptitude' :
                (token.startsWith('GRA-') || token.startsWith('COM-')) ? 'grammar' :
                    token.startsWith('MNC-') ? 'mnc' :
                        token.startsWith('ROL-') ? 'role' : 'aptitude');
            const config = tableMap[moduleType];
            if (!config)
                throw new common_1.BadRequestException(`Token ${token} has invalid module prefix`);
            const attemptRows = await this.dataSource.query(`SELECT a.*, ass.shuffle_options, ass.module_type
         FROM ${config.attempts} a
         JOIN tech_assessments ass ON ass.assessment_id = a.assessment_id
         WHERE a.attempt_token = $1`, [token]);
            const attempt = attemptRows[0];
            if (!attempt)
                throw new common_1.NotFoundException('Attempt not found');
            const attemptId = attempt[config.attemptIdCol];
            const questions = await this.getAttemptQuestionsByConfig(attemptId, config, attempt.shuffle_options, attempt.shuffle_seed);
            return {
                questions,
                expiresAt: attempt.expires_at,
                status: attempt.status,
            };
        }
        catch (error) {
            this.logger.error('getAttemptQuestions error:', error);
            throw error;
        }
    }
};
exports.AssessmentService = AssessmentService;
exports.AssessmentService = AssessmentService = AssessmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AssessmentService);
