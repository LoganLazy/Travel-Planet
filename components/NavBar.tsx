"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session, status } = useSession();
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-black/60 backdrop-blur z-10">
      <Link href="/" className="text-lg font-semibold text-white">
        旅行星球
      </Link>
      <nav className="flex items-center gap-4 text-sm text-zinc-300">
        <Link href="/favorites" className="hover:text-white">
          我的收藏
        </Link>
        {session?.user?.isAdmin && (
          <Link href="/admin" className="hover:text-white text-amber-400">
            管理
          </Link>
        )}
        {status === "loading" ? null : session?.user ? (
          <>
            <span className="text-zinc-400">
              {session.user.name ?? session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
            >
              退出
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-white">
              登录
            </Link>
            <Link
              href="/register"
              className="px-3 py-1 rounded bg-white text-black hover:bg-zinc-200"
            >
              注册
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
