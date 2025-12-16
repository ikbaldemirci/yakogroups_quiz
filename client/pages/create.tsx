import { useState, ChangeEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";


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
}

export default function CreateQuiz() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizDuration, setQuizDuration] = useState(30);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);


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

  const handleDragEnd = (result: DropResult) => {
  if (!result.destination) return;

  const items = Array.from(questions);
  const [moved] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, moved);

  const reOrdered = items.map((q, i) => ({
    ...q,
    order: i + 1,
  }));

  setQuestions(reOrdered);
};


  const handleQuestionChange = (
    index: number,
    field: keyof Question,
    value: any
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
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

        const uploadRes = await fetch("http://localhost:5000/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Resim yüklenemedi.");
        const uploadData = await uploadRes.json();
        coverImageUrl = uploadData.url;
      }

      const quizRes = await fetch("http://localhost:5000/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          durationMinutes: quizDuration,
          coverImage: coverImageUrl,
        }),
      });

      if (!quizRes.ok) throw new Error("Sınav oluşturulamadı.");
      const quizData = await quizRes.json();
      const quizId = quizData._id;

      for (const q of questions) {
        if (!q.text) throw new Error("Tüm soruların metni olmalıdır.");
        q.options.forEach((o, i) => {
          if (!o.text)
            throw new Error(`Soldaki soru (${q.order}) için boş şık olamaz.`);
        });

        const qRes = await fetch("http://localhost:5000/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizId,
            text: q.text,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            points: 100,
            order: q.order,
            durationSeconds: q.durationSeconds,
            isAiGenerated: q.isAiGenerated,
          }),
        });

        if (!qRes.ok) {
          const errData = await qRes.json();
          throw new Error(
            `Soru ${q.order} oluşturulamadı: ${
              errData.message || "Bilinmeyen hata"
            }`
          );
        }
      }

      alert("Sınav başarıyla oluşturuldu!");
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 font-sans flex flex-col">
    <div className="max-w-5xl mx-auto w-full bg-white shadow-2xl rounded-2xl overflow-hidden mt-10 mb-24">

      {/* HEADER bölümü */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-10 py-8">
        <h1 className="text-3xl font-semibold text-white tracking-tight">
          Yeni Sınav Oluştur
        </h1>
        <p className="text-indigo-100 mt-2 max-w-2xl text-sm">
          Kurumunuza özel, markalı ve etkileşimli bir quiz deneyimi tasarlayın.
        </p>
      </div>

      {/* CONTENT bölümü */}
      <div className="p-10 space-y-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* GENEL BİLGİLER */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Genel Bilgiler
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sınav adı böölümü */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sınav Adı
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Örn: 2025 Kurum İçi Bilgi Yarışması"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>

            {/* Logo upload bölümü */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şirket Logosu
              </label>

              <label className="flex flex-col items-center justify-center w-full h-44 rounded-xl
              border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100
              transition cursor-pointer text-center relative overflow-hidden">

                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Şirket logosu önizleme"
                    className="object-contain h-full w-full p-4 bg-white"
                  />
                ) : (
                  <>
                    <span className="text-indigo-700 font-medium">
                      Logo yüklemek için tıklayın
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG veya JPG • Maks. 2MB
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setCoverImageFile(file);
                    setCoverPreview(URL.createObjectURL(file));
                  }}

                  className="hidden"
                />
              </label>
            </div>

            {/* Açıklama bölümü */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                rows={4}
                placeholder="Bu yarışmanın amacı ve kapsamı..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>

            {/* Süre bölümü */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahmini Toplam Süre (dk)
              </label>
              <input
                type="number"
                value={quizDuration}
                onChange={(e) => setQuizDuration(Number(e.target.value))}
                className="w-40 rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>
        </section>

        {/* SORULAR bölümü */}
        <section className="space-y-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Sorular
          </h2>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-8"
                >
                  {questions.map((q, qIndex) => (
                    <Draggable
                      key={`question-${qIndex}`}
                      draggableId={`question-${qIndex}`}
                      index={qIndex}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition cursor-move p-6 relative"
                        >
                          {/* Header bölümü */}
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-medium bg-gray-100 px-3 py-1 rounded-full">
                              Soru {q.order}
                            </span>
                            {questions.length > 1 && (
                              <button
                                onClick={() => removeQuestion(qIndex)}
                                className="text-sm text-red-500 hover:text-red-700"
                              >
                                Sil
                              </button>
                            )}
                          </div>

                          {/* Soru bölümü */}
                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) =>
                              handleQuestionChange(qIndex, "text", e.target.value)
                            }
                            placeholder="Soruyu buraya yazın..."
                            className="w-full mb-5 rounded-lg border border-gray-300 px-4 py-3"
                          />

                          {/* Şıklar */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            {q.options.map((opt, oIndex) => (
                              <label key={oIndex} className="flex items-center gap-3">
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
                                />
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) =>
                                    handleOptionChange(
                                      qIndex,
                                      oIndex,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Şık ${String.fromCharCode(65 + oIndex)}`}
                                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                                />
                              </label>
                            ))}
                          </div>

                          {/* Alt ayarlar */}
                          <div className="flex items-center gap-6 border-t pt-4">
                            <input
                              type="number"
                              min={5}
                              value={q.durationSeconds}
                              onChange={(e) =>
                                handleQuestionChange(
                                  qIndex,
                                  "durationSeconds",
                                  Number(e.target.value)
                                )
                              }
                              className="w-28 rounded-lg border border-gray-300 px-3 py-2"
                            />

                            <label className="flex items-center gap-2 text-sm">
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
                              />
                              AI tarafından oluşturuldu
                            </label>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </section>
      </div>

      {/* ACTION BAR */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 px-10 py-6 flex justify-between items-center">
        <button
          onClick={addQuestion}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          + Yeni Soru Ekle
        </button>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg transition"
          >
            Vazgeç
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kaydet ve Oluştur"}
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
