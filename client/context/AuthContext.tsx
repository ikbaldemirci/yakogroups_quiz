import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

interface AuthContextType {
    token: string | null;
    companyName: string | null;
    role: string | null;
    logo: string | null;
    isApproved: boolean | null;
    login: (token: string, companyName: string, role: string, isApproved?: boolean, logo?: string) => void;
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
    const [isApproved, setIsApproved] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initializeAuth = async () => {
            const savedToken = localStorage.getItem("token");
            const savedName = localStorage.getItem("companyName");
            const savedRole = localStorage.getItem("role");
            const savedLogo = localStorage.getItem("logo");
            const savedIsApproved = localStorage.getItem("isApproved");

            if (savedToken) {
                setToken(savedToken);
                setCompanyName(savedName);
                setRole(savedRole);
                setLogo(savedLogo);
                setIsApproved(savedIsApproved === "true");

                try {
                    const { API_URL } = await import("../utils/config");
                    const res = await fetch(`${API_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${savedToken}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setIsApproved(data.isApproved);
                        setRole(data.role);
                        if (data.logo) setLogo(data.logo);
                        
                        localStorage.setItem("isApproved", String(data.isApproved));
                        localStorage.setItem("role", data.role);
                        if (data.logo) localStorage.setItem("logo", data.logo);
                    } else if (res.status === 401 || res.status === 404) {
                        localStorage.clear();
                        setToken(null);
                    }
                } catch (err) {
                    console.error("Auth sync error:", err);
                }
            }
            setLoading(false);
        };
        initializeAuth();
    }, []);

    const login = (newToken: string, newName: string, newRole: string, newIsApproved?: boolean, newLogo?: string) => {
        setToken(newToken);
        setCompanyName(newName);
        setRole(newRole);
        const resolvedApproval = newIsApproved ?? false;
        setIsApproved(resolvedApproval);
        setLogo(newLogo || null);
        localStorage.setItem("token", newToken);
        localStorage.setItem("companyName", newName);
        localStorage.setItem("role", newRole);
        localStorage.setItem("isApproved", resolvedApproval.toString());
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
        setIsApproved(null);
        localStorage.removeItem("token");
        localStorage.removeItem("companyName");
        localStorage.removeItem("role");
        localStorage.removeItem("logo");
        localStorage.removeItem("isApproved");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ token, companyName, role, logo, isApproved, login, updateLogo, logout, loading }}>
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
