import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Giriş yapılamadı.");
            }

            login(data.token, data.name, data.role);
            router.push("/admin");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-6 text-zinc-900 dark:text-zinc-100">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800">
                <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                    Hoş Geldiniz
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">
                    Devam etmek için giriş yapın
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Şifre</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-semibold text-center mt-2 animate-shake">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-zinc-500">
                    Hesabınız yok mu?{" "}
                    <Link href="/signup" className="text-blue-600 font-bold hover:underline">
                        Kayıt Ol
                    </Link>
                </p>
            </div>
        </div>
    );
}
