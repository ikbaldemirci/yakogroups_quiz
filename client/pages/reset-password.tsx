import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "validating">("validating");
    const [message, setMessage] = useState("");
    const router = useRouter();
    const { token } = router.query;

    useEffect(() => {
        if (!router.isReady || !token) return;

        const checkToken = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/auth/check-reset-token?token=${token}`);
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || "Geçersiz link.");
                }
                setStatus("idle");
            } catch (err: any) {
                setStatus("error");
                setMessage(err.message);
            }
        };

        checkToken();
    }, [router.isReady, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus("error");
            setMessage("Şifreler eşleşmiyor.");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const response = await fetch("http://localhost:5000/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Sıfırlama başarısız.");
            }

            setStatus("success");
            setMessage(data.message);
        } catch (err: any) {
            setStatus("error");
            setMessage(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans text-zinc-900">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-zinc-200">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                    Yeni Şifre Belirle
                </h1>
                <p className="text-zinc-500 mb-8">
                    Lütfen yeni şifrenizi girin.
                </p>

                {status === "validating" ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
                        <p className="text-zinc-500">Link kontrol ediliyor...</p>
                    </div>
                ) : status === "success" ? (
                    <div className="space-y-4 text-center">
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                            ✅ {message}
                        </div>
                        <Link
                            href="/login"
                            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                            Giriş Yap
                        </Link>
                    </div>
                ) : status === "error" && !password ? (
                    <div className="space-y-4 text-center">
                        <div className="text-5xl mb-4">❌</div>
                        <h2 className="text-xl font-bold text-red-600">Geçersiz Link</h2>
                        <p className="text-zinc-500 mb-6">{message}</p>
                        <Link
                            href="/forgot-password"
                            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                            Yeni Link İste
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Yeni Şifre</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Yeni Şifre (Tekrar)</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        {status === "error" && (
                            <p className="text-red-500 text-sm font-semibold text-center">{message}</p>
                        )}

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                        >
                            {status === "loading" ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
