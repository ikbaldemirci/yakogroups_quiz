import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function VerifyEmail() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const router = useRouter();
    const { token } = router.query;

    useEffect(() => {
        if (!router.isReady) return;

        const verifyToken = async () => {
            try {
                if (!token) {
                    setStatus("error");
                    setMessage("Geçersiz doğrulama linki.");
                    return;
                }

                const response = await fetch(`http://localhost:5000/api/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Doğrulama başarısız.");
                }

                setStatus("success");
                setMessage(data.message);
            } catch (err: any) {
                setStatus("error");
                setMessage(err.message);
            }
        };

        verifyToken();
    }, [router.isReady, token]);

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans text-zinc-900">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-zinc-200 text-center">
                {status === "loading" && (
                    <div className="space-y-4">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                        <h1 className="text-xl font-bold">Hesabınız Doğrulanıyor...</h1>
                        <p className="text-zinc-500">Lütfen bekleyin, işleminizi tamamlıyoruz.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-4">
                        <div className="text-5xl mb-4">✅</div>
                        <h1 className="text-2xl font-bold text-green-600">Başarılı!</h1>
                        <p className="text-zinc-600 mb-8">{message}</p>
                        <Link
                            href="/login"
                            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 text-center"
                        >
                            Giriş Yap
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-4">
                        <div className="text-5xl mb-4">❌</div>
                        <h1 className="text-2xl font-bold text-red-600">Hata Oluştu</h1>
                        <p className="text-zinc-600 mb-8">{message}</p>
                        <Link
                            href="/login"
                            className="block w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-xl transition-all text-center"
                        >
                            Giriş Sayfasına Dön
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
