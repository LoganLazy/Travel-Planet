"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface RefreshResult {
  processed: number;
  success: number;
  failed: number;
  nextCursor: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<"refresh" | "clear" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.isAdmin) return;
    fetch("/api/admin/attractions")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { count: number } | null) => j && setCount(j.count))
      .catch(() => {});
  }, [session, status, busy]);

  async function clearAll() {
    if (!confirm("确定要清空所有攻略缓存吗？此操作不可撤销。")) return;
    setBusy("clear");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/attractions", { method: "DELETE" });
      const j = (await res.json()) as { deleted?: number; error?: string };
      setMessage(
        res.ok ? `已删除 ${j.deleted ?? 0} 条攻略缓存。` : `失败：${j.error}`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function refreshAll() {
    if (
      !confirm(
        "将对所有缓存攻略重新调用大模型，可能消耗较多 token，确定继续？",
      )
    )
      return;
    setBusy("refresh");
    setMessage(null);
    let cursor: string | undefined;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalProcessed = 0;
    try {
      while (true) {
        const res = await fetch("/api/admin/attractions/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursor, batch: 10 }),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          setMessage(`失败：${j.error}`);
          return;
        }
        const j = (await res.json()) as RefreshResult;
        totalProcessed += j.processed;
        totalSuccess += j.success;
        totalFailed += j.failed;
        setMessage(
          `进度：已处理 ${totalProcessed}，成功 ${totalSuccess}，失败 ${totalFailed}…`,
        );
        if (!j.nextCursor) break;
        cursor = j.nextCursor;
      }
      setMessage(
        `刷新完成：共 ${totalProcessed} 条，成功 ${totalSuccess}，失败 ${totalFailed}。`,
      );
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading") {
    return <div className="flex-1 p-8 text-zinc-400">加载中…</div>;
  }
  if (!session?.user) {
    return (
      <div className="flex-1 p-8 text-zinc-400">
        请先登录。
        <Link href="/login" className="ml-2 underline">
          去登录
        </Link>
      </div>
    );
  }
  if (!session.user.isAdmin) {
    return <div className="flex-1 p-8 text-red-400">仅管理员可访问此页。</div>;
  }

  return (
    <div className="flex-1 bg-black text-white p-6 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">管理员控制台</h1>
      <p className="text-sm text-zinc-400 mb-6">
        当前缓存攻略数：{count ?? "…"}
      </p>

      <div className="space-y-4">
        <Action
          title="批量刷新所有攻略"
          desc="对数据库里所有已缓存的攻略，依次重新调用大模型生成。会消耗较多 token，请确认 LLM 配置可用。"
          buttonText={busy === "refresh" ? "刷新中…" : "开始刷新"}
          buttonClass="bg-amber-600 hover:bg-amber-500"
          disabled={busy !== null}
          onClick={refreshAll}
        />
        <Action
          title="清空攻略缓存"
          desc="删除所有 Attraction 记录（收藏会一并解除）。下次点击地球时会重新生成。"
          buttonText={busy === "clear" ? "清理中…" : "清空"}
          buttonClass="bg-red-600 hover:bg-red-500"
          disabled={busy !== null}
          onClick={clearAll}
        />
      </div>

      {message && (
        <p className="mt-6 text-sm text-zinc-300 border border-zinc-800 rounded p-3 bg-zinc-900">
          {message}
        </p>
      )}
    </div>
  );
}

function Action({
  title,
  desc,
  buttonText,
  buttonClass,
  disabled,
  onClick,
}: {
  title: string;
  desc: string;
  buttonText: string;
  buttonClass: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="text-sm text-zinc-400 mt-1">{desc}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`mt-3 px-3 py-1.5 rounded text-sm font-medium ${buttonClass} disabled:opacity-50`}
      >
        {buttonText}
      </button>
    </div>
  );
}
