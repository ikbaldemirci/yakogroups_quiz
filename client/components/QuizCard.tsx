import { useState } from "react";
import Link from "next/link";

interface Quiz {
    _id: string;
    title: string;
    description: string;
    coverImage?: string;
    createdAt: string;
    updatedAt: string;
    company?: {
        name: string;
    };
}

interface QuizCardProps {
    quiz: Quiz;
    onStartSession: (id: string) => void;
    onDelete: (id: string) => void;
    showCompanyBadge?: boolean;
}

export default function QuizCard({ quiz, onStartSession, onDelete, showCompanyBadge }: QuizCardProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200">
            {quiz.coverImage && !imageError ? (
                <div className="h-40 w-full relative bg-gray-50 flex items-center justify-center p-4">
                    <img
                        src={`http://localhost:5000${quiz.coverImage}`}
                        alt={quiz.title}
                        className="max-w-full max-h-full object-contain"
                        onError={() => setImageError(true)}
                    />
                </div>
            ) : (
                <div className="h-40 w-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Görsel Yok</span>
                </div>
            )}

            <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                    {quiz.title}
                </h3>

                {showCompanyBadge && quiz.company && (
                    <div className="mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 italic">
                            🏢 {quiz.company.name}
                        </span>
                    </div>
                )}

                <p className="text-gray-600 text-xs line-clamp-2 mb-4 h-8">
                    {quiz.description || "Açıklama girilmemiş."}
                </p>

                <div className="flex justify-end items-center text-[10px] text-gray-400 mb-4 italic">
                    <span>
                        {quiz.updatedAt && new Date(quiz.updatedAt) > new Date(new Date(quiz.createdAt).getTime() + 1000)
                            ? `Son Güncelleme: ${new Date(quiz.updatedAt).toLocaleDateString("tr-TR")}`
                            : new Date(quiz.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onStartSession(quiz._id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                    >
                        Oturum Başlat
                    </button>
                    <Link
                        href={`/edit/${quiz._id}`}
                        className="bg-zinc-100 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-200 transition flex items-center justify-center text-sm"
                        title="Düzenle"
                    >
                        ✏️
                    </Link>
                    <button
                        onClick={() => onDelete(quiz._id)}
                        className="bg-red-50 text-red-600 px-3 rounded-lg hover:bg-red-100 transition text-sm"
                        title="Sınavı Sil"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}
