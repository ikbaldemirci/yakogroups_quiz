import { useState } from "react";
import { API_URL } from "../utils/config";
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

interface Company {
    _id: string;
    name: string;
    email: string;
    logo?: string;
    isApproved: boolean;
    role: string;
    isActive: boolean;
    createdAt: string;
}

interface SuperAdminViewProps {
    quizzes: Quiz[];
    companies?: Company[];
    currentCompanyName: string | null;
    onStartSession: (id: string) => void;
    onDelete: (id: string) => void;
    onApproveToggle?: (id: string, currentStatus: boolean) => void;
}

export default function SuperAdminView({ quizzes, companies = [], currentCompanyName, onStartSession, onDelete, onApproveToggle }: SuperAdminViewProps) {
    const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
    const [isCompaniesListExpanded, setIsCompaniesListExpanded] = useState(false);

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
                <div className="flex items-center gap-3 mb-6 border-l-4 border-emerald-500 pl-4">
                    <h2 className="text-2xl font-bold text-gray-900">Kayıtlı Şirketler (Kullanıcılar)</h2>
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">
                        {companies.length} Şirket
                    </span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                    <button
                        onClick={() => setIsCompaniesListExpanded(!isCompaniesListExpanded)}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-2xl overflow-hidden border border-gray-100">
                                📋
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Şirket Listesi ve Onay Yönetimi</h3>
                                <p className="text-xs text-gray-500">Tüm şirketleri ve izin durumlarını görüntülemek için tıklayın</p>
                            </div>
                        </div>
                        <div className={`transform transition-transform duration-200 text-xl text-gray-400 ${isCompaniesListExpanded ? 'rotate-180' : ''}`}>
                            🔽
                        </div>
                    </button>

                    {isCompaniesListExpanded && (
                        <div className="overflow-x-auto border-t border-gray-100 bg-white animate-in fade-in slide-in-from-top-4 duration-300">
                            <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Şirket Adı</th>
                                    <th className="px-6 py-4">E-posta</th>
                                    <th className="px-6 py-4">Kayıt Tarihi</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {companies.map(company => (
                                    <tr key={company._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border border-gray-200">
                                                {company.logo ? (
                                                    <img src={`${API_URL}${company.logo}`} alt={company.name} className="w-full h-full object-contain bg-white" />
                                                ) : "🏢"}
                                            </div>
                                            {company.name}
                                            {company.role === "super-admin" && (
                                                <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Admin</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{company.email}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(company.createdAt).toLocaleDateString("tr-TR")}</td>
                                        <td className="px-6 py-4">
                                            {company.role === "super-admin" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                                    Sistem Yöneticisi
                                                </span>
                                            ) : company.isApproved ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Onaylı
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Onay Bekliyor
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {company.role !== "super-admin" && onApproveToggle && (
                                                <button
                                                    onClick={() => onApproveToggle(company._id, company.isApproved || false)}
                                                    className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                                                        company.isApproved 
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                    }`}
                                                >
                                                    {company.isApproved ? 'Onayı İptal Et' : 'Hesabı Onayla'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {companies.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Kayıtlı şirket bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-6 border-l-4 border-indigo-600 pl-4">
                    <h2 className="text-2xl font-bold text-gray-900">Kendi Sınavlarım</h2>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">
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
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">
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
                                                src={`${API_URL}${companyQuizzes[0].company.logo}`}
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
                                                showCompanyBadge={true}
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
