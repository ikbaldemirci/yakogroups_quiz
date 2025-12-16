import Question from "../models/Question.js";
import Quiz from "../models/Quiz.js";

export const createQuestion = async (req, res) => {
  try {
    const {
      quizId,
      text,
      options,
      correctOptionIndex,
      points = 100,
      order,
      durationSeconds,
      isAiGenerated,
      image,
    } = req.body;

    if (
      !quizId ||
      !text ||
      !options ||
      correctOptionIndex === undefined ||
      order === undefined ||
      !durationSeconds
    ) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isActive) {
      return res.status(404).json({
        message: "Quiz not found or inactive",
      });
    }

    const question = await Question.create({
      quiz: quizId,
      text,
      options,
      correctOptionIndex,
      points,
      order,
      durationSeconds,
      isAiGenerated,
      image,
    });

    quiz.totalScore += points;
    await quiz.save();

    res.status(201).json(question);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors).map((val) => val.message).join(", "),
      });
    }
    res.status(500).json({
      message: "Failed to create question",
      error: error.message,
    });
  }
};

export const getQuestionsByQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const questions = await Question.find({ quiz: quizId }).sort({ order: 1 });

    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch questions",
    });
  }
};

export const getQuestionByQuizAndIndex = async (req, res) => {
  try {
    const { quizId, index } = req.params;

    const question = await Question.findOne({
      quiz: quizId,
      order: Number(index) + 1,
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json(question);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch question" });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const existingQuestion = await Question.findById(req.params.id);
    if (!existingQuestion) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const oldPoints = existingQuestion.points;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (req.body.points !== undefined && req.body.points !== oldPoints) {
      const quiz = await Quiz.findById(existingQuestion.quiz);
      quiz.totalScore += req.body.points - oldPoints;
      await quiz.save();
    }

    res.status(200).json(updatedQuestion);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update question",
      error: error.message,
    });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const quiz = await Quiz.findById(question.quiz);

    quiz.totalScore -= question.points;
    await quiz.save();

    await question.deleteOne();

    res.status(200).json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete question",
    });
  }
};
