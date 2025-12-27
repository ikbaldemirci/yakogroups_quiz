import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "İstek başarısız.");
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
                <Link href="/login" className="text-sm text-zinc-500 hover:text-blue-600 flex items-center gap-1 mb-6">
                    ← Giriş Sayfasına Dön
                </Link>

                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                    Şifremi Unuttum
                </h1>
                <p className="text-zinc-500 mb-8">
                    E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
                </p>

                {status === "success" ? (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium text-center">
                        ✅ {message}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder="email@example.com"
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
                            {status === "loading" ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
