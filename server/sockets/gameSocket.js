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

    socket.on("join-lobby", async ({ lobbyCode, nickname }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "waiting") return;

      const exists = session.players.some((p) => p.nickname === nickname);
      if (exists) return;

      session.players.push({ nickname });
      await session.save();

      socket.join(lobbyCode);

      io.to(lobbyCode).emit("players-updated", session.players);
    });

    socket.on("start-game", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "waiting") return;

      session.status = "active";
      session.startedAt = new Date();
      session.currentQuestionIndex = 0;
      await session.save();

      io.to(lobbyCode).emit("game-started");
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
        if (!session || session.status !== "active") return;

        const question = await Question.findById(questionId);
        if (!question) return;

        const player = session.players.find((p) => p.nickname === nickname);
        if (!player) return;

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

    socket.on("next-question", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session) return;

      session.currentQuestionIndex += 1;
      await session.save();

      io.to(lobbyCode).emit("question-changed", session.currentQuestionIndex);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
