import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { token, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !token) {
            router.push("/login");
        }
    }, [token, loading, router]);

    if (loading || !token) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return <>{children}</>;
}
