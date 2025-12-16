import { useState, ChangeEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

interface Option {
  text: string;
}

interface Question {
  text: string;
  options: Option[];
  correctOptionIndex: number;
  durationSeconds: number;
  isAiGenerated: boolean;
  order: number;
  imageFile?: File | null;
  image?: string;
}

export default function CreateQuiz() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizDuration, setQuizDuration] = useState(30);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  const [questions, setQuestions] = useState<Question[]>([
    {
      text: "",
      options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      correctOptionIndex: 0,
      durationSeconds: 30,
      isAiGenerated: false,
      order: 1,
    },
  ]);

  const handleQuestionChange = (
    index: number,
    field: keyof Question,
    value: any
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleImageChange = (index: number, file: File | null) => {
    const newQuestions = [...questions];
    newQuestions[index].imageFile = file;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (
    qIndex: number,
    oIndex: number,
    value: string
  ) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
        correctOptionIndex: 0,
        durationSeconds: 30,
        isAiGenerated: false,
        order: questions.length + 1,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    const reOrdered = newQuestions.map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(reOrdered);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      if (!quizTitle) {
        throw new Error("Sınav başlığı gereklidir.");
      }

      let coverImageUrl = "";
      if (coverImageFile) {
        for (const [index, q] of questions.entries()) {
          if (q.text.trim().length < 3) {
            setError(
              `Soru ${index + 1}: Soru metni en az 3 karakter olmalıdır.`
            );
            setLoading(false);
            return;
          }
          if (q.durationSeconds < 5) {
            setError(`Soru ${index + 1}: Süre en az 5 saniye olmalıdır.`);
            setLoading(false);
            return;
          }
          if (q.options.some((o) => !o.text.trim())) {
            setError(`Soru ${index + 1}: Tüm şıklar doldurulmalıdır.`);
            setLoading(false);
            return;
          }
        }

        const formData = new FormData();
        formData.append("file", coverImageFile);

        const uploadRes = await fetch("http://localhost:5000/api/upload?type=logos", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Logo yüklenemedi.");
        const uploadData = await uploadRes.json();
        coverImageUrl = uploadData.url;
      }

      const questionsWithImages = await Promise.all(
        questions.map(async (q) => {
          let imageUrl = null;
          if (q.imageFile) {
            const formData = new FormData();
            formData.append("file", q.imageFile);
            const res = await fetch("http://localhost:5000/api/upload?type=questions", {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              imageUrl = data.url;
            }
          }
          return {
            ...q,
            image: imageUrl,
          };
        })
      );

      const quizRes = await fetch("http://localhost:5000/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          durationMinutes: quizDuration,
          coverImage: coverImageUrl,
          questions: questionsWithImages,
        }),
      });
      if (!quizRes.ok) throw new Error("Sınav oluşturulamadı.");

      alert("Sınav başarıyla oluşturuldu!");
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  

return (
  <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
    <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
      <div className="bg-indigo-600 p-6">
        <h1 className="text-2xl font-bold text-white">Yeni Sınav Oluştur</h1>
        <p className="text-indigo-100 mt-2">
          Şirketiniz için özel bir yarışma hazırlayın.
        </p>
      </div>

      <div className="p-8 space-y-8">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-md">
            {error}
          </div>
        )}

        <section className="space-y-4 border-b pb-8 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Genel Bilgiler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sınav Adı
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Örn: YakoGroups Genel Kültür Yarışması"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şirket Logosu
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCoverImageFile(e.target.files ? e.target.files[0] : null)
                }
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Yarışma hakkında kısa bilgi..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahmini Toplam Süre (Dakika)
              </label>
              <input
                type="number"
                value={quizDuration}
                onChange={(e) => setQuizDuration(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Sorular</h2>
            <button
              onClick={addQuestion}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              + Soru Ekle
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div
              key={qIndex}
              className="bg-gray-50 p-6 rounded-lg border border-gray-200 relative group"
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  Soru {qIndex + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Sil
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soru Metni
                </label>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) =>
                    handleQuestionChange(qIndex, "text", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Sorunuzu buraya yazın..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soru Görseli (İsteğe Bağlı)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(qIndex, e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {q.imageFile && <p className="text-xs text-green-600 mt-1">Seçilen: {q.imageFile.name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctOptionIndex === oIndex}
                      onChange={() =>
                        handleQuestionChange(
                          qIndex,
                          "correctOptionIndex",
                          oIndex
                        )
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionChange(qIndex, oIndex, e.target.value)
                      }
                      className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:outline-none ${q.correctOptionIndex === oIndex
                        ? "border-green-500 ring-1 ring-green-500 bg-green-50"
                        : "border-gray-300 focus:ring-indigo-500"
                        }`}
                      placeholder={`${String.fromCharCode(
                        65 + oIndex
                      )} Şıkkı`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-6 border-t pt-4 border-gray-200 mt-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Süre (Saniye):
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={q.durationSeconds}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        "durationSeconds",
                        isNaN(parseInt(e.target.value))
                          ? 10
                          : parseInt(e.target.value)
                      )
                    }
                    className="w-24 border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={q.isAiGenerated}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        "isAiGenerated",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    AI ile Oluşturuldu (Çarkıfelek Çıksın)
                  </label>
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 transition-colors font-semibold shadow-lg ${loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {loading ? "Kaydediliyor..." : "Sınavı Kaydet ve Oluştur"}
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
