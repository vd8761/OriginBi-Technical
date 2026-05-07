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
exports.AdminQuestionController = void 0;
const common_1 = require("@nestjs/common");
const admin_question_service_1 = require("../services/admin-question.service");
let AdminQuestionController = class AdminQuestionController {
    adminQuestionService;
    constructor(adminQuestionService) {
        this.adminQuestionService = adminQuestionService;
    }
    async listAssessments(module) {
        const data = await this.adminQuestionService.listAssessments(module);
        return { data };
    }
    // ─── Generic Question Routes ──────────────────────────────────────────────────
    async listQuestions(module, assessmentId, category, subcategory, status, search, mode) {
        const data = await this.adminQuestionService.listQuestions(module, {
            assessmentId: assessmentId ? Number(assessmentId) : undefined,
            category: category || subcategory,
            status,
            search,
            mode,
        });
        return { data, total: data.length };
    }
    async getQuestion(module, id) {
        const data = await this.adminQuestionService.getQuestion(module, Number(id));
        return { data };
    }
    async createQuestion(module, body) {
        const data = await this.adminQuestionService.createQuestion(module, body);
        return { message: 'Question created', data };
    }
    async updateQuestion(module, id, body) {
        const data = await this.adminQuestionService.updateQuestion(module, Number(id), body);
        return { message: 'Question updated', data };
    }
    async clearQuestions(module, mode) {
        return await this.adminQuestionService.clearQuestions(module, mode);
    }
    async deleteQuestion(module, id) {
        return await this.adminQuestionService.deleteQuestion(module, Number(id));
    }
    async bulkImportQuestions(module, body) {
        const result = await this.adminQuestionService.bulkImportQuestions(module, body);
        return {
            message: `${result.imported} of ${result.total} questions imported`,
            ...result,
        };
    }
};
exports.AdminQuestionController = AdminQuestionController;
__decorate([
    (0, common_1.Get)('assessments'),
    __param(0, (0, common_1.Query)('module')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "listAssessments", null);
__decorate([
    (0, common_1.Get)(':module/questions'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Query)('assessmentId')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('subcategory')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('search')),
    __param(6, (0, common_1.Query)('mode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "listQuestions", null);
__decorate([
    (0, common_1.Get)(':module/questions/:id'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "getQuestion", null);
__decorate([
    (0, common_1.Post)(':module/questions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Put)(':module/questions/:id'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "updateQuestion", null);
__decorate([
    (0, common_1.Delete)(':module/questions'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Query)('mode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "clearQuestions", null);
__decorate([
    (0, common_1.Delete)(':module/questions/:id'),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "deleteQuestion", null);
__decorate([
    (0, common_1.Post)(':module/questions/bulk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('module')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminQuestionController.prototype, "bulkImportQuestions", null);
exports.AdminQuestionController = AdminQuestionController = __decorate([
    (0, common_1.Controller)('assessment/admin'),
    __metadata("design:paramtypes", [admin_question_service_1.AdminQuestionService])
], AdminQuestionController);
