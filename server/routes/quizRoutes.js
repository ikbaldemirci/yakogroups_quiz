import express from "express";
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deactivateQuiz,
  deletePermanentQuiz,
} from "../controllers/quizController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createQuiz);
router.get("/", protect, getQuizzes);
router.get("/:id", getQuizById);
router.put("/:id", protect, updateQuiz);
router.delete("/:id", protect, deactivateQuiz);
router.delete("/hard/:id", protect, deletePermanentQuiz);

export default router;
