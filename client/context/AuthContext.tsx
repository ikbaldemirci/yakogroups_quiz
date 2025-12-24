import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

interface AuthContextType {
    token: string | null;
    companyName: string | null;
    role: string | null;
    logo: string | null;
    login: (token: string, companyName: string, role: string, logo?: string) => void;
    updateLogo: (newLogo: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [logo, setLogo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const savedToken = localStorage.getItem("token");
        const savedName = localStorage.getItem("companyName");
        const savedRole = localStorage.getItem("role");
        const savedLogo = localStorage.getItem("logo");
        if (savedToken) {
            setToken(savedToken);
            setCompanyName(savedName);
            setRole(savedRole);
            setLogo(savedLogo);
        }
        setLoading(false);
    }, []);

    const login = (newToken: string, newName: string, newRole: string, newLogo?: string) => {
        setToken(newToken);
        setCompanyName(newName);
        setRole(newRole);
        setLogo(newLogo || null);
        localStorage.setItem("token", newToken);
        localStorage.setItem("companyName", newName);
        localStorage.setItem("role", newRole);
        if (newLogo) localStorage.setItem("logo", newLogo);
    };

    const updateLogo = (newLogo: string) => {
        setLogo(newLogo);
        localStorage.setItem("logo", newLogo);
    };

    const logout = () => {
        setToken(null);
        setCompanyName(null);
        setRole(null);
        setLogo(null);
        localStorage.removeItem("token");
        localStorage.removeItem("companyName");
        localStorage.removeItem("role");
        localStorage.removeItem("logo");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ token, companyName, role, logo, login, updateLogo, logout, loading }}>
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
