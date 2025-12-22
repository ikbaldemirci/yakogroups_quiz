import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

interface AuthContextType {
    token: string | null;
    companyName: string | null;
    role: string | null;
    login: (token: string, companyName: string, role: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const savedToken = localStorage.getItem("token");
        const savedName = localStorage.getItem("companyName");
        const savedRole = localStorage.getItem("role");
        if (savedToken) {
            setToken(savedToken);
            setCompanyName(savedName);
            setRole(savedRole);
        }
        setLoading(false);
    }, []);

    const login = (newToken: string, newName: string, newRole: string) => {
        setToken(newToken);
        setCompanyName(newName);
        setRole(newRole);
        localStorage.setItem("token", newToken);
        localStorage.setItem("companyName", newName);
        localStorage.setItem("role", newRole);
    };

    const logout = () => {
        setToken(null);
        setCompanyName(null);
        setRole(null);
        localStorage.removeItem("token");
        localStorage.removeItem("companyName");
        localStorage.removeItem("role");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ token, companyName, role, login, logout, loading }}>
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
