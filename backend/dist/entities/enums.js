"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechRoleQuestionType = exports.TechRunStatus = exports.TechCompileStatus = exports.TechGrammarTaskType = exports.TechAttemptStatus = exports.TechDifficulty = exports.TechQuestionStatus = exports.TechAssessmentStatus = exports.TechModuleType = void 0;
var TechModuleType;
(function (TechModuleType) {
    TechModuleType["aptitude"] = "aptitude";
    TechModuleType["grammar"] = "grammar";
    TechModuleType["coding"] = "coding";
    TechModuleType["mnc"] = "mnc";
    TechModuleType["role"] = "role";
})(TechModuleType || (exports.TechModuleType = TechModuleType = {}));
var TechAssessmentStatus;
(function (TechAssessmentStatus) {
    TechAssessmentStatus["draft"] = "draft";
    TechAssessmentStatus["active"] = "active";
    TechAssessmentStatus["closed"] = "closed";
})(TechAssessmentStatus || (exports.TechAssessmentStatus = TechAssessmentStatus = {}));
var TechQuestionStatus;
(function (TechQuestionStatus) {
    TechQuestionStatus["active"] = "active";
    TechQuestionStatus["inactive"] = "inactive";
})(TechQuestionStatus || (exports.TechQuestionStatus = TechQuestionStatus = {}));
var TechDifficulty;
(function (TechDifficulty) {
    TechDifficulty["easy"] = "easy";
    TechDifficulty["medium"] = "medium";
    TechDifficulty["hard"] = "hard";
})(TechDifficulty || (exports.TechDifficulty = TechDifficulty = {}));
var TechAttemptStatus;
(function (TechAttemptStatus) {
    TechAttemptStatus["in_progress"] = "in_progress";
    TechAttemptStatus["submitted"] = "submitted";
    TechAttemptStatus["evaluated"] = "evaluated";
    TechAttemptStatus["expired"] = "expired";
})(TechAttemptStatus || (exports.TechAttemptStatus = TechAttemptStatus = {}));
var TechGrammarTaskType;
(function (TechGrammarTaskType) {
    TechGrammarTaskType["mcq"] = "mcq";
    TechGrammarTaskType["reading"] = "reading";
    TechGrammarTaskType["listening_mcq"] = "listening_mcq";
    TechGrammarTaskType["reading_mcq"] = "reading_mcq";
    TechGrammarTaskType["speaking"] = "speaking";
    TechGrammarTaskType["writing"] = "writing";
})(TechGrammarTaskType || (exports.TechGrammarTaskType = TechGrammarTaskType = {}));
var TechCompileStatus;
(function (TechCompileStatus) {
    TechCompileStatus["success"] = "success";
    TechCompileStatus["compile_error"] = "compile_error";
    TechCompileStatus["not_run"] = "not_run";
})(TechCompileStatus || (exports.TechCompileStatus = TechCompileStatus = {}));
var TechRunStatus;
(function (TechRunStatus) {
    TechRunStatus["passed"] = "passed";
    TechRunStatus["failed"] = "failed";
    TechRunStatus["partial"] = "partial";
    TechRunStatus["not_run"] = "not_run";
})(TechRunStatus || (exports.TechRunStatus = TechRunStatus = {}));
var TechRoleQuestionType;
(function (TechRoleQuestionType) {
    TechRoleQuestionType["mcq"] = "mcq";
    TechRoleQuestionType["scenario"] = "scenario";
})(TechRoleQuestionType || (exports.TechRoleQuestionType = TechRoleQuestionType = {}));
