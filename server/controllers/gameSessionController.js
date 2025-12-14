import GameSession from "../models/GameSession.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

const generateLobbyCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const calculateScore = (basePoints, remainingTime, totalTime) => {
  if (remainingTime <= 0) return 0;
  return Math.round(basePoints * (remainingTime / totalTime));
};

/* ---------------------------------- */
/* Controllers                        */
/* ---------------------------------- */

export const createGameSession = async (req, res) => {
  try {
    const { quizId, companyId } = req.body;

    if (!quizId || !companyId) {
      return res.status(400).json({
        message: "quizId and companyId are required",
      });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isActive) {
      return res.status(404).json({ message: "Quiz not found or inactive" });
    }

    const session = await GameSession.create({
      quiz: quizId,
      company: companyId,
      lobbyCode: generateLobbyCode(),
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create game session",
      error: error.message,
    });
  }
};

export const joinGameSession = async (req, res) => {
  try {
    const { lobbyCode, nickname } = req.body;

    const session = await GameSession.findOne({ lobbyCode });
    if (!session || session.status !== "waiting") {
      return res.status(404).json({
        message: "Lobby not available",
      });
    }

    const alreadyJoined = session.players.some((p) => p.nickname === nickname);
    if (alreadyJoined) {
      return res.status(409).json({
        message: "Nickname already taken",
      });
    }

    session.players.push({ nickname });
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({
      message: "Failed to join game",
    });
  }
};

export const startGame = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await GameSession.findById(sessionId);
    if (!session || session.status !== "waiting") {
      return res.status(400).json({
        message: "Game cannot be started",
      });
    }

    session.status = "active";
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;

    await session.save();

    res.status(200).json({
      message: "Game started",
      session,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to start game",
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const {
      sessionId,
      nickname,
      questionId,
      selectedOptionIndex,
      remainingTime,
      totalTime,
    } = req.body;

    const session = await GameSession.findById(sessionId);
    if (!session || session.status !== "active") {
      return res.status(400).json({ message: "Game not active" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const player = session.players.find((p) => p.nickname === nickname);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const isCorrect = question.correctOptionIndex === selectedOptionIndex;

    const earnedScore = isCorrect
      ? calculateScore(question.points, remainingTime, totalTime)
      : 0;

    player.score += earnedScore;
    player.answers.push({
      questionId,
      selectedOptionIndex,
      isCorrect,
      earnedScore,
      answeredAt: new Date(),
    });

    await session.save();

    res.status(200).json({
      correct: isCorrect,
      earnedScore,
      totalScore: player.score,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit answer",
    });
  }
};

export const finishGame = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await GameSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.status = "finished";
    session.finishedAt = new Date();

    await session.save();

    res.status(200).json({
      message: "Game finished",
      leaderboard: session.players.sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to finish game",
    });
  }
};
