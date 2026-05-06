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
exports.TechRoleAttemptQuestionOption = exports.TechRoleAttemptQuestion = exports.TechRoleAttempt = exports.TechRoleOption = exports.TechRoleQuestion = void 0;
const typeorm_1 = require("typeorm");
const assessment_1 = require("./assessment");
const enums_1 = require("./enums");
const transformers_1 = require("./transformers");
const UserEntity_1 = require("./UserEntity");
let TechRoleQuestion = class TechRoleQuestion {
    roleQuestionId;
    assessment;
    assessmentId;
    domain;
    questionType;
    questionText;
    scenarioContext;
    correctOption;
    correctOptionId;
    marks;
    negativeMarks;
    status;
    createdAt;
    updatedAt;
    options;
};
exports.TechRoleQuestion = TechRoleQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "role_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechRoleQuestion.prototype, "roleQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechRoleQuestion.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.assessment),
    __metadata("design:type", String)
], TechRoleQuestion.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "domain", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechRoleQuestion.prototype, "domain", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "question_type",
        type: "enum",
        enum: enums_1.TechRoleQuestionType,
        enumName: "tech_role_question_type",
    }),
    __metadata("design:type", String)
], TechRoleQuestion.prototype, "questionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "question_text", type: "text" }),
    __metadata("design:type", String)
], TechRoleQuestion.prototype, "questionText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "scenario_context", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TechRoleQuestion.prototype, "scenarioContext", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "correct_option_id" }),
    __metadata("design:type", Object)
], TechRoleQuestion.prototype, "correctOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((question) => question.correctOption),
    __metadata("design:type", Object)
], TechRoleQuestion.prototype, "correctOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechRoleQuestion.prototype, "marks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], TechRoleQuestion.prototype, "negativeMarks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechQuestionStatus,
        enumName: "tech_question_status",
    }),
    __metadata("design:type", String)
], TechRoleQuestion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleQuestion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleQuestion.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechRoleOption, (option) => option.question),
    __metadata("design:type", Array)
], TechRoleQuestion.prototype, "options", void 0);
exports.TechRoleQuestion = TechRoleQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_role_questions" })
], TechRoleQuestion);
let TechRoleOption = class TechRoleOption {
    optionId;
    question;
    questionId;
    optionText;
    createdAt;
};
exports.TechRoleOption = TechRoleOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechRoleOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "role_question_id" }),
    __metadata("design:type", TechRoleQuestion)
], TechRoleOption.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((option) => option.question),
    __metadata("design:type", String)
], TechRoleOption.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "option_text", type: "text" }),
    __metadata("design:type", String)
], TechRoleOption.prototype, "optionText", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleOption.prototype, "createdAt", void 0);
exports.TechRoleOption = TechRoleOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_role_options" })
], TechRoleOption);
let TechRoleAttempt = class TechRoleAttempt {
    roleAttemptId;
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
exports.TechRoleAttempt = TechRoleAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "role_attempt_id", type: "bigint" }),
    __metadata("design:type", String)
], TechRoleAttempt.prototype, "roleAttemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => assessment_1.TechAssessment, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "assessment_id" }),
    __metadata("design:type", assessment_1.TechAssessment)
], TechRoleAttempt.prototype, "assessment", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.assessment),
    __metadata("design:type", String)
], TechRoleAttempt.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserEntity_1.UserEntity, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", UserEntity_1.UserEntity)
], TechRoleAttempt.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attempt) => attempt.user),
    __metadata("design:type", String)
], TechRoleAttempt.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "attempt_token", type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], TechRoleAttempt.prototype, "attemptToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "shuffle_seed", type: "varchar", length: 100 }),
    __metadata("design:type", String)
], TechRoleAttempt.prototype, "shuffleSeed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechAttemptStatus,
        enumName: "tech_attempt_status",
    }),
    __metadata("design:type", String)
], TechRoleAttempt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "started_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleAttempt.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "expires_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleAttempt.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "submitted_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechRoleAttempt.prototype, "submittedAt", void 0);
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
], TechRoleAttempt.prototype, "totalScore", void 0);
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
], TechRoleAttempt.prototype, "positiveScore", void 0);
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
], TechRoleAttempt.prototype, "negativeScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "time_taken_seconds", type: "int", nullable: true }),
    __metadata("design:type", Object)
], TechRoleAttempt.prototype, "timeTakenSeconds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleAttempt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechRoleAttempt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechRoleAttemptQuestion, (question) => question.attempt),
    __metadata("design:type", Array)
], TechRoleAttempt.prototype, "questions", void 0);
exports.TechRoleAttempt = TechRoleAttempt = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_role_attempts" })
], TechRoleAttempt);
let TechRoleAttemptQuestion = class TechRoleAttemptQuestion {
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
exports.TechRoleAttemptQuestion = TechRoleAttemptQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_id", type: "bigint" }),
    __metadata("design:type", String)
], TechRoleAttemptQuestion.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleAttempt, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "role_attempt_id" }),
    __metadata("design:type", TechRoleAttempt)
], TechRoleAttemptQuestion.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.attempt),
    __metadata("design:type", String)
], TechRoleAttemptQuestion.prototype, "attemptId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleQuestion, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "role_question_id" }),
    __metadata("design:type", TechRoleQuestion)
], TechRoleAttemptQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.question),
    __metadata("design:type", String)
], TechRoleAttemptQuestion.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechRoleAttemptQuestion.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "selected_option_id" }),
    __metadata("design:type", Object)
], TechRoleAttemptQuestion.prototype, "selectedOption", void 0);
__decorate([
    (0, typeorm_1.RelationId)((attemptQuestion) => attemptQuestion.selectedOption),
    __metadata("design:type", Object)
], TechRoleAttemptQuestion.prototype, "selectedOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_correct", type: "boolean", nullable: true }),
    __metadata("design:type", Object)
], TechRoleAttemptQuestion.prototype, "isCorrect", void 0);
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
], TechRoleAttemptQuestion.prototype, "scoreAwarded", void 0);
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
], TechRoleAttemptQuestion.prototype, "negativeApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "answered_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], TechRoleAttemptQuestion.prototype, "answeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_locked", type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TechRoleAttemptQuestion.prototype, "isLocked", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TechRoleAttemptQuestionOption, (option) => option.attemptQuestion),
    __metadata("design:type", Array)
], TechRoleAttemptQuestion.prototype, "options", void 0);
exports.TechRoleAttemptQuestion = TechRoleAttemptQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_role_attempt_questions" }),
    (0, typeorm_1.Unique)("uq_role_attempt_question", ["attempt", "question"])
], TechRoleAttemptQuestion);
let TechRoleAttemptQuestionOption = class TechRoleAttemptQuestionOption {
    attemptQuestionOptionId;
    attemptQuestion;
    attemptQuestionId;
    option;
    optionId;
    displayOrder;
};
exports.TechRoleAttemptQuestionOption = TechRoleAttemptQuestionOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "attempt_question_option_id", type: "bigint" }),
    __metadata("design:type", String)
], TechRoleAttemptQuestionOption.prototype, "attemptQuestionOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleAttemptQuestion, { nullable: false, onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "attempt_question_id" }),
    __metadata("design:type", TechRoleAttemptQuestion)
], TechRoleAttemptQuestionOption.prototype, "attemptQuestion", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.attemptQuestion),
    __metadata("design:type", String)
], TechRoleAttemptQuestionOption.prototype, "attemptQuestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TechRoleOption, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "option_id" }),
    __metadata("design:type", TechRoleOption)
], TechRoleAttemptQuestionOption.prototype, "option", void 0);
__decorate([
    (0, typeorm_1.RelationId)((entry) => entry.option),
    __metadata("design:type", String)
], TechRoleAttemptQuestionOption.prototype, "optionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "display_order", type: "int" }),
    __metadata("design:type", Number)
], TechRoleAttemptQuestionOption.prototype, "displayOrder", void 0);
exports.TechRoleAttemptQuestionOption = TechRoleAttemptQuestionOption = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_role_attempt_question_options" }),
    (0, typeorm_1.Unique)("uq_role_attempt_option", ["attemptQuestion", "option"]),
    (0, typeorm_1.Unique)("uq_role_attempt_option_order", ["attemptQuestion", "displayOrder"])
], TechRoleAttemptQuestionOption);
