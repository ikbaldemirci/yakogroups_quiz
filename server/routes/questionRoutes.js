import express from "express";
import {
  createQuestion,
  getQuestionsByQuiz,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questionController.js";

const router = express.Router();

router.post("/", createQuestion);
router.get("/quiz/:quizId", getQuestionsByQuiz);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

export default router;
