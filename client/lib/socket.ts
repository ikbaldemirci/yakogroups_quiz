import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let pendingJoin: { lobbyCode: string; nickname: string } | null = null;

if (typeof window !== "undefined") {
  socket = io("http://localhost:5000", {
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket!.id);

    if (pendingJoin) {
      socket!.emit("join-lobby", pendingJoin);
      pendingJoin = null;
    }
  });

  socket.on("players-updated", (players) => {
    console.log("Players updated:", players);
  });

  socket.on("game-started", () => {
    console.log("Game started!");
  });

  socket.on("question-changed", (questionIndex: number) => {
    console.log("Question changed:", questionIndex);
    questionChangedListener?.(questionIndex);
  });

  socket.on("score-updated", (data) => {
    console.log("Score updated:", data);
  });

  socket.on("game-finished", (data) => {
    console.log("GAME FINISHED", data);
  });
}

export function joinLobby(lobbyCode: string, nickname: string) {
  if (!socket) return;

  if (socket.connected) {
    socket.emit("join-lobby", { lobbyCode, nickname });
  } else {
    pendingJoin = { lobbyCode, nickname };
  }
}

export function startGame(lobbyCode: string) {
  if (!socket) return;
  console.log("emit start-game", lobbyCode);
  socket.emit("start-game", { lobbyCode });
}

export function nextQuestion(lobbyCode: string) {
  if (!socket) return;
  console.log("emit next-question", lobbyCode);
  socket.emit("next-question", { lobbyCode });
}

export function submitAnswer(payload: {
  lobbyCode: string;
  nickname: string;
  questionId: string;
  selectedOptionIndex: number;
  remainingTime: number;
  totalTime: number;
}) {
  if (!socket) return;

  console.log("emit submit-answer", payload);
  socket.emit("submit-answer", payload);
}

let questionChangedListener: ((index: number) => void) | null = null;

export function onQuestionChanged(cb: (index: number) => void) {
  questionChangedListener = cb;
}
