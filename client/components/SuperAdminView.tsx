import { useState } from "react";
import QuizCard from "./QuizCard";

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
        logo?: string;
    };
}

interface SuperAdminViewProps {
    quizzes: Quiz[];
    currentCompanyName: string | null;
    onStartSession: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function SuperAdminView({ quizzes, currentCompanyName, onStartSession, onDelete }: SuperAdminViewProps) {
    const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

    const myQuizzes = quizzes.filter(q => q.company?.name === currentCompanyName);
    const otherQuizzes = quizzes.filter(q => q.company?.name !== currentCompanyName);

    const groupedOtherQuizzes = otherQuizzes.reduce((acc, quiz) => {
        const companyName = quiz.company?.name || "Bilinmeyen Şirket";
        if (!acc[companyName]) acc[companyName] = [];
        acc[companyName].push(quiz);
        return acc;
    }, {} as Record<string, Quiz[]>);

    const toggleCompany = (companyName: string) => {
        setExpandedCompanies(prev => ({
            ...prev,
            [companyName]: !prev[companyName]
        }));
    };

    return (
        <div className="space-y-12">
            <section>
                <div className="flex items-center gap-3 mb-6 border-l-4 border-indigo-600 pl-4">
                    <h2 className="text-2xl font-bold text-gray-900">Kendi Sınavlarım</h2>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {myQuizzes.length}
                    </span>
                </div>

                {myQuizzes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myQuizzes.map(quiz => (
                            <QuizCard
                                key={quiz._id}
                                quiz={quiz}
                                onStartSession={onStartSession}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400">Henüz kendi sınavınız bulunmuyor.</p>
                    </div>
                )}
            </section>

            <section>
                <div className="flex items-center gap-3 mb-8 border-l-4 border-amber-500 pl-4">
                    <h2 className="text-2xl font-bold text-gray-900">Diğer Şirketlerin Sınavları</h2>
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {Object.keys(groupedOtherQuizzes).length} Şirket
                    </span>
                </div>

                <div className="space-y-4">
                    {Object.entries(groupedOtherQuizzes).map(([companyName, companyQuizzes]) => (
                        <div
                            key={companyName}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all"
                        >
                            <button
                                onClick={() => toggleCompany(companyName)}
                                className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-xl overflow-hidden border border-gray-100">
                                        {companyQuizzes[0]?.company?.logo ? (
                                            <img
                                                src={`http://localhost:5000${companyQuizzes[0].company.logo}`}
                                                alt={companyName}
                                                className="w-full h-full object-contain bg-white p-1"
                                            />
                                        ) : (
                                            "🏢"
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{companyName}</h3>
                                        <p className="text-xs text-gray-500">{companyQuizzes.length} Sınav</p>
                                    </div>
                                </div>
                                <div className={`transform transition-transform duration-200 ${expandedCompanies[companyName] ? 'rotate-180' : ''}`}>
                                    🔽
                                </div>
                            </button>

                            {expandedCompanies[companyName] && (
                                <div className="p-6 bg-zinc-50/50 border-t border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {companyQuizzes.map(quiz => (
                                            <QuizCard
                                                key={quiz._id}
                                                quiz={quiz}
                                                onStartSession={onStartSession}
                                                onDelete={onDelete}
                                                showCompanyBadge={false}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {Object.keys(groupedOtherQuizzes).length === 0 && (
                        <p className="text-center text-gray-500 py-10">Kayıtlı başka şirket sınavı bulunamadı.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
