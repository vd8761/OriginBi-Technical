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
exports.TechAptitudeAttemptQuestionOption = exports.TechAptitudeAttemptQuestion = exports.TechAptitudeAttempt = exports.TechAptitudeOption = exports.TechAptitudeQuestion = void 0;
const typeorm_1 = require("typeorm");
const assessment_1 = require("./assessment");
const enums_1 = require("./enums");
const transformers_1 = require("./transformers");
const UserEntity_1 = require("./UserEntity");
let TechAptitudeQuestion = class TechAptitudeQuestion {
    aptitudeQuestionId;
    assessment;
    assessmentId;
    subcategory;
    difficulty;
    questionText;
    imageUrl;
    imageMetadata;
    correctOption;
    correctOptionId;
    marks;
    negativeMarks;
    explanation;
    status;
    createdAt;
    updatedAt;
    options;
};
exports.TechAptitudeQuestion = TechAptitudeQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "aptitude_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechAptitudeQuestion.prototype, "aptitudeQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechAptitudeQuestion.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.assessment),
    __metadata("design:type", String)
], TechAptitudeQuestion.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "subcategory", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechAptitudeQuestion.prototype, "subcategory", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "difficulty",
        type: "enum",
        enum: enums_1.TechDifficulty,
        enumName: "tech_difficulty",
    }),
    __metadata("design:type", String)
], TechAptitudeQuestion.prototype, "difficulty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "question_text", type: "text" }),
    __metadata("design:type", String)
], TechAptitudeQuestion.prototype, "questionText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "image_url", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeQuestion.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "image_metadata", type: "json", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeQuestion.prototype, "imageMetadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "correct_option_id" }),
    __metadata("design:type", Object)
], TechAptitudeQuestion.prototype, "correctOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.correctOption),
    __metadata("design:type", Object)
], TechAptitudeQuestion.prototype, "correctOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechAptitudeQuestion.prototype, "marks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechAptitudeQuestion.prototype, "negativeMarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "explanation", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeQuestion.prototype, "explanation", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechQuestionStatus,
        enumName: "tech_question_status",
    }),
    __metadata("design:type", String)
], TechAptitudeQuestion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeQuestion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeQuestion.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechAptitudeOption, (option) => option.question),
    __metadata("design:type", Array)
], TechAptitudeQuestion.prototype, "options", void 0);
exports.TechAptitudeQuestion = TechAptitudeQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_aptitude_questions" })
], TechAptitudeQuestion);
let TechAptitudeOption = class TechAptitudeOption {
    optionId;
    question;
    questionId;
    optionText;
    createdAt;
};
exports.TechAptitudeOption = TechAptitudeOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechAptitudeOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "aptitude_question_id" }),
    __metadata("design:type", TechAptitudeQuestion)
], TechAptitudeOption.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((option) => option.question),
    __metadata("design:type", String)
], TechAptitudeOption.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "option_text", type: "text" }),
    __metadata("design:type", String)
], TechAptitudeOption.prototype, "optionText", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeOption.prototype, "createdAt", void 0);
exports.TechAptitudeOption = TechAptitudeOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_aptitude_options" })
], TechAptitudeOption);
let TechAptitudeAttempt = class TechAptitudeAttempt {
    aptitudeAttemptId;
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
exports.TechAptitudeAttempt = TechAptitudeAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "aptitude_attempt_id", type: "bigint" }),
    __metadata("design:type", String)
], TechAptitudeAttempt.prototype, "aptitudeAttemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechAptitudeAttempt.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.assessment),
    __metadata("design:type", String)
], TechAptitudeAttempt.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserEntity_1.UserEntity, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", UserEntity_1.UserEntity)
], TechAptitudeAttempt.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.user),
    __metadata("design:type", String)
], TechAptitudeAttempt.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "attempt_token", type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], TechAptitudeAttempt.prototype, "attemptToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "shuffle_seed", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechAptitudeAttempt.prototype, "shuffleSeed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechAttemptStatus,
        enumName: "tech_attempt_status",
    }),
    __metadata("design:type", String)
], TechAptitudeAttempt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "started_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeAttempt.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "expires_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeAttempt.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeAttempt.prototype, "submittedAt", void 0);
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
], TechAptitudeAttempt.prototype, "totalScore", void 0);
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
], TechAptitudeAttempt.prototype, "positiveScore", void 0);
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
], TechAptitudeAttempt.prototype, "negativeScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "time_taken_seconds", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeAttempt.prototype, "timeTakenSeconds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeAttempt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAptitudeAttempt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechAptitudeAttemptQuestion, (question) => question.attempt),
    __metadata("design:type", Array)
], TechAptitudeAttempt.prototype, "questions", void 0);
exports.TechAptitudeAttempt = TechAptitudeAttempt = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_aptitude_attempts" })
], TechAptitudeAttempt);
let TechAptitudeAttemptQuestion = class TechAptitudeAttemptQuestion {
    attemptQuestionId;
    attempt;
    attemptId;
    question;
    questionId;
    displayOrder;
    selectedOption;
    selectedOptionId;
    isCorrect;
    scoreAwarded;
    negativeApplied;
    answeredAt;
    isLocked;
    options;
};
exports.TechAptitudeAttemptQuestion = TechAptitudeAttemptQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechAptitudeAttemptQuestion.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeAttempt, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "aptitude_attempt_id" }),
    __metadata("design:type", TechAptitudeAttempt)
], TechAptitudeAttemptQuestion.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.attempt),
    __metadata("design:type", String)
], TechAptitudeAttemptQuestion.prototype, "attemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeQuestion, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "aptitude_question_id" }),
    __metadata("design:type", TechAptitudeQuestion)
], TechAptitudeAttemptQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.question),
    __metadata("design:type", String)
], TechAptitudeAttemptQuestion.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechAptitudeAttemptQuestion.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "selected_option_id" }),
    __metadata("design:type", Object)
], TechAptitudeAttemptQuestion.prototype, "selectedOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.selectedOption),
    __metadata("design:type", Object)
], TechAptitudeAttemptQuestion.prototype, "selectedOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_correct", type: "boolean", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeAttemptQuestion.prototype, "isCorrect", void 0);
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
], TechAptitudeAttemptQuestion.prototype, "scoreAwarded", void 0);
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
], TechAptitudeAttemptQuestion.prototype, "negativeApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "answered_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechAptitudeAttemptQuestion.prototype, "answeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_locked", type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TechAptitudeAttemptQuestion.prototype, "isLocked", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechAptitudeAttemptQuestionOption, (option) => option.attemptQuestion),
    __metadata("design:type", Array)
], TechAptitudeAttemptQuestion.prototype, "options", void 0);
exports.TechAptitudeAttemptQuestion = TechAptitudeAttemptQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_aptitude_attempt_questions" }),
    (0, typeorm_1.Unique)("uq_aptitude_attempt_question", ["attempt", "question"])
], TechAptitudeAttemptQuestion);
let TechAptitudeAttemptQuestionOption = class TechAptitudeAttemptQuestionOption {
    attemptQuestionOptionId;
    attemptQuestion;
    attemptQuestionId;
    option;
    optionId;
    displayOrder;
};
exports.TechAptitudeAttemptQuestionOption = TechAptitudeAttemptQuestionOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechAptitudeAttemptQuestionOption.prototype, "attemptQuestionOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeAttemptQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "attempt_question_id" }),
    __metadata("design:type", TechAptitudeAttemptQuestion)
], TechAptitudeAttemptQuestionOption.prototype, "attemptQuestion", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.attemptQuestion),
    __metadata("design:type", String)
], TechAptitudeAttemptQuestionOption.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechAptitudeOption, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "option_id" }),
    __metadata("design:type", TechAptitudeOption)
], TechAptitudeAttemptQuestionOption.prototype, "option", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.option),
    __metadata("design:type", String)
], TechAptitudeAttemptQuestionOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechAptitudeAttemptQuestionOption.prototype, "displayOrder", void 0);
exports.TechAptitudeAttemptQuestionOption = TechAptitudeAttemptQuestionOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_aptitude_attempt_question_options" }),
    (0, typeorm_1.Unique)("uq_aptitude_attempt_option", ["attemptQuestion", "option"]),
    (0, typeorm_1.Unique)("uq_aptitude_attempt_option_order", ["attemptQuestion", "displayOrder"])
], TechAptitudeAttemptQuestionOption);
