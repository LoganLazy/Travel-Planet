"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("邮箱或密码错误");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-8 rounded-2xl border border-zinc-800 bg-zinc-900"
      >
        <h1 className="text-2xl font-semibold">登录</h1>
        <input
          type="email"
          required
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 outline-none focus:border-zinc-500"
        />
        <input
          type="password"
          required
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 outline-none focus:border-zinc-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "登录中…" : "登录"}
        </button>
        <p className="text-sm text-zinc-400">
          没有账号？
          <Link href="/register" className="ml-1 text-white hover:underline">
            去注册
          </Link>
        </p>
      </form>
    </div>
  );
}
