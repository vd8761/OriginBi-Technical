"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechGrammarAttemptQuestionOption = exports.TechGrammarAttemptQuestion = exports.TechGrammarAttempt = exports.TechGrammarOption = exports.TechGrammarQuestion = void 0;
const typeorm_1 = require("typeorm");
const assessment_1 = require("./assessment");
const enums_1 = require("./enums");
const transformers_1 = require("./transformers");
const UserEntity_1 = require("./UserEntity");
let TechGrammarQuestion = class TechGrammarQuestion {
    grammarQuestionId;
    assessment;
    assessmentId;
    taskType;
    difficulty;
    questionText;
    audioUrl;
    passageText;
    referenceAnswer;
    rubricJson;
    correctOption;
    correctOptionId;
    marks;
    negativeMarks;
    status;
    createdAt;
    updatedAt;
    options;
};
exports.TechGrammarQuestion = TechGrammarQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "grammar_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechGrammarQuestion.prototype, "grammarQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechGrammarQuestion.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.assessment),
    __metadata("design:type", String)
], TechGrammarQuestion.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "task_type",
        type: "enum",
        enum: enums_1.TechGrammarTaskType,
        enumName: "tech_grammar_task_type",
    }),
    __metadata("design:type", String)
], TechGrammarQuestion.prototype, "taskType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "difficulty",
        type: "enum",
        enum: enums_1.TechDifficulty,
        enumName: "tech_difficulty",
    }),
    __metadata("design:type", String)
], TechGrammarQuestion.prototype, "difficulty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "question_text", type: "text" }),
    __metadata("design:type", String)
], TechGrammarQuestion.prototype, "questionText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "audio_url", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarQuestion.prototype, "audioUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "passage_text", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarQuestion.prototype, "passageText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "reference_answer", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarQuestion.prototype, "referenceAnswer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "rubric_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarQuestion.prototype, "rubricJson", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "correct_option_id" }),
    __metadata("design:type", Object)
], TechGrammarQuestion.prototype, "correctOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.correctOption),
    __metadata("design:type", Object)
], TechGrammarQuestion.prototype, "correctOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarQuestion.prototype, "marks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 0,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarQuestion.prototype, "negativeMarks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechQuestionStatus,
        enumName: "tech_question_status",
    }),
    __metadata("design:type", String)
], TechGrammarQuestion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarQuestion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarQuestion.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechGrammarOption, (option) => option.question),
    __metadata("design:type", Array)
], TechGrammarQuestion.prototype, "options", void 0);
exports.TechGrammarQuestion = TechGrammarQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_grammar_questions" })
], TechGrammarQuestion);
let TechGrammarOption = class TechGrammarOption {
    optionId;
    question;
    questionId;
    optionText;
    createdAt;
};
exports.TechGrammarOption = TechGrammarOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechGrammarOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "grammar_question_id" }),
    __metadata("design:type", TechGrammarQuestion)
], TechGrammarOption.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((option) => option.question),
    __metadata("design:type", String)
], TechGrammarOption.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "option_text", type: "text" }),
    __metadata("design:type", String)
], TechGrammarOption.prototype, "optionText", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarOption.prototype, "createdAt", void 0);
exports.TechGrammarOption = TechGrammarOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_grammar_options" })
], TechGrammarOption);
let TechGrammarAttempt = class TechGrammarAttempt {
    grammarAttemptId;
    assessment;
    assessmentId;
    user;
    userId;
    attemptToken;
    shuffleSeed;
    status;
    startedAt;
    expiresAt;
    submittedAt;
    totalScore;
    positiveScore;
    negativeScore;
    timeTakenSeconds;
    createdAt;
    updatedAt;
    questions;
};
exports.TechGrammarAttempt = TechGrammarAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "grammar_attempt_id", type: "bigint" }),
    __metadata("design:type", String)
], TechGrammarAttempt.prototype, "grammarAttemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechGrammarAttempt.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.assessment),
    __metadata("design:type", String)
], TechGrammarAttempt.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserEntity_1.UserEntity, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", UserEntity_1.UserEntity)
], TechGrammarAttempt.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.user),
    __metadata("design:type", String)
], TechGrammarAttempt.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "attempt_token", type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], TechGrammarAttempt.prototype, "attemptToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "shuffle_seed", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechGrammarAttempt.prototype, "shuffleSeed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechAttemptStatus,
        enumName: "tech_attempt_status",
    }),
    __metadata("design:type", String)
], TechGrammarAttempt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "started_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarAttempt.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "expires_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarAttempt.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttempt.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "total_score",
        type: "decimal",
        precision: 8,
        scale: 2,
        default: 0,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarAttempt.prototype, "totalScore", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "positive_score",
        type: "decimal",
        precision: 8,
        scale: 2,
        default: 0,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarAttempt.prototype, "positiveScore", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_score",
        type: "decimal",
        precision: 8,
        scale: 2,
        default: 0,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarAttempt.prototype, "negativeScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "time_taken_seconds", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttempt.prototype, "timeTakenSeconds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarAttempt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechGrammarAttempt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechGrammarAttemptQuestion, (question) => question.attempt),
    __metadata("design:type", Array)
], TechGrammarAttempt.prototype, "questions", void 0);
exports.TechGrammarAttempt = TechGrammarAttempt = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_grammar_attempts" })
], TechGrammarAttempt);
let TechGrammarAttemptQuestion = class TechGrammarAttemptQuestion {
    attemptQuestionId;
    attempt;
    attemptId;
    question;
    questionId;
    displayOrder;
    selectedOption;
    selectedOptionId;
    answerText;
    answerAudioUrl;
    convertedText;
    aiScoreJson;
    isCorrect;
    scoreAwarded;
    negativeApplied;
    answeredAt;
    isLocked;
    options;
};
exports.TechGrammarAttemptQuestion = TechGrammarAttemptQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechGrammarAttemptQuestion.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarAttempt, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "grammar_attempt_id" }),
    __metadata("design:type", TechGrammarAttempt)
], TechGrammarAttemptQuestion.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.attempt),
    __metadata("design:type", String)
], TechGrammarAttemptQuestion.prototype, "attemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarQuestion, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "grammar_question_id" }),
    __metadata("design:type", TechGrammarQuestion)
], TechGrammarAttemptQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.question),
    __metadata("design:type", String)
], TechGrammarAttemptQuestion.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechGrammarAttemptQuestion.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "selected_option_id" }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "selectedOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.selectedOption),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "selectedOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "answer_text", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "answerText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "answer_audio_url", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "answerAudioUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "converted_text", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "convertedText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "ai_score_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "aiScoreJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_correct", type: "boolean", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "isCorrect", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "score_awarded",
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 0,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarAttemptQuestion.prototype, "scoreAwarded", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_applied",
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 0,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechGrammarAttemptQuestion.prototype, "negativeApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "answered_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechGrammarAttemptQuestion.prototype, "answeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_locked", type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TechGrammarAttemptQuestion.prototype, "isLocked", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechGrammarAttemptQuestionOption, (option) => option.attemptQuestion),
    __metadata("design:type", Array)
], TechGrammarAttemptQuestion.prototype, "options", void 0);
exports.TechGrammarAttemptQuestion = TechGrammarAttemptQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_grammar_attempt_questions" }),
    (0, typeorm_1.Unique)("uq_grammar_attempt_question", ["attempt", "question"])
], TechGrammarAttemptQuestion);
let TechGrammarAttemptQuestionOption = class TechGrammarAttemptQuestionOption {
    attemptQuestionOptionId;
    attemptQuestion;
    attemptQuestionId;
    option;
    optionId;
    displayOrder;
};
exports.TechGrammarAttemptQuestionOption = TechGrammarAttemptQuestionOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechGrammarAttemptQuestionOption.prototype, "attemptQuestionOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarAttemptQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "attempt_question_id" }),
    __metadata("design:type", TechGrammarAttemptQuestion)
], TechGrammarAttemptQuestionOption.prototype, "attemptQuestion", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.attemptQuestion),
    __metadata("design:type", String)
], TechGrammarAttemptQuestionOption.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechGrammarOption, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "option_id" }),
    __metadata("design:type", TechGrammarOption)
], TechGrammarAttemptQuestionOption.prototype, "option", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.option),
    __metadata("design:type", String)
], TechGrammarAttemptQuestionOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechGrammarAttemptQuestionOption.prototype, "displayOrder", void 0);
exports.TechGrammarAttemptQuestionOption = TechGrammarAttemptQuestionOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_grammar_attempt_question_options" }),
    (0, typeorm_1.Unique)("uq_grammar_attempt_option", ["attemptQuestion", "option"]),
    (0, typeorm_1.Unique)("uq_grammar_attempt_option_order", ["attemptQuestion", "displayOrder"])
], TechGrammarAttemptQuestionOption);
