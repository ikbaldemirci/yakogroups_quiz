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
  const disconnectTimeouts = new Map();
  const questionTimers = new Map();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    const getCurrentQuestion = async (session) => {
      const questions = await Question.find({ quiz: session.quiz })
        .sort({ order: 1 })
        .lean();
      return questions[session.currentQuestionIndex];
    };

    const clearQuestionTimer = (lobbyCode) => {
      if (questionTimers.has(lobbyCode)) {
        clearTimeout(questionTimers.get(lobbyCode));
        questionTimers.delete(lobbyCode);
        console.log(`[Timer] Cleared for lobby: ${lobbyCode}`);
      }
    };

    const setQuestionTimer = (lobbyCode, durationSeconds) => {
      clearQuestionTimer(lobbyCode);

      const timeoutId = setTimeout(async () => {
        console.log(`[Timer] Expired for lobby: ${lobbyCode}. Transitioning automatically...`);
        const session = await GameSession.findOne({ lobbyCode });
        if (session && session.status === "active" && session.currentPhase === "question") {
          await goToLeaderboard(lobbyCode, session);
        }
      }, (durationSeconds + 1) * 1000);

      questionTimers.set(lobbyCode, timeoutId);
      console.log(`[Timer] Set for lobby: ${lobbyCode} (${durationSeconds}s)`);
    };

    const goToLeaderboard = async (lobbyCode, session) => {
      clearQuestionTimer(lobbyCode);
      session.currentPhase = "leaderboard";
      await session.save();

      const leaderboard = [...session.players]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const questions = await Question.find({ quiz: session.quiz }).sort({ order: 1 }).lean();
      const nextQuestion = questions[session.currentQuestionIndex + 1];
      const nextQuestionHasAudio = !!nextQuestion?.audio;

      const currentQuestion = await getCurrentQuestion(session);
      const answerStats = [0, 0, 0, 0];

      if (currentQuestion) {
        session.players.forEach((p) => {
          const answer = p.answers.find(
            (a) => a.questionId.toString() === currentQuestion._id.toString()
          );
          if (answer && answer.selectedOptionIndex !== undefined) {
            answerStats[answer.selectedOptionIndex]++;
          }
        });
      }

      io.to(lobbyCode).emit("show-leaderboard", {
        leaderboard,
        allPlayers: session.players.map((p) => ({
          nickname: p.nickname,
          score: p.score,
        })),
        nextQuestionHasAudio,
        answerStats,
        currentQuestionOptions: currentQuestion?.options || [],
        correctOptionIndex: currentQuestion?.correctOptionIndex,
      });
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


      if (session.status === "finished" && !isAdmin) {
        const normalizedClientId = (clientId || "").trim();

        const wasPlayer = session.players.some(
          (p) => (p.clientId || "").trim() === normalizedClientId
        );

        if (wasPlayer) {
          socket.join(lobbyCode);

          socket.data.lobbyCode = lobbyCode;
          socket.data.clientId = normalizedClientId;
          socket.data.isAdmin = false;

          io.to(socket.id).emit("game-finished", {
            leaderboard: [...session.players].sort((a, b) => b.score - a.score),
          });
        } else {
          io.to(socket.id).emit("join-error", "Bu oyun sona erdi.");
        }
        return;
      }

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
        if (disconnectTimeouts.has(lobbyCode)) {
          clearTimeout(disconnectTimeouts.get(lobbyCode));
          disconnectTimeouts.delete(lobbyCode);
          console.log(`Admin reconnected to lobby ${lobbyCode}, cancel disconnect timer.`);
        }

        session.adminSocketId = socket.id;
        await session.save();

        io.to(socket.id).emit("players-updated", session.players);
        io.to(socket.id).emit("join-ok", { nickname: "admin" });

        if (session.status === "active") {
          let syncData = {
            status: session.status,
            currentPhase: session.currentPhase,
            currentQuestionIndex: session.currentQuestionIndex,
            currentPresenter: session.currentPresenter,
            players: session.players,
          };

          if (session.currentPhase === "question") {
            const question = await getCurrentQuestion(session);
            if (question) {
              syncData.question = question;
            }
          }
          io.to(socket.id).emit("game-state-sync", syncData);
        }
        return;
      }

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
        setQuestionTimer(lobbyCode, question.durationSeconds);
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
      setQuestionTimer(lobbyCode, question.durationSeconds);
      io.to(lobbyCode).emit("question-changed", {
        index: session.currentQuestionIndex,
        question,
        presenter: session.currentPresenter,
      });
    });

    socket.on("use-joker", async ({ lobbyCode, nickname, jokerType, questionId }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "active") return;

      const player = session.players.find((p) => p.nickname === nickname);
      if (!player) return;

      if (player.jokers && player.jokers[jokerType]) {
        return;
      }

      if (!player.jokers) player.jokers = {};

      if (jokerType === "fifty") {
        const question = await Question.findById(questionId);
        if (!question) return;

        const correctIndex = question.correctOptionIndex;

        const wrongIndices = question.options
          .map((_, i) => i)
          .filter((i) => i !== correctIndex);

        for (let i = wrongIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
        }
        const removedOptions = wrongIndices.slice(0, 2);

        player.jokers.fifty = questionId;
        await session.save();

        io.to(socket.id).emit("joker-result", {
          jokerType: "fifty",
          removedOptions,
        });
      } else if (jokerType === "xtwo") {
        player.jokers.xtwo = questionId;
        await session.save();
        io.to(socket.id).emit("joker-result", { jokerType: "xtwo", success: true });
      } else if (jokerType === "double") {
        player.jokers.double = questionId;
        await session.save();
        io.to(socket.id).emit("joker-result", { jokerType: "double", success: true });
      }
    });



    socket.on("submit-answer", async ({ lobbyCode, nickname, questionId, selectedOptionIndex, remainingTime, totalTime }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "active" || session.currentPhase !== "question") return;

      const question = await Question.findById(questionId);
      if (!question) return;

      const player = session.players.find((p) => p.nickname === nickname);
      if (!player) return;

      const usedDoubleDip = player.jokers?.double === questionId;
      const usedX2 = player.jokers?.xtwo === questionId;

      const previousAnswers = player.answers.filter((a) => a.questionId.toString() === questionId);
      const previousAnswersCount = previousAnswers.length;

      if (previousAnswersCount > 0) {
        if (usedDoubleDip && previousAnswersCount < 2) {

        } else {
          return;
        }
      }

      const isCorrect = question.correctOptionIndex === selectedOptionIndex;
      let earnedScore = isCorrect
        ? calculateScore(question.points, remainingTime, totalTime)
        : 0;

      if (isCorrect && usedX2) {
        earnedScore *= 2;
      }

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

      const connectedPlayers = session.players.filter(p => p.connected);

      const finishedPlayersCount = session.players.filter(p => {
        const pAnswers = p.answers.filter(a => a.questionId.toString() === questionId.toString());
        if (pAnswers.length === 0) return false;

        const hasCorrect = pAnswers.some(a => a.isCorrect);
        if (hasCorrect) return true;

        const pUsedDouble = p.jokers?.double === questionId.toString();
        if (pUsedDouble) {

          return pAnswers.length >= 2;
        } else {

          return true;
        }
      }).length;

      if (finishedPlayersCount >= connectedPlayers.length && connectedPlayers.length > 0) {
        clearQuestionTimer(lobbyCode);
        await goToLeaderboard(lobbyCode, session);
      }
    }
    );

    socket.on("next-step", async ({ lobbyCode }) => {
      const session = await GameSession.findOne({ lobbyCode });
      if (!session || session.status !== "active") return;

      if (session.currentPhase === "question") {
        await goToLeaderboard(lobbyCode, session);
        return;
      }

      if (session.currentPhase === "leaderboard" || session.currentPhase === "ad") {
        const totalQuestions = await Question.countDocuments({
          quiz: session.quiz,
        });

        if (session.currentQuestionIndex + 1 >= totalQuestions) {
          session.status = "finished";
          session.finishedAt = new Date();
          await session.save();

          const allItems = await Question.find({ quiz: session.quiz }).sort({ order: 1 }).lean();

          io.to(lobbyCode).emit("game-finished", {
            leaderboard: [...session.players].sort((a, b) => b.score - a.score),
            players: session.players,
            quizItems: allItems,
          });
          return;
        }

        session.currentQuestionIndex += 1;
        const nextItem = await getCurrentQuestion(session);

        if (nextItem.type === "ad") {
          session.currentPhase = "ad";
          await session.save();
          io.to(lobbyCode).emit("show-ad", {
            mediaUrl: nextItem.mediaUrl,
            index: session.currentQuestionIndex,
          });
          return;
        }

        if (nextItem.isAiGenerated) {
          session.currentPhase = "wheel";
          session.currentPresenter = null;
          await session.save();
          io.to(lobbyCode).emit("show-wheel");
        } else {
          session.currentPhase = "question";
          session.currentPresenter = null;
          session.currentQuestionStartedAt = new Date();
          await session.save();
          setQuestionTimer(lobbyCode, nextItem.durationSeconds);
          io.to(lobbyCode).emit("question-changed", {
            index: session.currentQuestionIndex,
            question: nextItem,
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

      if (!lobbyCode) return;

      const session = await GameSession.findOne({ lobbyCode });
      if (!session) return;


      if (isAdmin) {
        if (session.status === "active") {
          console.log(`Admin disconnected from active lobby ${lobbyCode}. Starting grace period...`);

          if (disconnectTimeouts.has(lobbyCode)) {
            clearTimeout(disconnectTimeouts.get(lobbyCode));
          }

          const timeoutId = setTimeout(async () => {
            console.log(`Admin grace period expired for ${lobbyCode}. Ending game.`);

            const currentSession = await GameSession.findOne({ lobbyCode });
            if (currentSession && currentSession.status === "active") {
              currentSession.status = "finished";
              currentSession.finishedAt = new Date();
              await currentSession.save();

              io.to(lobbyCode).emit("game-finished", {
                reason: "ADMIN_DISCONNECTED",
                leaderboard: [...currentSession.players].sort((a, b) => b.score - a.score),
              });
            }
            disconnectTimeouts.delete(lobbyCode);
          }, 15000);

          disconnectTimeouts.set(lobbyCode, timeoutId);
        }
        return;
      }

      if (!clientId) return;

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
