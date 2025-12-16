import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

interface Quiz {
  _id: string;
  title: string;
  description: string;
  durationMinutes: number;
  coverImage?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/quizzes")
      .then((res) => res.json())
      .then((data) => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch quizzes:", err);
        setLoading(false);
      });
  }, []);

  const createSession = async (quizId: string) => {
    try {
      const companyRes = await fetch("http://localhost:5000/api/companies");
      const companies = await companyRes.json();

      let companyId;
      if (companies.length > 0) {
        companyId = companies[0]._id;
      } else {
        const newCompRes = await fetch("http://localhost:5000/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Default Company",
            email: "default@company.com",
          }),
        });
        const newComp = await newCompRes.json();
        companyId = newComp._id;
      }

      const res = await fetch("http://localhost:5000/api/game-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          companyId: companyId,
        }),
      });

      if (!res.ok) throw new Error("Oturum açılamadı");

      const session = await res.json();
      router.push(`/admin/lobby/${session.lobbyCode}`);
    } catch (err) {
      alert("Hata: " + err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Sınavları yönetin ve oturum başlatın</p>
        </div>
        <Link
          href="/create"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg font-medium"
        >
          + Yeni Sınav Oluştur
        </Link>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p>Yükleniyor...</p>
        ) : quizzes.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Henüz hiç sınav oluşturulmamış.</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz._id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200"
            >
              {quiz.coverImage ? (
                <div className="h-48 w-full relative">
                  <img
                    src={`http://localhost:5000${quiz.coverImage}`}
                    alt={quiz.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Görsel Yok</span>
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                  {quiz.title}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">
                  {quiz.description || "Açıklama girilmemiş."}
                </p>

                <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
                  <span>{quiz.durationMinutes} dk</span>
                  <span>
                    {new Date(quiz.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => createSession(quiz._id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Oturum Başlat
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Bu sınavı kalıcı olarak silmek istediğine emin misin?")) return;
                      try {
                        const res = await fetch(`http://localhost:5000/api/quizzes/hard/${quiz._id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          setQuizzes(quizzes.filter((q) => q._id !== quiz._id));
                        } else {
                          alert("Silme işlemi başarısız oldu.");
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="bg-red-100 text-red-600 px-3 rounded-lg hover:bg-red-200 transition"
                    title="Sınavı Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
