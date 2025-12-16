
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
    _id?: string;
    text: string;
    options: Option[];
    correctOptionIndex: number;
    durationSeconds: number;
    isAiGenerated: boolean;
    order: number;
    imageFile?: File | null;
    image?: string;
}

export default function EditQuiz() {
    const router = useRouter();
    const { id } = router.query;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [quizDuration, setQuizDuration] = useState(30);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        if (!id) return;

        const fetchQuizData = async () => {
            try {
                const quizRes = await fetch(`http://localhost:5000/api/quizzes/${id}`);
                if (!quizRes.ok) throw new Error("Sınav bulunamadı");
                const quiz = await quizRes.json();

                setQuizTitle(quiz.title);
                setQuizDescription(quiz.description);
                setQuizDuration(quiz.durationMinutes);
                if (quiz.coverImage) {
                    setCoverPreview(`http://localhost:5000${quiz.coverImage}`);
                }

                const qRes = await fetch(`http://localhost:5000/api/questions/${id}`);
                if (qRes.ok) {
                    const fetchedQuestions = await qRes.json();
                    const mappedQuestions = fetchedQuestions.map((q: any) => ({
                        _id: q._id,
                        text: q.text,
                        options: q.options,
                        correctOptionIndex: q.correctOptionIndex,
                        durationSeconds: q.durationSeconds,
                        isAiGenerated: q.isAiGenerated,
                        order: q.order,
                        image: q.image,
                    }));
                    setQuestions(mappedQuestions);
                } else {
                    setQuestions([]);
                }
                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchQuizData();
    }, [id]);

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
        const newQuestions = questions.filter((_, i) => i !== index);
        const reOrdered = newQuestions.map((q, i) => ({ ...q, order: i + 1 }));
        setQuestions(reOrdered);
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            setError("");

            if (!quizTitle) {
                throw new Error("Sınav başlığı gereklidir.");
            }

            for (const [index, q] of questions.entries()) {
                if (q.text.trim().length < 3) {
                    setError(`Soru ${index + 1}: Soru metni en az 3 karakter olmalıdır.`);
                    setSaving(false);
                    return;
                }
                if (q.durationSeconds < 5) {
                    setError(`Soru ${index + 1}: Süre en az 5 saniye olmalıdır.`);
                    setSaving(false);
                    return;
                }
                if (q.options.some((o) => !o.text.trim())) {
                    setError(`Soru ${index + 1}: Tüm şıklar doldurulmalıdır.`);
                    setSaving(false);
                    return;
                }
            }

            let coverImageUrl = coverPreview?.replace("http://localhost:5000", "") || "";

            if (coverImageFile) {
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
                    let imageUrl = q.image;

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

            const res = await fetch(`http://localhost:5000/api/quizzes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: quizTitle,
                    description: quizDescription,
                    durationMinutes: quizDuration,
                    coverImage: coverImageUrl,
                    questions: questionsWithImages,
                }),
            });

            if (!res.ok) throw new Error("Sınav güncellenemedi.");

            alert("Sınav başarıyla güncellendi!");
            router.push("/admin");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 font-sans flex flex-col">
            <div className="max-w-5xl mx-auto w-full bg-white shadow-2xl rounded-2xl overflow-hidden mt-10 mb-24">

                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-10 py-8">
                    <h1 className="text-3xl font-semibold text-white tracking-tight">
                        Sınavı Düzenle
                    </h1>
                    <p className="text-orange-100 mt-2 max-w-2xl text-sm">
                        Mevcut soruları ve bilgileri güncelleyin.
                    </p>
                </div>

                <div className="p-10 space-y-12">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <section className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Genel Bilgiler
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sınav Adı
                                </label>
                                <input
                                    type="text"
                                    value={quizTitle}
                                    onChange={(e) => setQuizTitle(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Şirket Logosu
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-44 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 transition cursor-pointer text-center relative overflow-hidden">
                                    {coverPreview ? (
                                        <img
                                            src={coverPreview}
                                            alt="Logo"
                                            className="object-contain h-full w-full p-4 bg-white"
                                        />
                                    ) : (
                                        <span className="text-orange-700 font-medium">
                                            Logo Yükle
                                        </span>
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

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Açıklama
                                </label>
                                <textarea
                                    value={quizDescription}
                                    onChange={(e) => setQuizDescription(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tahmini Süre (dk)
                                </label>
                                <input
                                    type="number"
                                    value={quizDuration}
                                    onChange={(e) => setQuizDuration(Number(e.target.value))}
                                    className="w-40 rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-8">
                        <h2 className="text-lg font-semibold text-gray-900">Sorular</h2>

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
                                                key={q._id || `temp-${qIndex}`}
                                                draggableId={q._id || `temp-${qIndex}`}
                                                index={qIndex}
                                            >
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition cursor-move p-6 relative"
                                                    >
                                                        <div className="flex justify-between items-center mb-4">
                                                            <span className="text-xs font-medium bg-gray-100 px-3 py-1 rounded-full">
                                                                Soru {q.order}
                                                            </span>
                                                            <button
                                                                onClick={() => removeQuestion(qIndex)}
                                                                className="text-sm text-red-500 hover:text-red-700"
                                                            >
                                                                Sil
                                                            </button>
                                                        </div>

                                                        <div className="mb-4">
                                                            <input
                                                                type="text"
                                                                value={q.text}
                                                                onChange={(e) =>
                                                                    handleQuestionChange(qIndex, "text", e.target.value)
                                                                }
                                                                className="w-full mb-5 rounded-lg border border-gray-300 px-4 py-3"
                                                                placeholder="Soru metni..."
                                                            />
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Soru Görseli
                                                            </label>
                                                            {q.image && !q.imageFile && (
                                                                <div className="mb-2">
                                                                    <img src={`http://localhost:5000${q.image}`} className="h-20 object-contain rounded border" />
                                                                </div>
                                                            )}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageChange(qIndex, e.target.files ? e.target.files[0] : null)}
                                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                                            />
                                                            {q.imageFile && <p className="text-xs text-green-600 mt-1">Yeni Seçilen: {q.imageFile.name}</p>}
                                                        </div>

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
                                                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                                                                    />
                                                                </label>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center gap-6 border-t pt-4">
                                                            <input
                                                                type="number"
                                                                min={5}
                                                                value={q.durationSeconds}
                                                                onChange={(e) => handleQuestionChange(qIndex, "durationSeconds", Number(e.target.value))}
                                                                className="w-28 rounded-lg border border-gray-300 px-3 py-2"
                                                            />
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={q.isAiGenerated}
                                                                    onChange={(e) => handleQuestionChange(qIndex, "isAiGenerated", e.target.checked)}
                                                                />
                                                                AI (Çarkıfelek)
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

                <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 px-10 py-6 flex justify-between items-center">
                    <button
                        onClick={addQuestion}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition"
                    >
                        + Yeni Soru
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
                            disabled={saving}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                        >
                            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
