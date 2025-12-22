import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Navbar() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [companyName, setCompanyName] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedCompanyName = localStorage.getItem("companyName");
        if (token) {
            setIsLoggedIn(true);
            setCompanyName(storedCompanyName || "Admin");
        } else {
            setIsLoggedIn(false);
        }
    }, [router.asPath]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("companyName");
        setIsLoggedIn(false);
        router.push("/login");
    };

    return (
        <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-[100]">
            <Link href="/" className="flex items-center gap-2">
                <img
                    src="https://www.yakogroups.com/wp-content/themes/yakogroup/assets/img/logo.png"
                    alt="Yako Groups"
                    className="h-8 w-auto object-contain dark:invert"
                />
            </Link>
            <div className="flex items-center gap-4">
                {isLoggedIn ? (
                    <>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                            Hoş geldin, <span className="text-blue-600 font-bold">{companyName}</span>
                        </span>
                        <Link
                            href="/admin"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Dashboard
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Çıkış Yap
                        </button>
                    </>
                ) : (
                    <Link
                        href="/signup"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Admin Dashboard
                    </Link>
                )}
            </div>
        </nav>
    );
}
