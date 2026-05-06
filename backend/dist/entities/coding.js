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
exports.TechCodingAttemptQuestion = exports.TechCodingAttempt = exports.TechCodingQuestion = void 0;
const typeorm_1 = require("typeorm");
const assessment_1 = require("./assessment");
const enums_1 = require("./enums");
const transformers_1 = require("./transformers");
const UserEntity_1 = require("./UserEntity");
let TechCodingQuestion = class TechCodingQuestion {
    codingQuestionId;
    assessment;
    assessmentId;
    difficulty;
    problemTitle;
    problemStatement;
    inputFormat;
    outputFormat;
    constraints;
    starterCode;
    starterCodeJson;
    starterFilesJson;
    entryFileJson;
    limitsJson;
    sampleIoJson;
    hiddenTestcasesRef;
    allowedLanguagesJson;
    marks;
    negativeMarks;
    status;
    createdAt;
    updatedAt;
};
exports.TechCodingQuestion = TechCodingQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "coding_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechCodingQuestion.prototype, "codingQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechCodingQuestion.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.assessment),
    __metadata("design:type", String)
], TechCodingQuestion.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "difficulty",
        type: "enum",
        enum: enums_1.TechDifficulty,
        enumName: "tech_difficulty",
    }),
    __metadata("design:type", String)
], TechCodingQuestion.prototype, "difficulty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "problem_title", type: "varchar", length: 150 }),
    __metadata("design:type", String)
], TechCodingQuestion.prototype, "problemTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "problem_statement", type: "text" }),
    __metadata("design:type", String)
], TechCodingQuestion.prototype, "problemStatement", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "input_format", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "inputFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "output_format", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "outputFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "constraints", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "constraints", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "starter_code", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "starterCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "starter_code_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "starterCodeJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "starter_files_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "starterFilesJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "entry_file_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "entryFileJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "limits_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "limitsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "sample_io_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "sampleIoJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "hidden_testcases_ref", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "hiddenTestcasesRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "allowed_languages_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingQuestion.prototype, "allowedLanguagesJson", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechCodingQuestion.prototype, "marks", void 0);
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
], TechCodingQuestion.prototype, "negativeMarks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechQuestionStatus,
        enumName: "tech_question_status",
    }),
    __metadata("design:type", String)
], TechCodingQuestion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechCodingQuestion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechCodingQuestion.prototype, "updatedAt", void 0);
exports.TechCodingQuestion = TechCodingQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_coding_questions" })
], TechCodingQuestion);
let TechCodingAttempt = class TechCodingAttempt {
    codingAttemptId;
    assessment;
    assessmentId;
    user;
    userId;
    attemptToken;
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
exports.TechCodingAttempt = TechCodingAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "coding_attempt_id", type: "bigint" }),
    __metadata("design:type", String)
], TechCodingAttempt.prototype, "codingAttemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechCodingAttempt.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.assessment),
    __metadata("design:type", String)
], TechCodingAttempt.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserEntity_1.UserEntity, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", UserEntity_1.UserEntity)
], TechCodingAttempt.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.user),
    __metadata("design:type", String)
], TechCodingAttempt.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "attempt_token", type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], TechCodingAttempt.prototype, "attemptToken", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechAttemptStatus,
        enumName: "tech_attempt_status",
    }),
    __metadata("design:type", String)
], TechCodingAttempt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "started_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechCodingAttempt.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "expires_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechCodingAttempt.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttempt.prototype, "submittedAt", void 0);
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
], TechCodingAttempt.prototype, "totalScore", void 0);
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
], TechCodingAttempt.prototype, "positiveScore", void 0);
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
], TechCodingAttempt.prototype, "negativeScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "time_taken_seconds", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttempt.prototype, "timeTakenSeconds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechCodingAttempt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechCodingAttempt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechCodingAttemptQuestion, (question) => question.attempt),
    __metadata("design:type", Array)
], TechCodingAttempt.prototype, "questions", void 0);
exports.TechCodingAttempt = TechCodingAttempt = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_coding_attempts" })
], TechCodingAttempt);
let TechCodingAttemptQuestion = class TechCodingAttemptQuestion {
    attemptQuestionId;
    attempt;
    attemptId;
    question;
    questionId;
    displayOrder;
    language;
    submittedCode;
    judgeInputRef;
    judgeOutputRef;
    compileStatus;
    runStatus;
    judgeResultJson;
    isCorrect;
    scoreAwarded;
    negativeApplied;
    executionTimeMs;
    memoryUsedKb;
    submittedAt;
    isLocked;
};
exports.TechCodingAttemptQuestion = TechCodingAttemptQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechCodingAttemptQuestion.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechCodingAttempt, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "coding_attempt_id" }),
    __metadata("design:type", TechCodingAttempt)
], TechCodingAttemptQuestion.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.attempt),
    __metadata("design:type", String)
], TechCodingAttemptQuestion.prototype, "attemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechCodingQuestion, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "coding_question_id" }),
    __metadata("design:type", TechCodingQuestion)
], TechCodingAttemptQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.question),
    __metadata("design:type", String)
], TechCodingAttemptQuestion.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechCodingAttemptQuestion.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "language", type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_code", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "submittedCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "judge_input_ref", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "judgeInputRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "judge_output_ref", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "judgeOutputRef", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "compile_status",
        type: "enum",
        enum: enums_1.TechCompileStatus,
        enumName: "tech_compile_status",
        nullable: true,
    }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "compileStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "run_status",
        type: "enum",
        enum: enums_1.TechRunStatus,
        enumName: "tech_run_status",
        nullable: true,
    }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "runStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "judge_result_json", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "judgeResultJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_correct", type: "boolean", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "isCorrect", void 0);
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
], TechCodingAttemptQuestion.prototype, "scoreAwarded", void 0);
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
], TechCodingAttemptQuestion.prototype, "negativeApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "execution_time_ms", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "executionTimeMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "memory_used_kb", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "memoryUsedKb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechCodingAttemptQuestion.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_locked", type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TechCodingAttemptQuestion.prototype, "isLocked", void 0);
exports.TechCodingAttemptQuestion = TechCodingAttemptQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_coding_attempt_questions" }),
    (0, typeorm_1.Unique)("uq_coding_attempt_question", ["attempt", "question"])
], TechCodingAttemptQuestion);
