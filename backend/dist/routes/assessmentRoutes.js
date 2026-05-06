"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessmentController_1 = require("../controllers/assessmentController");
const router = (0, express_1.Router)();
router.get("/questions", assessmentController_1.getQuestions);
router.get("/questions/:id", assessmentController_1.getQuestionById);
router.post("/submit", assessmentController_1.submitCode);
// Aptitude attempt flow
router.post("/aptitude/attempts", assessmentController_1.startAptitudeAttempt);
router.get("/aptitude/attempts/:token", assessmentController_1.getAptitudeAttempt);
router.post("/aptitude/attempts/:token/submit", assessmentController_1.submitAptitudeAttempt);
// Module-specific routes
router.get("/:module/questions", assessmentController_1.getQuestions);
router.get("/:module/questions/:id", assessmentController_1.getQuestionById);
router.post("/:module/submit", assessmentController_1.submitCode);
exports.default = router;
