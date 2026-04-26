import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { token, loading, isApproved, role, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !token) {
            router.push("/login");
        }
    }, [token, loading, router]);

    useEffect(() => {
        if (!token || role === "super-admin") return;

        let socket: any = null;

        const connectSocket = async () => {
            const { API_URL } = await import("../utils/config");
            const { io } = await import("socket.io-client");
            
            socket = io(API_URL);

            socket.on("approval-update", (data: { companyId: string, isApproved: boolean }) => {
                try {
                    if (token) {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        if (payload.id === data.companyId && data.isApproved !== isApproved) {
                            window.location.reload();
                        }
                    }
                } catch (err) {
                    console.error("Token parse error:", err);
                }
            });
        };

        connectSocket();

        return () => {
            if (socket) socket.disconnect();
        };
    }, [token, isApproved, role]);

    if (loading || !token) {
        return (
            <div className="flex-1 bg-white dark:bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (isApproved === false && role !== "super-admin") {
        return (
            <div className="flex-1 bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-6">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 max-w-lg w-full text-center shadow-sm border border-amber-200 dark:border-amber-900">
                    <div className="text-6xl mb-6">⏳</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Hesabınız Onay Bekliyor
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        Kayıt işleminiz başarıyla tamamlandı. Ancak platformu kullanmaya başlamak için sistem yöneticimiz tarafından hesabınızın onaylanması gerekmektedir. Lütfen daha sonra tekrar kontrol edin.
                    </p>
                    <button
                        onClick={logout}
                        className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium rounded-xl transition-colors"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
