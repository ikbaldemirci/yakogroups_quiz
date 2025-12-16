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
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-xl font-bold tracking-tight">Yakogroups Quiz</div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Admin Dashboard
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Yakogroups Quiz
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 mb-10">
          Welcome to the ultimate quiz experience. Participate in engaging quizzes, test your knowledge, and compete with others.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/admin"
            className="flex items-center justify-center h-12 px-8 text-base font-semibold text-white bg-zinc-900 rounded-full hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-all"
          >
            Go to Admin Panel
          </Link>
        </div>
      </main>

      <footer className="py-6 text-center text-zinc-500 text-sm">
        &copy; {new Date().getFullYear()} Yakogroups. All rights reserved.
      </footer>
    </div>
  );
}
