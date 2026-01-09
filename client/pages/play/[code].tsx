import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import AdPlayer from "../../components/AdPlayer";

const WheelComponent = dynamic(() => import("../../components/WheelComponent"), { ssr: false });

let socket: Socket;

const getClientId = (lobbyCode: string) => {
  const key = `quiz_client_${lobbyCode}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id =
      (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
};


interface Option {
  text: string;
  _id?: string;
}

interface Question {
  _id: string;
  text: string;
  options: Option[];
  durationSeconds: number;
  image?: string;
  isAiGenerated?: boolean;
  audio?: string;
  playAudioOnHost?: boolean;
  playAudioOnClient?: boolean;
}

interface JokersState {
  fifty: boolean; 
  double: boolean;
  xtwo: boolean;
}


interface GameState {
  status: "waiting" | "active" | "finished";
  currentPhase: "question" | "leaderboard" | "wheel" | "ad";
  score: number;
  nickname: string;
  players?: any[];
}

export default function PlayerGame() {
  const router = useRouter();
  const { code } = router.query;
  const lobbyCode = code as string;

  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentPhase: "question",
    score: 0,
    nickname: "",
  });

  const [quizInfo, setQuizInfo] = useState<{
    title?: string;
    coverImage?: string;
    backgroundColor?: string;
  } | null>(null);


  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAdUrl, setCurrentAdUrl] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [wheelWinner, setWheelWinner] = useState("");
  const [nextQuestionHasAudio, setNextQuestionHasAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [wheelWinnerShown, setWheelWinnerShown] = useState(false);

  
  const [myJokers, setMyJokers] = useState<JokersState>({ fifty: false, double: false, xtwo: false });
  const [activeJoker, setActiveJoker] = useState<string | null>(null); 
  const [removedOptions, setRemovedOptions] = useState<number[]>([]);
  const [doubleDipUsed, setDoubleDipUsed] = useState(false);
  const [showJokerFeedback, setShowJokerFeedback] = useState(""); 



  const Header = quizInfo && (
    <>
      {quizInfo.coverImage && (
        <div className="absolute top-5 left-5 z-50">
          <img
            src={`http://localhost:5000${quizInfo.coverImage}`}
            alt="Şirket Logosu"
            className="h-20 max-w-[200px] object-contain bg-white px-4 py-2 rounded-lg shadow-md"
          />
        </div>
      )}
      {quizInfo.title && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-50 text-center">
          <span
            className={`font-bold text-3xl tracking-tight ${quizInfo.backgroundColor ? "text-white drop-shadow-md" : "text-slate-900"
              }`}
          >
            {quizInfo.title}
          </span>
        </div>
      )}
    </>
  );



  useEffect(() => {
    if (!lobbyCode) return;

    socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("Connected to server");
      socket.emit("get-quiz-info", { lobbyCode });
    });

    socket.on("game-started", () => {
      setGameState((prev) => ({ ...prev, status: "active" }));
    });

    socket.on("players-updated", (players: any[]) => {
      setGameState((prev) => ({ ...prev, players }));
    });

    socket.on("quiz-info", (data) => {
      setQuizInfo(data);
    });

    socket.on("join-ok", ({ nickname: serverNick }: any) => {
      setError("");
      setJoined(true);
      setGameState((prev) => ({ ...prev, nickname: serverNick || nickname }));
      sessionStorage.setItem(`quiz_nickname_${lobbyCode}`, serverNick || nickname);
    });

    socket.on("joker-result", (data: any) => {
      if (data.jokerType === "fifty") {
        setRemovedOptions(data.removedOptions);
        setMyJokers(prev => ({ ...prev, fifty: true }));
      } else if (data.jokerType === "xtwo") {
        setActiveJoker("xtwo");
        setShowJokerFeedback("x2 Puan Aktif! Doğru bilirsen iki kat puan!");
        setMyJokers(prev => ({ ...prev, xtwo: true }));
        setTimeout(() => setShowJokerFeedback(""), 3000);
      } else if (data.jokerType === "double") {
        setActiveJoker("double");
        setShowJokerFeedback("Çift Cevap Aktif! İki şansın var.");
        setMyJokers(prev => ({ ...prev, double: true }));
        setTimeout(() => setShowJokerFeedback(""), 3000);
      }
    });

    socket.on("question-changed", (data: any) => {
      setGameState((prev) => ({ ...prev, currentPhase: "question" }));
      setCurrentQuestion(data.question);
      setTimer(data.question.durationSeconds);
      setSelectedOption(null);
      setWheelWinner("");
      setNextQuestionHasAudio(false);

      setRemovedOptions([]);
      setActiveJoker(null);
      setDoubleDipUsed(false);
      setShowJokerFeedback("");
    });

    socket.on("show-wheel", () => {
      setGameState((prev) => ({ ...prev, currentPhase: "wheel" }));
    });

    socket.on("wheel-result", ({ winner }) => {
      setWheelWinner(winner);
      setWheelWinnerShown(false);
    });

    socket.on("show-leaderboard", (data: any) => {
      setGameState((prev) => ({ ...prev, currentPhase: "leaderboard" }));
      setLeaderboard(data.leaderboard);
      setNextQuestionHasAudio(data.nextQuestionHasAudio || false);
    });

    socket.on("show-ad", (data: any) => {
      console.log("Ad received:", data.mediaUrl);
      setCurrentAdUrl(data.mediaUrl);
      setGameState((prev) => ({
        ...prev,
        currentPhase: "ad",
      }));
    });

    socket.on("join-error", (msg: string) => {
      setError(msg);
      setJoined(false);

      if (msg.toLowerCase().includes("nickname alınmış")) {
        sessionStorage.removeItem(`quiz_nickname_${lobbyCode}`);
      }
    });


    socket.on("game-state-sync", (data: any) => {
      setGameState((prev) => ({
        ...prev,
        status: data.status,
        currentPhase: data.currentPhase,
        players: data.players,
      }));

      if (data.currentPhase === "question" && data.question) {
        setCurrentQuestion(data.question);
        setTimer(data.remainingTime);
      }
    });

    socket.on("game-finished", (data: any) => {
      setJoined(true);
      setGameState((prev) => ({
        ...prev,
        status: "finished",
        currentPhase: "leaderboard",
      }));

      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });


    const savedNickname = sessionStorage.getItem(`quiz_nickname_${lobbyCode}`);

    if (savedNickname) {
      setNickname(savedNickname);
      socket.emit("join-lobby", {
        lobbyCode,
        nickname: savedNickname,
        clientId: getClientId(lobbyCode),
      });

    }


    return () => {
      socket.disconnect();
    };
  }, [lobbyCode]);

  useEffect(() => {
    if (gameState.currentPhase === "question" && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.currentPhase, timer]);

  useEffect(() => {
    if (gameState.currentPhase === "question" && currentQuestion?.audio && audioRef.current) {
      const shouldPlay = currentQuestion.playAudioOnClient !== false;

      if (shouldPlay) {
        const elapsed = currentQuestion.durationSeconds - timer;
        if (elapsed > 0) {
          audioRef.current.currentTime = elapsed;
        }
        audioRef.current.play().catch(e => console.log("Audio play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [gameState.currentPhase, currentQuestion]);

  const handleJoin = () => {
    const nick = nickname.trim();
    if (!nick) return;

    setError("");

    socket.emit("join-lobby", {
      lobbyCode,
      nickname: nick,
      clientId: getClientId(lobbyCode),
    });


  };

  const handleUseJoker = (type: "fifty" | "xtwo" | "double") => {
    if (myJokers[type] || !currentQuestion || selectedOption !== null) return;

    
    socket.emit("use-joker", {
      lobbyCode,
      nickname: gameState.nickname,
      jokerType: type,
      questionId: currentQuestion._id,
    });
  };


  const submitAnswer = (index: number) => {
    if ((selectedOption !== null && !activeJoker) || !currentQuestion) return;

    if (activeJoker === "double") {
      if (selectedOption !== null && doubleDipUsed) return;

    } else {
      if (selectedOption !== null) return;
    }

    setSelectedOption(index);

    socket.emit("submit-answer", {
      lobbyCode,
      nickname: gameState.nickname,
      questionId: currentQuestion._id,
      selectedOptionIndex: index,
      remainingTime: timer,
      totalTime: currentQuestion.durationSeconds,
    });
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (data.nickname === gameState.nickname) {
        if (activeJoker === "double" && !data.isCorrect && !doubleDipUsed) {
          
          setDoubleDipUsed(true);
          setSelectedOption(null); 
          setShowJokerFeedback("Yanlış! Bir hakkın daha var.");
          setTimeout(() => setShowJokerFeedback(""), 2000);
        } else {
          
        }
      }
    };
    socket.on("score-updated", handler);
    return () => {
      socket.off("score-updated", handler);
    };
  }, [gameState.nickname, activeJoker, doubleDipUsed]);

  if (!lobbyCode)
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center text-white">
        Yükleniyor...
      </div>
    );

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 flex flex-col items-center justify-center p-4 font-sans relative">

        {quizInfo && (
          <div className="mb-8 text-center flex flex-col items-center">
            {quizInfo.title && (
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 drop-shadow-lg tracking-tight">
                {quizInfo.title}
              </h1>
            )}

            {quizInfo.coverImage && (
              <div className="bg-white p-4 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300 w-48 h-48 flex items-center justify-center">
                <img
                  src={`http://localhost:5000${quizInfo.coverImage}`}
                  alt="Quiz Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Yarışmaya Katıl
          </h2>
          <p className="text-gray-500 mb-6 font-medium">Lobby: <span className="text-indigo-600">{lobbyCode}</span></p>

          <input
            type="text"
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-lg font-bold text-gray-800 mb-4 focus:outline-none transition-colors"
            placeholder="Takma Adın (Nickname)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm mb-4 font-bold animate-pulse">{error}</div>}

          <button
            onClick={handleJoin}
            disabled={!nickname}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            GİRİŞ YAP
          </button>
        </div>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative"
        style={{
          backgroundColor: quizInfo?.backgroundColor || undefined,
          color: quizInfo?.backgroundColor ? "white" : undefined // Ensure text is visible
        }}
      >
        {!quizInfo?.backgroundColor && (
          <div className="absolute inset-0 bg-indigo-900 -z-10" />
        )}

        {Header}

        <div className="animate-pulse mb-8 text-6xl">⏳</div>
        <h2 className={`text-3xl font-bold mb-2 ${quizInfo?.backgroundColor ? "text-white" : "text-white"}`}>
          Hazırsın, {gameState.nickname}!
        </h2>
        <p className={`${quizInfo?.backgroundColor ? "text-white/80" : "text-indigo-200"}`}>
          Sunucunun oyunu başlatması bekleniyor...
        </p>
      </div>
    );
  }


  if (gameState.status === "finished") {
    const myRank =
      leaderboard.findIndex((p) => p.nickname === gameState.nickname) + 1;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative"
        style={{
          backgroundColor: quizInfo?.backgroundColor || undefined,
          color: quizInfo?.backgroundColor ? "white" : undefined
        }}
      >
        {!quizInfo?.backgroundColor && (
          <div className="absolute inset-0 bg-slate-900 -z-10" />
        )}

        {Header}

        <h1 className="text-4xl font-bold text-yellow-400 mb-4">
          Oyun Bitti!
        </h1>

        <p className={`text-2xl mb-8 ${quizInfo?.backgroundColor ? "text-white" : "text-white"}`}>
          Sıralaman:{" "}
          <span className="font-bold text-white bg-indigo-600 px-3 py-1 rounded-lg">
            #{myRank > 0 ? myRank : "-"}
          </span>
        </p>

        <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2 text-white">
            Lider Tablosu
          </h3>

          {leaderboard.slice(0, 10).map((p, i) => (
            <div
              key={i}
              className={`flex justify-between py-2 ${p.nickname === gameState.nickname
                ? "text-yellow-400 font-bold"
                : "text-gray-300"
                }`}
            >
              <span>
                #{i + 1} {p.nickname}
              </span>
              <span>{p.score} P</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gameState.currentPhase === "wheel") {
    return (
      <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center text-white overflow-hidden relative">

        {Header}

        <div className="absolute inset-0 bg-[url('/wheel-bg-pattern.png')] opacity-10"></div>

        <h2 className="text-3xl font-bold mb-8 z-10 text-center">
          Sıradaki Soru
          <br />
          AI Tarafından Oluşturuldu!
        </h2>

        <div className="relative">
          <WheelComponent
            players={gameState.players || []}
            winner={wheelWinner || null}
            spinning={!!wheelWinner && !wheelWinnerShown}
            onStopSpinning={() => setWheelWinnerShown(true)}
          />
        </div>

        <div className="mt-12 text-center h-20 z-10">
          {wheelWinner && wheelWinnerShown ? (
            <div className="animate-bounce">
              <p className="text-purple-200">Seçilen Kişi:</p>
              <h1 className="text-5xl font-extrabold text-white mt-2 drop-shadow-lg">
                {wheelWinner}
              </h1>
            </div>
          ) : (
            <p className="text-xl text-purple-300 animate-pulse">
              {!wheelWinner ? "Kader çarkı dönüyor..." : "Çark dönüyor..."}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (gameState.currentPhase === "leaderboard") {
    return (
      <div
        className="min-h-screen p-6 pt-24 flex flex-col items-center relative"
        style={{
          backgroundColor: quizInfo?.backgroundColor || undefined,
          color: quizInfo?.backgroundColor ? "white" : undefined
        }}
      >
        {!quizInfo?.backgroundColor && (
          <div className="absolute inset-0 bg-blue-900 -z-10" />
        )}

        {Header}

        <h2 className={`text-3xl font-bold mb-8 px-6 py-2 rounded-full shadow-lg ${quizInfo?.backgroundColor ? "bg-white/20 text-white" : "bg-blue-800 text-white"}`}>
          Puan Durumu
        </h2>

        <div className="w-full max-w-md space-y-4">
          {leaderboard.map((p, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-xl shadow-md transform transition-all ${p.nickname === gameState.nickname
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 scale-105 border-2 border-white text-white"
                : "bg-white/10 text-white"
                }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">{p.nickname}</span>
              </div>
              <span className="font-mono font-bold text-xl">{p.score}</span>
            </div>
          ))}
        </div>

        <div className={`mt-auto pt-8 text-sm ${quizInfo?.backgroundColor ? "text-white/80" : "text-blue-300"}`}>
          Diğer soruya geçilmesi bekleniyor...
        </div>

        {nextQuestionHasAudio && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600/90 text-white px-8 py-6 rounded-2xl shadow-2xl z-50 animate-pulse text-center">
            <span className="text-4xl block mb-2">🔊</span>
            <h3 className="text-2xl font-bold">Lütfen Sessiz Olun!</h3>
            <p className="text-lg">Sıradaki soru sesli sorudur.</p>
          </div>
        )}
      </div>
    );
  }


  return (
    <div
      className="min-h-screen flex flex-col font-sans relative"
      style={{
        backgroundColor: quizInfo?.backgroundColor || undefined,
        backgroundImage: !quizInfo?.backgroundColor ? "linear-gradient(to bottom right, #f1f5f9, #cbd5e1)" : "none"
      }}
    >
      {!quizInfo?.backgroundColor && <div className="absolute inset-0 bg-slate-100 -z-10" />}

      {Header}

      <div className="h-2 bg-gray-200 w-full">
        <div
          className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
          style={{
            width: `${currentQuestion
              ? (timer / currentQuestion.durationSeconds) * 100
              : 0
              }%`,
          }}
        ></div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <div className="mb-8 text-center">
          {currentQuestion?.image && (
            <div className="mb-6 flex justify-center">
              <img
                src={`http://localhost:5000${currentQuestion.image}`}
                alt="Soru Görseli"
                className="max-h-64 rounded-lg shadow-md object-contain"
              />

            </div>
          )}

          {currentQuestion?.audio && (currentQuestion.playAudioOnClient !== false) && (
            <div className="mb-4">
              <audio ref={audioRef} src={`http://localhost:5000${currentQuestion.audio}`} controls className="mx-auto" />
            </div>
          )}

          <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm mb-4">
            {timer} Saniye
          </span>
          <h2 className={`text-2xl md:text-3xl font-bold leading-tight ${quizInfo?.backgroundColor ? "text-white drop-shadow-md" : "text-slate-800"
            }`}>
            {currentQuestion?.text}
          </h2>

          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => handleUseJoker("fifty")}
              disabled={myJokers.fifty || selectedOption !== null || removedOptions.length > 0}
              className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold transition-all ${myJokers.fifty ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg active:scale-95"
                }`}
            >
              <div className="bg-white/20 p-2 rounded-full mb-1">🌗</div>
              <span>%50</span>
            </button>
            <button
              onClick={() => handleUseJoker("xtwo")}
              disabled={myJokers.xtwo || selectedOption !== null}
              className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold transition-all ${myJokers.xtwo ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white shadow-lg active:scale-95"
                }`}
            >
              <div className="bg-white/20 p-2 rounded-full mb-1">2️⃣</div>
              <span>x2</span>
            </button>
            <button
              onClick={() => handleUseJoker("double")}
              disabled={myJokers.double || selectedOption !== null}
              className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold transition-all ${myJokers.double ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-purple-500 hover:bg-purple-600 text-white shadow-lg active:scale-95"
                }`}
            >
              <div className="bg-white/20 p-2 rounded-full mb-1">✌️</div>
              <span>Çift</span>
            </button>
          </div>
          {showJokerFeedback && <div className="mt-2 text-indigo-600 font-bold animate-bounce">{showJokerFeedback}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {currentQuestion?.options.map((opt, i) => (
            <button
              key={i}
              disabled={(selectedOption !== null) || timer === 0 || removedOptions.includes(i)}
              onClick={() => submitAnswer(i)}
              className={`p-6 rounded-xl text-lg font-bold text-left transition-all transform shadow-sm border-2 ${selectedOption === i
                ? "bg-indigo-600 text-white border-indigo-600 scale-95"
                : "bg-white text-slate-700 border-gray-200 hover:border-indigo-300 hover:shadow-md active:scale-95"
                } ${(selectedOption !== null && selectedOption !== i) || removedOptions.includes(i) ? "opacity-30" : ""
                }`}
            >
              <span className="inline-block w-8">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt.text}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
        <span className="font-bold text-gray-700">{gameState.nickname}</span>
        <span className="font-bold text-indigo-600">Skor: {gameState.score}</span>
      </div>

      {gameState.currentPhase === "ad" && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6">
          <div className="mb-6 flex flex-col items-center">
            <span className="bg-amber-400 text-amber-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm animate-pulse">
              Reklam Arası
            </span>
            <h2 className="text-white text-xl font-bold mt-2">Sıradaki soru birazdan gelecek...</h2>
          </div>
          <div className="w-full max-w-4xl">
            <AdPlayer url={currentAdUrl} />
          </div>
          <p className="text-slate-400 text-sm mt-4 italic">Reklam bitince oyun otomatik devam edecektir.</p>
        </div>
      )}
    </div>
  );
}
