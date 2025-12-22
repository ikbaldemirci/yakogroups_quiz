import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

export const createQuiz = async (req, res) => {
  try {
    const { title, description, coverImage } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    const quiz = await Quiz.create({
      title,
      description,
      coverImage,
      totalScore: 0,
      company: req.company._id,
    });

    if (req.body.questions && Array.isArray(req.body.questions)) {
      let totalScore = 0;
      const questionsToCreate = req.body.questions.map((q) => {
        totalScore += q.points || 100;
        return {
          quiz: quiz._id,
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          points: q.points || 100,
          order: q.order,
          durationSeconds: q.durationSeconds,
          isAiGenerated: q.isAiGenerated || false,
          image: q.image || null,
        };
      });

      await Question.insertMany(questionsToCreate);

      quiz.totalScore = totalScore;
      await quiz.save();
    }

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create quiz",
      error: error.message,
    });
  }
};

export const getQuizzes = async (req, res) => {
  try {
    const isSuperAdmin = req.company?.role === "super-admin";
    const filter = isSuperAdmin ? { isActive: true } : { isActive: true, company: req.company._id };

    const quizzes = await Quiz.find(filter)
      .populate("company", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch quizzes",
    });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz || !quiz.isActive) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch quiz",
    });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    if (req.body.questions && Array.isArray(req.body.questions)) {
      await Question.deleteMany({ quiz: quiz._id });

      let totalScore = 0;
      const questionsToCreate = req.body.questions.map((q) => {
        totalScore += q.points || 100;
        return {
          quiz: quiz._id,
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          points: q.points || 100,
          order: q.order,
          durationSeconds: q.durationSeconds,
          isAiGenerated: q.isAiGenerated || false,
          image: q.image || null,
        };
      });

      await Question.insertMany(questionsToCreate);

      quiz.totalScore = totalScore;
      await quiz.save();
    }

    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update quiz",
      error: error.message,
    });
  }
};

export const deactivateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      message: "Quiz deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to deactivate quiz",
    });
  }
};

export const deletePermanentQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ message: "Quiz permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete quiz" });
  }
};
