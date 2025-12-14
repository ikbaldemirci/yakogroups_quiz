import mongoose from "mongoose";
import GameSession from "../models/GameSession.js";
import Question from "../models/Question.js";
import { io } from "../index.js";

const calculateScore = (basePoints, remainingTime, totalTime) => {
  if (remainingTime <= 0) return 0;
  return Math.round(basePoints * (remainingTime / totalTime));
};

export const gameSocket = () => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    const getCurrentQuestion = async (session) => {
      const questions = await Question.find({ quiz: session.quiz })
        .sort({ order: 1 })
        .lean();
      return questions[session.currentQuestionIndex];
    };

    socket.on("join-lobby", async ({ lobbyCode, nickname }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session) return;

      socket.join(lobbyCode);

      const exists = session.players.some((p) => p.nickname === nickname);

      if (session.status === "waiting" && !exists) {
        session.players.push({ nickname, score: 0, answers: [] });
        await session.save();
        io.to(lobbyCode).emit("players-updated", session.players);
        return;
      }

      io.to(socket.id).emit("players-updated", session.players);
      if (session.status !== "waiting") {
        io.to(socket.id).emit("game-state-sync", {
          status: session.status,
          currentPhase: session.currentPhase,
          currentQuestionIndex: session.currentQuestionIndex,
          currentPresenter: session.currentPresenter,
        });
      }
    });

    socket.on("start-game", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "waiting") return;

      session.status = "active";
      session.startedAt = new Date();
      session.currentQuestionIndex = 0;

      const question = await getCurrentQuestion(session);
      if (question && question.isAiGenerated) {
        session.currentPhase = "wheel";
        session.currentPresenter = null;
      } else {
        session.currentPhase = "question";
        session.currentPresenter = null;
      }

      await session.save();

      io.to(lobbyCode).emit("game-started");

      if (session.currentPhase === "wheel") {
        io.to(lobbyCode).emit("show-wheel");
      } else {
        io.to(lobbyCode).emit("question-changed", {
          index: 0,
          question,
          presenter: null,
        });
      }
    });

    socket.on("spin-wheel", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.currentPhase !== "wheel") return;

      const players = session.players;
      if (players.length === 0) return;
      const winner = players[Math.floor(Math.random() * players.length)];

      session.currentPresenter = winner.nickname;
      await session.save();

      io.to(lobbyCode).emit("wheel-result", {
        winner: winner.nickname,
      });
    });

    socket.on("start-question-after-wheel", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.currentPhase !== "wheel") return;

      session.currentPhase = "question";
      await session.save();

      const question = await getCurrentQuestion(session);
      io.to(lobbyCode).emit("question-changed", {
        index: session.currentQuestionIndex,
        question,
        presenter: session.currentPresenter,
      });
    });

    socket.on(
      "submit-answer",
      async ({
        lobbyCode,
        nickname,
        questionId,
        selectedOptionIndex,
        remainingTime,
        totalTime,
      }) => {
        const session = await GameSession.findOne({ lobbyCode });
        if (
          !session ||
          session.status !== "active" ||
          session.currentPhase !== "question"
        )
          return;

        const question = await Question.findById(questionId);
        if (!question) return;

        const player = session.players.find((p) => p.nickname === nickname);
        if (!player) return;

        const alreadyAnswered = player.answers.some(
          (a) => a.questionId.toString() === questionId
        );
        if (alreadyAnswered) return;

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

        io.to(lobbyCode).emit("score-updated", {
          nickname,
          score: player.score,
          earnedScore,
          isCorrect,
        });
      }
    );

    socket.on("next-step", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "active") return;

      if (session.currentPhase === "question") {
        session.currentPhase = "leaderboard";
        await session.save();

        const leaderboard = [...session.players]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        io.to(lobbyCode).emit("show-leaderboard", {
          leaderboard,
          allPlayers: session.players.map((p) => ({
            nickname: p.nickname,
            score: p.score,
          })),
        });
        return;
      }

      if (session.currentPhase === "leaderboard") {
        const totalQuestions = await Question.countDocuments({
          quiz: session.quiz,
        });

        if (session.currentQuestionIndex + 1 >= totalQuestions) {
          session.status = "finished";
          session.finishedAt = new Date();
          await session.save();

          io.to(lobbyCode).emit("game-finished", {
            leaderboard: [...session.players].sort((a, b) => b.score - a.score),
          });
          return;
        }

        session.currentQuestionIndex += 1;
        const nextQuestion = await getCurrentQuestion(session);

        if (nextQuestion.isAiGenerated) {
          session.currentPhase = "wheel";
          session.currentPresenter = null;
          await session.save();
          io.to(lobbyCode).emit("show-wheel");
        } else {
          session.currentPhase = "question";
          session.currentPresenter = null;
          await session.save();
          io.to(lobbyCode).emit("question-changed", {
            index: session.currentQuestionIndex,
            question: nextQuestion,
            presenter: null,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
