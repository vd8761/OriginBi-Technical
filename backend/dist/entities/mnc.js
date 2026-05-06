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
exports.TechMncAttemptQuestionOption = exports.TechMncAttemptQuestion = exports.TechMncAttempt = exports.TechMncOption = exports.TechMncQuestion = void 0;
const typeorm_1 = require("typeorm");
const assessment_1 = require("./assessment");
const enums_1 = require("./enums");
const transformers_1 = require("./transformers");
const UserEntity_1 = require("./UserEntity");
let TechMncQuestion = class TechMncQuestion {
    mncQuestionId;
    assessment;
    assessmentId;
    topicGroup;
    difficulty;
    questionText;
    correctOption;
    correctOptionId;
    marks;
    negativeMarks;
    status;
    createdAt;
    updatedAt;
    options;
};
exports.TechMncQuestion = TechMncQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "mnc_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechMncQuestion.prototype, "mncQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechMncQuestion.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.assessment),
    __metadata("design:type", String)
], TechMncQuestion.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "topic_group", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechMncQuestion.prototype, "topicGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "difficulty",
        type: "enum",
        enum: enums_1.TechDifficulty,
        enumName: "tech_difficulty",
    }),
    __metadata("design:type", String)
], TechMncQuestion.prototype, "difficulty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "question_text", type: "text" }),
    __metadata("design:type", String)
], TechMncQuestion.prototype, "questionText", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "correct_option_id" }),
    __metadata("design:type", Object)
], TechMncQuestion.prototype, "correctOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.correctOption),
    __metadata("design:type", Object)
], TechMncQuestion.prototype, "correctOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechMncQuestion.prototype, "marks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechMncQuestion.prototype, "negativeMarks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechQuestionStatus,
        enumName: "tech_question_status",
    }),
    __metadata("design:type", String)
], TechMncQuestion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncQuestion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncQuestion.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechMncOption, (option) => option.question),
    __metadata("design:type", Array)
], TechMncQuestion.prototype, "options", void 0);
exports.TechMncQuestion = TechMncQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_mnc_questions" })
], TechMncQuestion);
let TechMncOption = class TechMncOption {
    optionId;
    question;
    questionId;
    optionText;
    createdAt;
};
exports.TechMncOption = TechMncOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechMncOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "mnc_question_id" }),
    __metadata("design:type", TechMncQuestion)
], TechMncOption.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((option) => option.question),
    __metadata("design:type", String)
], TechMncOption.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "option_text", type: "text" }),
    __metadata("design:type", String)
], TechMncOption.prototype, "optionText", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncOption.prototype, "createdAt", void 0);
exports.TechMncOption = TechMncOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_mnc_options" })
], TechMncOption);
let TechMncAttempt = class TechMncAttempt {
    mncAttemptId;
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
exports.TechMncAttempt = TechMncAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "mnc_attempt_id", type: "bigint" }),
    __metadata("design:type", String)
], TechMncAttempt.prototype, "mncAttemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechMncAttempt.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.assessment),
    __metadata("design:type", String)
], TechMncAttempt.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserEntity_1.UserEntity, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", UserEntity_1.UserEntity)
], TechMncAttempt.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.user),
    __metadata("design:type", String)
], TechMncAttempt.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "attempt_token", type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], TechMncAttempt.prototype, "attemptToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "shuffle_seed", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechMncAttempt.prototype, "shuffleSeed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechAttemptStatus,
        enumName: "tech_attempt_status",
    }),
    __metadata("design:type", String)
], TechMncAttempt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "started_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncAttempt.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "expires_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncAttempt.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechMncAttempt.prototype, "submittedAt", void 0);
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
], TechMncAttempt.prototype, "totalScore", void 0);
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
], TechMncAttempt.prototype, "positiveScore", void 0);
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
], TechMncAttempt.prototype, "negativeScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "time_taken_seconds", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechMncAttempt.prototype, "timeTakenSeconds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncAttempt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechMncAttempt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechMncAttemptQuestion, (question) => question.attempt),
    __metadata("design:type", Array)
], TechMncAttempt.prototype, "questions", void 0);
exports.TechMncAttempt = TechMncAttempt = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_mnc_attempts" })
], TechMncAttempt);
let TechMncAttemptQuestion = class TechMncAttemptQuestion {
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
exports.TechMncAttemptQuestion = TechMncAttemptQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechMncAttemptQuestion.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncAttempt, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "mnc_attempt_id" }),
    __metadata("design:type", TechMncAttempt)
], TechMncAttemptQuestion.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.attempt),
    __metadata("design:type", String)
], TechMncAttemptQuestion.prototype, "attemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncQuestion, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "mnc_question_id" }),
    __metadata("design:type", TechMncQuestion)
], TechMncAttemptQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.question),
    __metadata("design:type", String)
], TechMncAttemptQuestion.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechMncAttemptQuestion.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "selected_option_id" }),
    __metadata("design:type", Object)
], TechMncAttemptQuestion.prototype, "selectedOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.selectedOption),
    __metadata("design:type", Object)
], TechMncAttemptQuestion.prototype, "selectedOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_correct", type: "boolean", nullable: true }),
    __metadata("design:type", Object)
], TechMncAttemptQuestion.prototype, "isCorrect", void 0);
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
], TechMncAttemptQuestion.prototype, "scoreAwarded", void 0);
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
], TechMncAttemptQuestion.prototype, "negativeApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "answered_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechMncAttemptQuestion.prototype, "answeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_locked", type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TechMncAttemptQuestion.prototype, "isLocked", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechMncAttemptQuestionOption, (option) => option.attemptQuestion),
    __metadata("design:type", Array)
], TechMncAttemptQuestion.prototype, "options", void 0);
exports.TechMncAttemptQuestion = TechMncAttemptQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_mnc_attempt_questions" }),
    (0, typeorm_1.Unique)("uq_mnc_attempt_question", ["attempt", "question"])
], TechMncAttemptQuestion);
let TechMncAttemptQuestionOption = class TechMncAttemptQuestionOption {
    attemptQuestionOptionId;
    attemptQuestion;
    attemptQuestionId;
    option;
    optionId;
    displayOrder;
};
exports.TechMncAttemptQuestionOption = TechMncAttemptQuestionOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechMncAttemptQuestionOption.prototype, "attemptQuestionOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncAttemptQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "attempt_question_id" }),
    __metadata("design:type", TechMncAttemptQuestion)
], TechMncAttemptQuestionOption.prototype, "attemptQuestion", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.attemptQuestion),
    __metadata("design:type", String)
], TechMncAttemptQuestionOption.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechMncOption, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "option_id" }),
    __metadata("design:type", TechMncOption)
], TechMncAttemptQuestionOption.prototype, "option", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.option),
    __metadata("design:type", String)
], TechMncAttemptQuestionOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechMncAttemptQuestionOption.prototype, "displayOrder", void 0);
exports.TechMncAttemptQuestionOption = TechMncAttemptQuestionOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_mnc_attempt_question_options" }),
    (0, typeorm_1.Unique)("uq_mnc_attempt_option", ["attemptQuestion", "option"]),
    (0, typeorm_1.Unique)("uq_mnc_attempt_option_order", ["attemptQuestion", "displayOrder"])
], TechMncAttemptQuestionOption);
