import express from "express";
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deactivateQuiz,
  deletePermanentQuiz,
} from "../controllers/quizController.js";

const router = express.Router();

router.post("/", createQuiz);
router.get("/", getQuizzes);
router.get("/:id", getQuizById);
router.put("/:id", updateQuiz);
router.delete("/:id", deactivateQuiz);
router.delete("/hard/:id", deletePermanentQuiz);

export default router;
