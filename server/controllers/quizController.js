import Quiz from "../models/Quiz.js";

export const createQuiz = async (req, res) => {
  try {
    const { title, description, coverImage, durationMinutes } = req.body;

    if (!title || !durationMinutes) {
      return res.status(400).json({
        message: "Title and durationMinutes are required",
      });
    }

    const quiz = await Quiz.create({
      title,
      description,
      coverImage,
      durationMinutes,
    });

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
    const quizzes = await Quiz.find({ isActive: true }).sort({
      createdAt: -1,
    });

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
