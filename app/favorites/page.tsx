"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FavoriteItem {
  id: string;
  attraction: {
    id: string;
    placeName: string;
    country: string | null;
    lat: number;
    lng: number;
  };
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/favorites")
      .then(async (r) => {
        if (r.status === 401) {
          setError("请先登录");
          return [];
        }
        return r.json();
      })
      .then(setItems)
      .catch(() => setError("加载失败"));
  }, []);

  return (
    <div className="flex-1 bg-black text-white p-6 sm:p-8">
      <h1 className="text-2xl font-semibold mb-6">我的收藏</h1>
      {error && (
        <p className="text-zinc-400">
          {error}
          {error === "请先登录" && (
            <Link href="/login" className="ml-2 underline">
              去登录
            </Link>
          )}
        </p>
      )}
      {!error && items && items.length === 0 && (
        <p className="text-zinc-400">还没有收藏，去地球上点一点吧。</p>
      )}
      {!error && items && items.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <h2 className="text-lg font-medium">
                {item.attraction.placeName}
              </h2>
              {item.attraction.country && (
                <p className="text-sm text-zinc-400">
                  {item.attraction.country}
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                {item.attraction.lat.toFixed(2)},{" "}
                {item.attraction.lng.toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
