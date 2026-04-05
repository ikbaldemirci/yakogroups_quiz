import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-[100dvh]">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Component {...pageProps} />
        </main>
      </div>
    </AuthProvider>
  );
}

