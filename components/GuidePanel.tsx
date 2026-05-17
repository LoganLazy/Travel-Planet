"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Attraction } from "./GlobeView";
import { parseGuide } from "@/lib/guide-types";
import { GuideContent } from "./GuideContent";

interface Props {
  attraction: Attraction | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function GuidePanel({
  attraction,
  loading,
  error,
  onClose,
  onRefresh,
  refreshing,
}: Props) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);

  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin);
  const persistent =
    attraction != null && !attraction.id.startsWith("transient:");
  const checkId = persistent && userId && attraction ? attraction.id : null;

  const [trackedId, setTrackedId] = useState<string | null>(null);
  if (trackedId !== checkId) {
    setTrackedId(checkId);
    setFavorited(false);
  }

  useEffect(() => {
    if (!checkId) return;
    let cancelled = false;
    fetch(`/api/favorites/check?attractionId=${encodeURIComponent(checkId)}`)
      .then((r) => (r.ok ? r.json() : { favorited: false }))
      .then((j: { favorited: boolean }) => {
        if (!cancelled) setFavorited(Boolean(j.favorited));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [checkId]);

  const guide = useMemo(
    () => (attraction ? parseGuide(attraction.guide) : null),
    [attraction],
  );

  async function toggleFavorite() {
    if (!attraction || !persistent) return;
    setPending(true);
    setShowLoginHint(false);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attractionId: attraction.id }),
      });
      if (res.status === 401) {
        setShowLoginHint(true);
        return;
      }
      const j = (await res.json()) as { favorited: boolean };
      setFavorited(Boolean(j.favorited));
    } finally {
      setPending(false);
    }
  }

  if (!attraction && !loading && !error) return null;

  return (
    <div
      className="
        absolute z-20 overflow-y-auto
        bg-zinc-900/95 text-zinc-100 shadow-2xl border border-zinc-800 backdrop-blur
        inset-x-0 bottom-0 max-h-[75vh] rounded-t-2xl
        sm:inset-x-auto sm:bottom-4 sm:top-4 sm:right-4 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-2xl
      "
    >
      <div className="sticky top-0 flex items-center justify-between px-5 py-3 bg-zinc-900/95 border-b border-zinc-800">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate">
            {loading ? "正在生成攻略…" : (attraction?.placeName ?? "提示")}
          </h2>
          {attraction?.country && (
            <p className="text-xs text-zinc-400 truncate">
              {attraction.country}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {attraction && isAdmin && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="text-xs sm:text-sm px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
              title="重新调用大模型生成攻略"
            >
              {refreshing ? "刷新中…" : "刷新"}
            </button>
          )}
          {attraction && persistent && (
            <button
              onClick={toggleFavorite}
              disabled={pending}
              className="text-xs sm:text-sm px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            >
              {favorited ? "已收藏" : "收藏"}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed">
        {loading && <p className="text-zinc-400">请稍候，正在为你生成攻略…</p>}
        {error && <p className="text-red-400">出错了：{error}</p>}
        {showLoginHint && (
          <p className="mb-3 text-xs text-amber-300">
            请先{" "}
            <Link href="/login" className="underline">
              登录
            </Link>{" "}
            后再收藏。
          </p>
        )}
        {attraction && !persistent && (
          <p className="mb-3 text-xs text-zinc-500">
            当前为占位攻略，未持久化；配置 LLM 后再点同一位置即可保存并收藏。
          </p>
        )}
        {attraction && guide && <GuideContent guide={guide} />}
        {attraction && !guide && (
          <pre className="whitespace-pre-wrap font-sans text-zinc-300">
            {attraction.guide}
          </pre>
        )}
      </div>
    </div>
  );
}
