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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentController = void 0;
const common_1 = require("@nestjs/common");
const assessment_service_1 = require("../services/assessment.service");
let AssessmentController = class AssessmentController {
    assessmentService;
    constructor(assessmentService) {
        this.assessmentService = assessmentService;
    }
    async startAttempt(module, body) {
        // Note: module might be 'aptitude', 'mnc', 'grammar', or 'role'
        const data = await this.assessmentService.startAttempt(module, body);
        return data;
    }
    async getAttemptQuestions(token) {
        // Currently getAttemptQuestions is still a bit aptitude-specific, 
        // but startAttempt already returns questions which is what the frontend needs.
        const data = await this.assessmentService.getAttemptQuestions(token);
        return data;
    }
    async submitAttempt(module, token, body) {
        const data = await this.assessmentService.submitAttempt(module, token, body);
        return data;
    }
};
exports.AssessmentController = AssessmentController;
__decorate([
    (0, common_1.Post)(':module/attempts'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AssessmentController.prototype, "startAttempt", null);
__decorate([
    (0, common_1.Get)(':module/attempts/:token/questions'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AssessmentController.prototype, "getAttemptQuestions", null);
__decorate([
    (0, common_1.Post)(':module/attempts/:token/submit'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AssessmentController.prototype, "submitAttempt", null);
exports.AssessmentController = AssessmentController = __decorate([
    (0, common_1.Controller)('assessment'),
    __metadata("design:paramtypes", [assessment_service_1.AssessmentService])
], AssessmentController);
