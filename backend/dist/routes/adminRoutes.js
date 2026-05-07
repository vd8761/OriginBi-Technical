"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminQuestionController_1 = require("../controllers/adminQuestionController");
const router = (0, express_1.Router)();
// Assessment listing (shared)
router.get("/assessments", adminQuestionController_1.listAssessments);
// Aptitude CRUD
router.get("/aptitude/questions", adminQuestionController_1.listAptitudeQuestions);
router.get("/aptitude/questions/:id", adminQuestionController_1.getAptitudeQuestion);
router.post("/aptitude/questions", adminQuestionController_1.createAptitudeQuestion);
router.put("/aptitude/questions/:id", adminQuestionController_1.updateAptitudeQuestion);
router.delete("/aptitude/questions/:id", adminQuestionController_1.deleteAptitudeQuestion);
router.post("/aptitude/questions/bulk", adminQuestionController_1.bulkImportAptitudeQuestions);
exports.default = router;
