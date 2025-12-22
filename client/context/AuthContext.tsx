import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

interface AuthContextType {
    token: string | null;
    companyName: string | null;
    login: (token: string, companyName: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const savedToken = localStorage.getItem("token");
        const savedName = localStorage.getItem("companyName");
        if (savedToken) {
            setToken(savedToken);
            setCompanyName(savedName);
        }
        setLoading(false);
    }, []);

    const login = (newToken: string, newName: string) => {
        setToken(newToken);
        setCompanyName(newName);
        localStorage.setItem("token", newToken);
        localStorage.setItem("companyName", newName);
    };

    const logout = () => {
        setToken(null);
        setCompanyName(null);
        localStorage.removeItem("token");
        localStorage.removeItem("companyName");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ token, companyName, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
