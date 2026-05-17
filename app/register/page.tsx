"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, website }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "注册失败");
        return;
      }
      const signRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signRes?.error) {
        setError("注册成功，但自动登录失败，请手动登录");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-8 rounded-2xl border border-zinc-800 bg-zinc-900"
      >
        <h1 className="text-2xl font-semibold">注册</h1>
        <input
          type="email"
          required
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 outline-none focus:border-zinc-500"
        />
        <input
          type="text"
          placeholder="昵称（可选）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 outline-none focus:border-zinc-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 outline-none focus:border-zinc-500"
        />
        <div aria-hidden className="absolute -left-[9999px] -top-[9999px]">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "注册中…" : "注册"}
        </button>
        <p className="text-sm text-zinc-400">
          已有账号？
          <Link href="/login" className="ml-1 text-white hover:underline">
            去登录
          </Link>
        </p>
      </form>
    </div>
  );
}
