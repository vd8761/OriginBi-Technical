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
    columnExistsCache = new Map();
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
    async hasColumn(tableName, columnName) {
        const cacheKey = `${tableName}.${columnName}`;
        const cached = this.columnExistsCache.get(cacheKey);
        if (cached !== undefined)
            return cached;
        const rows = await this.dataSource.query(`SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`, [tableName, columnName]);
        const exists = rows.length > 0;
        this.columnExistsCache.set(cacheKey, exists);
        return exists;
    }
    // ─── Generic Assessment logic ──────────────────────────────────────────────────
    async startAttempt(module, data) {
        const { assessmentId, assessmentCode, userId, mode = 'main' } = data;
        this.logger.log(`startAttempt: module=${module}, code=${assessmentCode}, mode=${mode}`);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            this.logger.log(`[DEBUG ${module}] Step 1: Connected to DB, transaction started`);
            let assessment;
            if (assessmentId) {
                const assessments = await queryRunner.query(`SELECT * FROM tech_assessments WHERE assessment_id = $1 AND module_type = $2`, [assessmentId, module]);
                assessment = assessments[0];
            }
            else if (assessmentCode) {
                const assessments = await queryRunner.query(`SELECT * FROM tech_assessments WHERE assessment_code = $1 AND module_type = $2`, [assessmentCode, module]);
                assessment = assessments[0];
                // Fallback: If code not found, use any active assessment
                if (!assessment) {
                    this.logger.warn(`Code ${assessmentCode} not found, using active ${module} assessment`);
                    const fallback = await queryRunner.query(`SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`, [module]);
                    assessment = fallback[0];
                }
            }
            else {
                // Fallback: Get the latest active assessment for this module
                const assessments = await queryRunner.query(`SELECT * FROM tech_assessments WHERE module_type = $1 AND status = 'active' ORDER BY assessment_id DESC LIMIT 1`, [module]);
                assessment = assessments[0];
            }
            if (!assessment)
                throw new common_1.NotFoundException(`${module} assessment not found`);
            this.logger.log(`[DEBUG ${module}] Step 2: Assessment found: ${assessment.assessment_id}`);
            const resolvedUserId = await this.resolveUserId(queryRunner, userId);
            this.logger.log(`[DEBUG ${module}] Step 3: User resolved: ${resolvedUserId}`);
            if (!resolvedUserId)
                throw new common_1.BadRequestException('No users found.');
            const now = new Date();
            const durationMinutes = Number(assessment.total_time_minutes || 60);
            const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
            const attemptToken = `${module.substring(0, 3).toUpperCase()}-${crypto.randomUUID()}`;
            const shuffleSeed = crypto.randomBytes(8).toString('hex');
            const config = this.getModuleConfig(module);
            this.logger.log(`[DEBUG ${module}] Step 4: Config loaded for ${config.attempts}`);
            const attemptColumns = [
                'assessment_id',
                'user_id',
                'attempt_token',
                'status',
                'started_at',
                'expires_at',
                'created_at',
                'updated_at',
            ];
            const attemptValues = [
                '$1',
                '$2',
                '$3',
                `'in_progress'`,
                '$4',
                '$5',
                'NOW()',
                'NOW()',
            ];
            const attemptParams = [assessment.assessment_id, resolvedUserId, attemptToken, now, expiresAt];
            const attemptsHasShuffleSeed = await this.hasColumn(config.attempts, 'shuffle_seed');
            if (attemptsHasShuffleSeed) {
                attemptColumns.splice(3, 0, 'shuffle_seed');
                attemptValues.splice(3, 0, `$${attemptParams.length + 1}`);
                attemptParams.push(shuffleSeed);
            }
            const attemptsHasMode = await this.hasColumn(config.attempts, 'mode');
            if (attemptsHasMode) {
                attemptColumns.push('mode');
                attemptValues.push(`$${attemptParams.length + 1}`);
                attemptParams.push(mode);
            }
            this.logger.log(`[DEBUG ${module}] Step 5: Inserting attempt with columns: ${attemptColumns.join(', ')}`);
            const attemptResult = await queryRunner.query(`INSERT INTO ${config.attempts}
            (${attemptColumns.join(', ')})
         VALUES (${attemptValues.join(', ')})
         RETURNING *`, attemptParams);
            const attemptId = attemptResult[0][config.attemptIdCol];
            this.logger.log(`[DEBUG ${module}] Step 6: Attempt created with ID: ${attemptId}`);
            const requestedMode = mode === 'trial' ? 'trial' : 'main';
            const questionsHasMode = await this.hasColumn(config.questions, 'mode');
            const questionWhere = questionsHasMode
                ? `assessment_id = $1 AND status = 'active' AND (mode = $2 OR mode IS NULL)`
                : `assessment_id = $1 AND status = 'active'`;
            const questionParams = questionsHasMode
                ? [assessment.assessment_id, requestedMode]
                : [assessment.assessment_id];
            this.logger.log(`[DEBUG ${module}] Step 7: Looking for questions in ${config.questions}`);
            let questions = await queryRunner.query(`SELECT ${config.idCol} FROM ${config.questions} WHERE ${questionWhere}`, questionParams);
            this.logger.log(`[DEBUG ${module}] Step 8: Found ${questions.length} questions`);
            if (questions.length === 0 && requestedMode === 'trial') {
                this.logger.warn(`No trial questions found, falling back to main mode`);
                const mainWhere = questionsHasMode
                    ? `assessment_id = $1 AND status = 'active' AND (mode = 'main' OR mode IS NULL)`
                    : `assessment_id = $1 AND status = 'active'`;
                questions = await queryRunner.query(`SELECT ${config.idCol} FROM ${config.questions} WHERE ${mainWhere}`, [assessment.assessment_id]);
                this.logger.log(`[DEBUG ${module}] Step 8b: Found ${questions.length} questions from main mode fallback`);
            }
            if (questions.length === 0) {
                throw new common_1.BadRequestException(`No active questions found for this assessment.`);
            }
            const shuffled = assessment.shuffle_questions
                ? this.shuffleWithSeed(questions, shuffleSeed)
                : questions;
            for (let i = 0; i < shuffled.length; i++) {
                await queryRunner.query(`INSERT INTO ${config.junction} (${config.attemptIdCol}, ${config.idCol}, display_order)
           VALUES ($1, $2, $3)`, [attemptId, shuffled[i][config.idCol], i + 1]);
            }
            await queryRunner.commitTransaction();
            this.logger.log(`[DEBUG ${module}] Step 9: Transaction committed`);
            // Get full questions for the response
            this.logger.log(`[DEBUG ${module}] Step 10: Fetching full questions from ${config.junction}`);
            const fullQuestions = await this.getAttemptQuestionsByConfig(attemptId, config, assessment.shuffle_options, shuffleSeed);
            this.logger.log(`[DEBUG ${module}] Step 11: Full questions fetched: ${fullQuestions.length}`);
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
        const textColumn = config.questions === 'tech_coding_questions'
            ? 'q.problem_statement as question_text'
            : 'q.question_text';
        const hasDifficulty = config.questions !== 'tech_role_questions';
        const selectColumns = [
            'aq.display_order',
            `q.${config.idCol} as question_id`,
            textColumn,
            ...(hasDifficulty ? ['q.difficulty'] : []),
            ...config.selectColumns,
        ];
        const groupByTextColumn = config.questions === 'tech_coding_questions'
            ? 'q.problem_statement'
            : 'q.question_text';
        const groupByColumns = [
            'aq.display_order',
            `q.${config.idCol}`,
            groupByTextColumn,
            ...(hasDifficulty ? ['q.difficulty'] : []),
            ...config.groupByColumns,
        ];
        const optionsSelect = config.options
            ? `COALESCE(
            json_agg(
              json_build_object('id', o.option_id::text, 'text', o.option_text)
            ) FILTER (WHERE o.option_id IS NOT NULL),
            '[]'::json
         ) as options`
            : `'[]'::json as options`;
        const joinOptions = config.options
            ? `LEFT JOIN ${config.options} o ON o.${config.idCol} = q.${config.idCol}`
            : '';
        const questionRows = await this.dataSource.query(`SELECT ${selectColumns.join(', ')}, ${optionsSelect}
       FROM ${config.junction} aq
       JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
       ${joinOptions}
       WHERE aq.${config.attemptIdCol} = $1
       GROUP BY ${groupByColumns.join(', ')}
       ORDER BY aq.display_order ASC`, [attemptId]);
        return questionRows.map((q) => {
            let finalOptions = q.options;
            if (shuffleOptions && Array.isArray(q.options)) {
                finalOptions = this.shuffleWithSeed(q.options, `${seed}_${q.question_id}`);
            }
            const mapped = {
                id: q.question_id,
                text: q.question_text,
                options: finalOptions || [],
            };
            if (q.difficulty !== undefined && q.difficulty !== null)
                mapped.difficulty = q.difficulty;
            if (q.image_url !== undefined)
                mapped.imageUrl = q.image_url;
            if (q.category !== undefined)
                mapped.category = q.category;
            if (q.marks !== undefined)
                mapped.marks = Number(q.marks);
            if (q.negative_marks !== undefined)
                mapped.negativeMarks = Number(q.negative_marks);
            if (q.explanation !== undefined)
                mapped.explanation = q.explanation;
            if (q.question_type !== undefined)
                mapped.questionType = q.question_type;
            if (q.scenario_context !== undefined)
                mapped.scenarioContext = q.scenario_context;
            if (q.task_type !== undefined)
                mapped.taskType = q.task_type;
            if (q.audio_url !== undefined)
                mapped.audioUrl = q.audio_url;
            if (q.passage_text !== undefined)
                mapped.passage = q.passage_text;
            if (q.reference_answer !== undefined)
                mapped.referenceAnswer = q.reference_answer;
            if (q.rubric_json !== undefined)
                mapped.rubric = q.rubric_json;
            if (q.title !== undefined)
                mapped.title = q.title;
            if (q.statement !== undefined)
                mapped.statement = q.statement;
            if (q.startercode !== undefined)
                mapped.starterCode = q.startercode;
            if (q.starterfiles !== undefined)
                mapped.starterFiles = q.starterfiles;
            if (q.entryfile !== undefined)
                mapped.entryFile = q.entryfile;
            if (q.limits !== undefined)
                mapped.limits = q.limits;
            if (q.sampleio !== undefined)
                mapped.sampleIo = q.sampleio;
            if (q.allowedlanguages !== undefined)
                mapped.allowedLanguages = q.allowedlanguages;
            if (q.inputformat !== undefined)
                mapped.inputFormat = q.inputformat;
            if (q.outputformat !== undefined)
                mapped.outputFormat = q.outputformat;
            if (q.constraints !== undefined)
                mapped.constraints = q.constraints;
            return mapped;
        });
    }
    async startAptitudeAttempt(data) {
        return this.startAttempt('aptitude', data);
    }
    async getAttemptQuestions(token) {
        try {
            const moduleType = (token.startsWith('APT-') ? 'aptitude' :
                token.startsWith('GRA-') ? 'grammar' :
                    token.startsWith('MNC-') ? 'mnc' :
                        token.startsWith('ROL-') ? 'role' : 'aptitude');
            const config = this.getModuleConfig(moduleType);
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
    async submitAttempt(module, token, body) {
        const { answers } = body;
        const config = this.getModuleConfig(module);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Get attempt
            const attemptRows = await queryRunner.query(`SELECT a.* FROM ${config.attempts} a WHERE a.attempt_token = $1`, [token]);
            const attempt = attemptRows[0];
            if (!attempt)
                throw new common_1.NotFoundException('Attempt not found');
            if (attempt.status === 'submitted')
                throw new common_1.BadRequestException('Attempt already submitted');
            const attemptId = attempt[config.attemptIdCol];
            // Get all questions with correct answers
            const correctOptionCol = module === 'coding' ? 'NULL as correct_option_id' : 'q.correct_option_id';
            const questionRows = await queryRunner.query(`SELECT aq.attempt_question_id, aq.${config.idCol} as question_id,
                ${correctOptionCol}, q.marks, q.negative_marks,
                ${module === 'grammar' ? 'q.task_type' : 'NULL as task_type'}
         FROM ${config.junction} aq
         JOIN ${config.questions} q ON q.${config.idCol} = aq.${config.idCol}
         WHERE aq.${config.attemptIdCol} = $1`, [attemptId]);
            let totalScore = 0;
            let positiveScore = 0;
            let negativeScore = 0;
            let correctCount = 0;
            let wrongCount = 0;
            let answeredCount = 0;
            const resolveAnswer = (question) => {
                if (!answers)
                    return undefined;
                return answers[question.attempt_question_id] ?? answers[question.question_id];
            };
            for (const question of questionRows) {
                const rawAnswer = resolveAnswer(question);
                if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
                    continue;
                }
                answeredCount++;
                if (module === 'coding') {
                    const answerPayload = typeof rawAnswer === 'object' ? rawAnswer : { code: String(rawAnswer) };
                    const submittedCode = answerPayload.code ?? answerPayload.submittedCode ?? null;
                    const language = answerPayload.language ?? answerPayload.lang ?? null;
                    if (submittedCode) {
                        await queryRunner.query(`UPDATE ${config.junction}
               SET submitted_code = $1, language = COALESCE($2, language), submitted_at = NOW()
               WHERE attempt_question_id = $3`, [submittedCode, language, question.attempt_question_id]);
                    }
                    continue;
                }
                if (module === 'grammar') {
                    const taskType = String(question.task_type || '').toLowerCase();
                    if (taskType === 'listening_mcq' || taskType === 'reading_mcq') {
                        const selectedOptionId = typeof rawAnswer === 'object'
                            ? rawAnswer.selectedOptionId ?? rawAnswer.optionId ?? rawAnswer.value
                            : rawAnswer;
                        if (selectedOptionId) {
                            const isCorrect = Number(selectedOptionId) === Number(question.correct_option_id);
                            await queryRunner.query(`UPDATE ${config.junction}
                 SET selected_option_id = $1, is_correct = $2, answered_at = NOW()
                 WHERE attempt_question_id = $3`, [selectedOptionId, isCorrect, question.attempt_question_id]);
                            if (isCorrect) {
                                totalScore += Number(question.marks);
                                positiveScore += Number(question.marks);
                                correctCount++;
                            }
                            else {
                                totalScore -= Number(question.negative_marks || 0);
                                negativeScore += Number(question.negative_marks || 0);
                                wrongCount++;
                            }
                        }
                    }
                    else if (taskType === 'writing') {
                        const answerText = typeof rawAnswer === 'string'
                            ? rawAnswer
                            : rawAnswer.text ?? rawAnswer.answerText ?? null;
                        if (answerText) {
                            await queryRunner.query(`UPDATE ${config.junction}
                 SET answer_text = $1, answered_at = NOW()
                 WHERE attempt_question_id = $2`, [answerText, question.attempt_question_id]);
                        }
                    }
                    else if (taskType === 'speaking') {
                        const audioPayload = typeof rawAnswer === 'string'
                            ? rawAnswer
                            : rawAnswer.audio ?? rawAnswer.audioBase64 ?? rawAnswer.audioUrl ?? rawAnswer.audioBlobUrl ?? null;
                        const answerText = typeof rawAnswer === 'object'
                            ? rawAnswer.text ?? rawAnswer.answerText ?? null
                            : null;
                        if (audioPayload || answerText) {
                            await queryRunner.query(`UPDATE ${config.junction}
                 SET answer_audio_url = $1, answer_text = COALESCE($2, answer_text), answered_at = NOW()
                 WHERE attempt_question_id = $3`, [audioPayload, answerText, question.attempt_question_id]);
                        }
                    }
                    else {
                        const answerText = typeof rawAnswer === 'string'
                            ? rawAnswer
                            : rawAnswer.text ?? rawAnswer.answerText ?? null;
                        if (answerText) {
                            await queryRunner.query(`UPDATE ${config.junction}
                 SET answer_text = $1, answered_at = NOW()
                 WHERE attempt_question_id = $2`, [answerText, question.attempt_question_id]);
                        }
                    }
                    continue;
                }
                const selectedOptionId = typeof rawAnswer === 'object'
                    ? rawAnswer.selectedOptionId ?? rawAnswer.optionId ?? rawAnswer.value
                    : rawAnswer;
                if (selectedOptionId) {
                    const isCorrect = Number(selectedOptionId) === Number(question.correct_option_id);
                    await queryRunner.query(`UPDATE ${config.junction}
             SET selected_option_id = $1, is_correct = $2, answered_at = NOW()
             WHERE attempt_question_id = $3`, [selectedOptionId, isCorrect, question.attempt_question_id]);
                    if (isCorrect) {
                        totalScore += Number(question.marks);
                        positiveScore += Number(question.marks);
                        correctCount++;
                    }
                    else {
                        totalScore -= Number(question.negative_marks || 0);
                        negativeScore += Number(question.negative_marks || 0);
                        wrongCount++;
                    }
                }
            }
            // Calculate time taken
            const timeTakenSeconds = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
            // Update attempt
            await queryRunner.query(`UPDATE ${config.attempts}
         SET status = 'submitted', submitted_at = NOW(), total_score = $1,
             positive_score = $2, negative_score = $3, time_taken_seconds = $4
         WHERE ${config.attemptIdCol} = $5`, [totalScore, positiveScore, negativeScore, timeTakenSeconds, attemptId]);
            await queryRunner.commitTransaction();
            return {
                success: true,
                token,
                totalScore,
                positiveScore,
                negativeScore,
                correctCount,
                wrongCount,
                answeredCount,
                totalQuestions: questionRows.length,
                timeTakenSeconds,
                status: 'completed',
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`submitAttempt (${module}) error:`, error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    getModuleConfig(module) {
        const configs = {
            aptitude: {
                attempts: 'tech_aptitude_attempts',
                questions: 'tech_aptitude_questions',
                junction: 'tech_aptitude_attempt_questions',
                idCol: 'aptitude_question_id',
                options: 'tech_aptitude_options',
                attemptIdCol: 'aptitude_attempt_id',
                selectColumns: [
                    'q.image_url',
                    'q.subcategory as category',
                    'q.marks',
                    'q.negative_marks',
                    'q.explanation',
                ],
                groupByColumns: [
                    'q.image_url',
                    'q.subcategory',
                    'q.marks',
                    'q.negative_marks',
                    'q.explanation',
                ],
            },
            grammar: {
                attempts: 'tech_grammar_attempts',
                questions: 'tech_grammar_questions',
                junction: 'tech_grammar_attempt_questions',
                idCol: 'grammar_question_id',
                options: 'tech_grammar_options',
                attemptIdCol: 'grammar_attempt_id',
                selectColumns: [
                    'q.task_type',
                    'q.audio_url',
                    'q.passage_text',
                    'q.reference_answer',
                    'q.rubric_json',
                    'q.marks',
                    'q.negative_marks',
                ],
                groupByColumns: [
                    'q.task_type',
                    'q.audio_url',
                    'q.passage_text',
                    'q.reference_answer',
                    'q.rubric_json::text',
                    'q.marks',
                    'q.negative_marks',
                ],
            },
            mnc: {
                attempts: 'tech_mnc_attempts',
                questions: 'tech_mnc_questions',
                junction: 'tech_mnc_attempt_questions',
                idCol: 'mnc_question_id',
                options: 'tech_mnc_options',
                attemptIdCol: 'mnc_attempt_id',
                selectColumns: [
                    'q.topic_group as category',
                    'q.marks',
                    'q.negative_marks',
                ],
                groupByColumns: [
                    'q.topic_group',
                    'q.marks',
                    'q.negative_marks',
                ],
            },
            role: {
                attempts: 'tech_role_attempts',
                questions: 'tech_role_questions',
                junction: 'tech_role_attempt_questions',
                idCol: 'role_question_id',
                options: 'tech_role_options',
                attemptIdCol: 'role_attempt_id',
                selectColumns: [
                    'q.domain as category',
                    'q.question_type',
                    'q.scenario_context',
                    'q.marks',
                    'q.negative_marks',
                ],
                groupByColumns: [
                    'q.domain',
                    'q.question_type',
                    'q.scenario_context',
                    'q.question_text',
                    'q.marks',
                    'q.negative_marks',
                ],
            },
            coding: {
                attempts: 'tech_coding_attempts',
                questions: 'tech_coding_questions',
                junction: 'tech_coding_attempt_questions',
                idCol: 'coding_question_id',
                options: null,
                attemptIdCol: 'coding_attempt_id',
                selectColumns: [
                    'q.problem_title as title',
                    'q.difficulty',
                    'q.marks',
                    'q.starter_code_json as starterCode',
                    'q.starter_files_json as starterFiles',
                    'q.entry_file_json as entryFile',
                    'q.limits_json as limits',
                    'q.sample_io_json as sampleIo',
                    'q.allowed_languages_json as allowedLanguages',
                    'q.input_format as inputFormat',
                    'q.output_format as outputFormat',
                    'q.constraints',
                ],
                groupByColumns: [
                    'q.problem_title',
                    'q.difficulty',
                    'q.marks',
                    'q.starter_code_json::text',
                    'q.starter_files_json::text',
                    'q.entry_file_json::text',
                    'q.limits_json::text',
                    'q.sample_io_json::text',
                    'q.allowed_languages_json::text',
                    'q.input_format',
                    'q.output_format',
                    'q.constraints',
                ],
            },
        };
        const config = configs[module];
        if (!config)
            throw new common_1.BadRequestException(`Unknown module: ${module}`);
        return config;
    }
};
exports.AssessmentService = AssessmentService;
exports.AssessmentService = AssessmentService = AssessmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AssessmentService);
