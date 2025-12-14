import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  joinLobby,
  startGame,
  nextQuestion,
  submitAnswer,
  onQuestionChanged,
} from "../../../lib/socket";

import { apiFetch } from "../../../lib/api";

export default function LobbyPage() {
  const router = useRouter();
  const { examId } = router.query;

  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [quizId, setQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    joinLobby(examId as string, "Admin");
  }, [examId]);

  useEffect(() => {
    onQuestionChanged((index) => {
      setQuestionIndex(index);
    });
  }, []);

  useEffect(() => {
    if (!examId) return;

    apiFetch(`/api/game-sessions/${examId}`)
      .then((data) => {
        setQuizId(data.quiz);
      })
      .catch((err) => {
        console.error("Failed to fetch game session:", err);
      });
  }, [examId]);

  useEffect(() => {
    if (questionIndex === null || !quizId) return;

    apiFetch(`/api/questions/${quizId}/${questionIndex}`)
      .then((data) => {
        console.log("Fetched question:", data);
        setCurrentQuestion(data);
      })
      .catch((err) => {
        console.error("Failed to fetch question:", err);
      });
  }, [questionIndex, quizId]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Lobby</h1>

      <button
        onClick={() => startGame(examId as string)}
        style={{ padding: 12, marginTop: 20 }}
      >
        Start Game
      </button>

      <button
        onClick={() => {
          if (!examId || !currentQuestion) return;

          submitAnswer({
            lobbyCode: examId as string,
            nickname: "Admin",
            questionId: currentQuestion._id,
            selectedOptionIndex: 0,
            remainingTime: 10,
            totalTime: 30,
          });
        }}
        style={{ padding: 12, marginTop: 10 }}
      >
        Submit Answer (TEST)
      </button>
    </div>
  );
}
