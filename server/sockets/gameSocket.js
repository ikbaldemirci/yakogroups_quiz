import mongoose from "mongoose";
import GameSession from "../models/GameSession.js";
import Question from "../models/Question.js";
import { io } from "../index.js";
import Quiz from "../models/Quiz.js";


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
    socket.on("get-quiz-info", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session) return;

      const quiz = await Quiz.findById(session.quiz).lean();
      if (quiz) {
        io.to(socket.id).emit("quiz-info", {
          title: quiz.title,
          coverImage: quiz.coverImage,
          backgroundColor: quiz.backgroundColor,
        });
      }
    });

    socket.on("join-lobby", async ({ lobbyCode, nickname, isAdmin, clientId }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session) return;


      const normalizedNick = (nickname || "").trim();
      const normalizedNickKey = normalizedNick.toLowerCase();
      const normalizedClientId = (clientId || "").trim();

      if (!isAdmin) {
        if (!normalizedClientId) {
          io.to(socket.id).emit("join-error", "clientId eksik.");
          return;
        }
        if (!normalizedNick) {
          io.to(socket.id).emit("join-error", "Nickname boş olamaz.");
          return;
        }
      }


      const existingByClient = !isAdmin
        ? session.players.find((p) => (p.clientId || "").trim() === normalizedClientId)
        : null;


      const existingByNickname = session.players.find(
        (p) => (p.nickname || "").trim().toLowerCase() === normalizedNickKey
      );


      if (!isAdmin && existingByClient) {

        nickname = existingByClient.nickname;

        existingByClient.socketId = socket.id;
        existingByClient.connected = true;

        await session.save();

        socket.data.lobbyCode = lobbyCode;
        socket.data.clientId = normalizedClientId;
        socket.data.isAdmin = false;

        socket.join(lobbyCode);

        const quiz = await Quiz.findById(session.quiz).lean();
        if (quiz) {
          io.to(socket.id).emit("quiz-info", {
            title: quiz.title,
            coverImage: quiz.coverImage,
            backgroundColor: quiz.backgroundColor,
          });
        }

        io.to(socket.id).emit("join-ok", { nickname });

        io.to(lobbyCode).emit("players-updated", session.players);


        if (session.status !== "waiting") {
          let syncData = {
            status: session.status,
            currentPhase: session.currentPhase,
            currentQuestionIndex: session.currentQuestionIndex,
            currentPresenter: session.currentPresenter,
          };

          if (session.currentPhase === "question") {
            const question = await getCurrentQuestion(session);
            if (question) {
              const now = new Date();
              const elapsed = session.currentQuestionStartedAt
                ? Math.floor((now - session.currentQuestionStartedAt) / 1000)
                : 0;
              const remaining = Math.max(0, question.durationSeconds - elapsed);

              syncData.question = question;
              syncData.remainingTime = remaining;
            }
          }

          io.to(socket.id).emit("game-state-sync", {
            ...syncData,
            players: session.players,
          });
        }

        return;
      }


      if (!isAdmin && session.status === "waiting" && existingByNickname) {
        io.to(socket.id).emit(
          "join-error",
          "Bu nickname alınmış. Lütfen başka bir nickname seçin."
        );
        return;
      }


      if (!isAdmin && session.status !== "waiting" && !existingByNickname) {
        const errorMsg =
          session.status === "active"
            ? "Oyun çoktan başladı, artık katılamazsın."
            : "Bu oyun sona erdi.";
        io.to(socket.id).emit("join-error", errorMsg);
        return;
      }


      socket.join(lobbyCode);

      socket.data.lobbyCode = lobbyCode;
      socket.data.clientId = normalizedClientId;
      socket.data.isAdmin = !!isAdmin;

      const quiz = await Quiz.findById(session.quiz).lean();
      if (quiz) {
        io.to(socket.id).emit("quiz-info", {
          title: quiz.title,
          coverImage: quiz.coverImage,
          backgroundColor: quiz.backgroundColor,
        });
      }

      if (isAdmin) {
        io.to(socket.id).emit("players-updated", session.players);
        io.to(socket.id).emit("join-ok", { nickname: "admin" });
        return;
      }

      // Waiting ise ekle
      if (session.status === "waiting") {
        session.players.push({
          nickname: normalizedNick,
          clientId: normalizedClientId,
          socketId: socket.id,
          connected: true,
          score: 0,
          answers: [],
        });

        await session.save();
        io.to(lobbyCode).emit("players-updated", session.players);
        io.to(socket.id).emit("join-ok", { nickname: normalizedNick });
        return;
      }


      if (existingByNickname) {
        existingByNickname.socketId = socket.id;
        existingByNickname.connected = true;
        await session.save();

        io.to(socket.id).emit("join-ok", { nickname: existingByNickname.nickname });

        io.to(lobbyCode).emit("players-updated", session.players);

        let syncData = {
          status: session.status,
          currentPhase: session.currentPhase,
          currentQuestionIndex: session.currentQuestionIndex,
          currentPresenter: session.currentPresenter,
        };

        if (session.currentPhase === "question") {
          const question = await getCurrentQuestion(session);
          if (question) {
            const now = new Date();
            const elapsed = session.currentQuestionStartedAt
              ? Math.floor((now - session.currentQuestionStartedAt) / 1000)
              : 0;
            const remaining = Math.max(0, question.durationSeconds - elapsed);

            syncData.question = question;
            syncData.remainingTime = remaining;
          }
        }

        io.to(socket.id).emit("game-state-sync", {
          ...syncData,
          players: session.players,
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
        session.currentQuestionStartedAt = new Date();
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

      const players = [...session.players].sort((a, b) => a.nickname.localeCompare(b.nickname));
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
      session.currentQuestionStartedAt = new Date();
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



        const questions = await Question.find({ quiz: session.quiz }).sort({ order: 1 }).lean();
        const nextQuestion = questions[session.currentQuestionIndex + 1];
        const nextQuestionHasAudio = !!nextQuestion?.audio;

        io.to(lobbyCode).emit("show-leaderboard", {
          leaderboard,
          allPlayers: session.players.map((p) => ({
            nickname: p.nickname,
            score: p.score,
          })),
          nextQuestionHasAudio,
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
          session.currentQuestionStartedAt = new Date();
          await session.save();
          io.to(lobbyCode).emit("question-changed", {
            index: session.currentQuestionIndex,
            question: nextQuestion,
            presenter: null,
          });
        }
      }
    });

    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);

      const lobbyCode = socket.data?.lobbyCode;
      const clientId = socket.data?.clientId;
      const isAdmin = socket.data?.isAdmin;

      if (!lobbyCode || !clientId || isAdmin) return;

      const session = await GameSession.findOne({ lobbyCode });
      if (!session) return;

      const player = session.players.find(
        (p) => (p.clientId || "").trim() === (clientId || "").trim()
      );
      if (!player) return;

      player.connected = false;
      player.socketId = null;

      await session.save();
      io.to(lobbyCode).emit("players-updated", session.players);
    });

  });
};
