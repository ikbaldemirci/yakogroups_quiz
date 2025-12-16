import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Player {
  nickname: string;
  score: number;
}

interface GameState {
  status: "waiting" | "active" | "finished";
  currentPhase: "question" | "leaderboard" | "wheel";
  currentQuestionIndex: number;
  players: Player[];
  currentQuestionText?: string;
  wheelWinner?: string;
  currentQuestionImage?: string;
}

let socket: Socket;

export default function AdminLobby() {
  const router = useRouter();
  const { code } = router.query;
  const lobbyCode = code as string;

  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentPhase: "question",
    currentQuestionIndex: 0,
    players: [],
  });

  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [wheelWinner, setWheelWinner] = useState("");

  useEffect(() => {
    if (!lobbyCode) return;

    socket = io("http://localhost:5000");

    socket.emit("join-lobby", { lobbyCode, nickname: "ADMIN_OBSERVER" });

    socket.on("players-updated", (players: Player[]) => {
      setGameState((prev) => ({ ...prev, players }));
    });

    socket.on("game-started", () => {
      setGameState((prev) => ({ ...prev, status: "active" }));
    });

    socket.on("question-changed", (data: any) => {
      const qText = data.question
        ? data.question.text
        : `Soru ${data + 1} (Yükleniyor...)`;

      const qImage = data.question?.image;

      setCurrentQuestionText(qText);
      setGameState((prev) => ({
        ...prev,
        currentPhase: "question",
        currentQuestionIndex: typeof data === "number" ? data : data.index,
        currentQuestionImage: qImage,
      }));
      setWheelWinner("");
    });

    socket.on("show-leaderboard", () => {
      setGameState((prev) => ({ ...prev, currentPhase: "leaderboard" }));
    });

    socket.on("show-wheel", () => {
      setGameState((prev) => ({ ...prev, currentPhase: "wheel" }));
    });

    socket.on("wheel-result", ({ winner }) => {
      setWheelWinner(winner);
    });

    socket.on("game-finished", () => {
      setGameState((prev) => ({ ...prev, status: "finished" }));
    });

    return () => {
      socket.disconnect();
    };
  }, [lobbyCode]);

  const startGame = () => {
    socket.emit("start-game", { lobbyCode });
  };

  const nextStep = () => {
    socket.emit("next-step", { lobbyCode });
  };

  const spinWheel = () => {
    socket.emit("spin-wheel", { lobbyCode });
  };

  const startQuestionAfterWheel = () => {
    socket.emit("start-question-after-wheel", { lobbyCode });
  };

  if (!lobbyCode) return <div>Yükleniyor...</div>;

  const joinLink = `http://localhost:3000/play/${lobbyCode}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-12 border-b border-slate-700 pb-6">
          <div>
            <span className="text-slate-400 text-sm uppercase tracking-wider">
              Lobby Code
            </span>
            <h1 className="text-5xl font-mono font-bold text-yellow-400 tracking-widest">
              {lobbyCode}
            </h1>
          </div>
          <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">Katılım Linki</p>
            <p className="text-blue-400 font-mono text-lg">{joinLink}</p>
          </div>
        </div>

        {gameState.status === "waiting" && (
          <div className="text-center space-y-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Oyuncular Bekleniyor...
              </h2>
              <div className="bg-slate-800/50 p-8 rounded-2xl min-h-[200px] border-2 border-dashed border-slate-700">
                {gameState.players.length === 0 ? (
                  <p className="text-slate-500 italic">
                    Henüz kimse katılmadı.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {gameState.players.map((p, i) => (
                      <div
                        key={i}
                        className="bg-indigo-600 px-6 py-3 rounded-full font-bold shadow-lg animate-bounce-short"
                      >
                        {p.nickname}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={gameState.players.length === 0}
              className={`text-2xl px-12 py-6 rounded-xl font-bold transition-transform hover:scale-105 shadow-2xl ${gameState.players.length === 0
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-400"
                }`}
            >
              Yarışmayı Başlat
            </button>
          </div>
        )}

        {gameState.status === "active" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
              <h3 className="text-xl font-semibold mb-6 text-slate-300">
                Yönetim Paneli
              </h3>

              <div className="space-y-6">
                <div className="bg-slate-900 p-4 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase">
                    Şu Anki Durum
                  </span>
                  <p className="text-2xl font-bold text-yellow-400 uppercase">
                    {gameState.currentPhase}
                  </p>
                </div>

                {gameState.currentPhase === "question" && (
                  <button
                    onClick={nextStep}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-lg font-bold text-lg transition-colors"
                  >
                    Sonraki Adım (Puan Tablosu)
                  </button>
                )}

                {gameState.currentPhase === "leaderboard" && (
                  <button
                    onClick={nextStep}
                    className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-lg font-bold text-lg transition-colors"
                  >
                    Sıradaki Soruya Geç
                  </button>
                )}

                {gameState.currentPhase === "wheel" && (
                  <div className="space-y-4">
                    {!wheelWinner ? (
                      <button
                        onClick={spinWheel}
                        className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-lg font-bold text-lg transition-colors animate-pulse"
                      >
                        Çarkı Çevir!
                      </button>
                    ) : (
                      <button
                        onClick={startQuestionAfterWheel}
                        className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-lg font-bold text-lg transition-colors"
                      >
                        Soruyu Başlat
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2 bg-black rounded-xl border-4 border-slate-800 p-8 flex items-center justify-center min-h-[400px]">
              {gameState.currentPhase === "question" && (
                <div className="text-center">
                  <span className="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-bold mb-4 inline-block">
                    SORU EKRANI
                  </span>
                  {gameState.currentQuestionImage && (
                    <div className="mb-4 flex justify-center">
                      <img
                        src={`http://localhost:5000${gameState.currentQuestionImage}`}
                        alt="Soru Görseli"
                        className="max-h-48 rounded-lg shadow-sm object-contain bg-white"
                      />
                    </div>
                  )}
                  <h2 className="text-3xl font-bold">{currentQuestionText}</h2>
                  <p className="text-slate-500 mt-4">Oyuncular cevaplıyor...</p>
                </div>
              )}

              {gameState.currentPhase === "leaderboard" && (
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-yellow-400 mb-4">
                    Puan Tablosu
                  </h2>
                  <p className="text-slate-400">Sonuçlar gösteriliyor...</p>
                </div>
              )}

              {gameState.currentPhase === "wheel" && (
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-purple-400 mb-6">
                    Çarkıfelek Zamanı!
                  </h2>
                  {wheelWinner ? (
                    <div className="animate-bounce">
                      <p className="text-slate-400">Seçilen Kişi:</p>
                      <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mt-2">
                        {wheelWinner}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 animate-pulse">
                      Çark çevriliyor...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {gameState.status === "finished" && (
          <div className="text-center py-20">
            <h2 className="text-6xl font-bold text-yellow-400 mb-8">
              OYUN BİTTİ!
            </h2>
            <button
              onClick={() => router.push("/admin")}
              className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-lg text-lg"
            >
              Admin Paneline Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
