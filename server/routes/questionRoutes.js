import express from "express";

import {
  createQuestion,
  getQuestionsByQuiz,
  updateQuestion,
  deleteQuestion,
  getQuestionByQuizAndIndex,
} from "../controllers/questionController.js";

const router = express.Router();

router.get("/", getQuestionsByQuiz);
router.post("/", createQuestion);
router.get("/quiz/:quizId", getQuestionsByQuiz);
router.get("/:quizId/:index", getQuestionByQuizAndIndex);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

export default router;
