import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import QuizCard from "../../components/QuizCard";
import SuperAdminView from "../../components/SuperAdminView";

interface Quiz {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    _id: string;
    name: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { role, companyName } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://localhost:5000/api/quizzes", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setQuizzes(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const createSession = async (quizId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/game-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quizId }),
      });

      if (!res.ok) throw new Error("Oturum açılamadı");

      const session = await res.json();
      router.push(`/admin/lobby/${session.lobbyCode}`);
    } catch (err) {
      alert("Hata: " + err);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    const token = localStorage.getItem("token");
    if (!confirm("Bu sınavı kalıcı olarak silmek istediğine emin misin?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/quizzes/hard/${quizId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuizzes(quizzes.filter((q) => q._id !== quizId));
      } else {
        alert("Silme işlemi başarısız oldu.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20 font-sans">
        <div className="bg-white border-b border-gray-200 mb-8 px-8 py-6">
          <header className="max-w-6xl mx-auto flex justify-between items-end">
            <div>
              <nav className="flex items-center gap-2 text-xs text-gray-400 mb-2 uppercase tracking-widest font-bold">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-indigo-600">{role === "super-admin" ? "Sistem Genel" : "Admin"}</span>
              </nav>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                {role === "super-admin" ? "Sistem Genel Paneli" : "Sınav Dashboard"}
              </h1>
              <p className="text-gray-500 mt-1 max-w-md">
                {role === "super-admin"
                  ? "Tüm şirketlerin ekosistemini ve sınavlarını buradan yönetebilirsiniz."
                  : "Sınavlarınızı oluşturun, düzenleyin ve katılımcılar için yeni oturumlar başlatın."}
              </p>
            </div>
            <Link
              href="/create"
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 font-bold flex items-center gap-3 active:scale-95"
            >
              <span className="text-xl">+</span> Yeni Sınav Oluştur
            </Link>
          </header>
        </div>

        <main className="max-w-6xl mx-auto px-8">
          {loading ? (
            <div className="col-span-3 text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-gray-400 font-medium">Veriler yükleniyor, lütfen bekleyin...</p>
            </div>
          ) : role === "super-admin" ? (
            <SuperAdminView
              quizzes={quizzes}
              currentCompanyName={companyName}
              onStartSession={createSession}
              onDelete={deleteQuiz}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-8 border-l-4 border-indigo-600 pl-4">
                <h2 className="text-2xl font-bold text-gray-900">Sınavlarım</h2>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {quizzes.length}
                </span>
              </div>

              {quizzes.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                  <div className="text-5xl mb-4">📝</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Henüz sınavın yok</h3>
                  <p className="text-gray-500 mb-8">Hemen ilk sınavını oluşturarak başlayabilirsin.</p>
                  <Link
                    href="/create"
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    + Yeni Sınav Oluştur
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {quizzes.map((quiz) => (
                    <QuizCard
                      key={quiz._id}
                      quiz={quiz}
                      onStartSession={createSession}
                      onDelete={deleteQuiz}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
