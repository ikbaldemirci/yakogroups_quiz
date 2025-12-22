import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col`}
    >
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Yakogroups Quiz
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 mb-10">
          Quiz deneyimine hoş geldiniz. İlgi çekici sınavlara katılın, bilginizi test edin ve diğerleriyle yarışın.
        </p>
      </main>

      <footer className="py-6 text-center text-zinc-500 text-sm">
        &copy; {new Date().getFullYear()} Yakogroups. All rights reserved.
      </footer>
    </div>
  );
}
