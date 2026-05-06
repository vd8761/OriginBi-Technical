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
exports.TechAssessment = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("./enums");
const transformers_1 = require("./transformers");
const UserEntity_1 = require("./UserEntity");
let TechAssessment = class TechAssessment {
    assessmentId;
    assessmentCode;
    assessmentName;
    moduleType;
    totalTimeMinutes;
    totalQuestions;
    shuffleQuestions;
    shuffleOptions;
    negativeMarkEnabled;
    negativeMarkValue;
    status;
    createdBy;
    createdById;
    createdAt;
    updatedAt;
};
exports.TechAssessment = TechAssessment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { name: "assessment_id", type: "bigint" }),
    __metadata("design:type", String)
], TechAssessment.prototype, "assessmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "assessment_code", type: "varchar", length: 50, unique: true }),
    __metadata("design:type", String)
], TechAssessment.prototype, "assessmentCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "assessment_name", type: "varchar", length: 150 }),
    __metadata("design:type", String)
], TechAssessment.prototype, "assessmentName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "module_type",
        type: "enum",
        enum: enums_1.TechModuleType,
        enumName: "tech_module_type",
    }),
    __metadata("design:type", String)
], TechAssessment.prototype, "moduleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_time_minutes", type: "int" }),
    __metadata("design:type", Number)
], TechAssessment.prototype, "totalTimeMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total_questions", type: "int" }),
    __metadata("design:type", Number)
], TechAssessment.prototype, "totalQuestions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "shuffle_questions", type: "boolean" }),
    __metadata("design:type", Boolean)
], TechAssessment.prototype, "shuffleQuestions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "shuffle_options", type: "boolean" }),
    __metadata("design:type", Boolean)
], TechAssessment.prototype, "shuffleOptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "negative_mark_enabled", type: "boolean" }),
    __metadata("design:type", Boolean)
], TechAssessment.prototype, "negativeMarkEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "negative_mark_value",
        type: "decimal",
        precision: 5,
        scale: 2,
        nullable: true,
        transformer: transformers_1.numericTransformer,
    }),
    __metadata("design:type", Object)
], TechAssessment.prototype, "negativeMarkValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "status",
        type: "enum",
        enum: enums_1.TechAssessmentStatus,
        enumName: "tech_assessment_status",
    }),
    __metadata("design:type", String)
], TechAssessment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserEntity_1.UserEntity, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "created_by" }),
    __metadata("design:type", UserEntity_1.UserEntity)
], TechAssessment.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.RelationId)((assessment) => assessment.createdBy),
    __metadata("design:type", String)
], TechAssessment.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAssessment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at", type: "timestamp" }),
    __metadata("design:type", Date)
], TechAssessment.prototype, "updatedAt", void 0);
exports.TechAssessment = TechAssessment = __decorate([
    (0, typeorm_1.Entity)({ name: "tech_assessments" }),
    (0, typeorm_1.Index)("idx_tech_assessments_module", ["moduleType"]),
    (0, typeorm_1.Check)("chk_tech_assessments_negative_mark", "((negative_mark_enabled = false AND negative_mark_value IS NULL) OR (negative_mark_enabled = true AND negative_mark_value IS NOT NULL))")
], TechAssessment);
