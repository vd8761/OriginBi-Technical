import { Router } from "express";
import {
	getQuestions,
	getQuestionById,
	submitCode,
	startAptitudeAttempt,
	getAptitudeAttempt,
	submitAptitudeAttempt,
} from "../controllers/assessmentController";

const router = Router();

router.get("/questions", getQuestions);
router.get("/questions/:id", getQuestionById);
router.post("/submit", submitCode);

// Aptitude attempt flow
router.post("/aptitude/attempts", startAptitudeAttempt);
router.get("/aptitude/attempts/:token", getAptitudeAttempt);
router.post("/aptitude/attempts/:token/submit", submitAptitudeAttempt);

// Module-specific routes
router.get("/:module/questions", getQuestions);
router.get("/:module/questions/:id", getQuestionById);
router.post("/:module/submit", submitCode);

export default router;
