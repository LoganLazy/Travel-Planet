"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GuidePanel } from "./GuidePanel";
import { cities, type City } from "@/lib/cities";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export interface Attraction {
  id: string;
  placeName: string;
  country: string | null;
  guide: string;
  lat: number;
  lng: number;
}

const DRAG_THRESHOLD_PX = 6;

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDragRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY };
      isDragRef.current = false;
    };
    const onMove = (e: PointerEvent) => {
      const s = pointerStart.current;
      if (!s) return;
      if (
        Math.abs(e.clientX - s.x) > DRAG_THRESHOLD_PX ||
        Math.abs(e.clientY - s.y) > DRAG_THRESHOLD_PX
      ) {
        isDragRef.current = true;
      }
    };
    const onUp = () => {
      pointerStart.current = null;
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  async function fetchGuide(lat: number, lng: number, refresh = false) {
    const res = await fetch("/api/attractions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, refresh }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `请求失败：${res.status}`);
    }
    return (await res.json()) as Attraction;
  }

  async function loadGuide(lat: number, lng: number) {
    setLoading(true);
    setError(null);
    setAttraction(null);
    try {
      setAttraction(await fetchGuide(lat, lng, false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  async function handleGlobeClick({ lat, lng }: { lat: number; lng: number }) {
    if (isDragRef.current) return;
    await loadGuide(lat, lng);
  }

  async function handleCityClick(city: City) {
    if (isDragRef.current) return;
    await loadGuide(city.lat, city.lng);
  }

  async function handleRefresh() {
    if (!attraction) return;
    setRefreshing(true);
    setError(null);
    try {
      setAttraction(await fetchGuide(attraction.lat, attraction.lng, true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 w-full bg-black">
      {size.w > 0 && (
        <Globe
          width={size.w}
          height={size.h}
          globeImageUrl="/textures/earth-night.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          backgroundImageUrl="/textures/night-sky.png"
          onGlobeClick={handleGlobeClick}
          atmosphereColor="#88aaff"
          atmosphereAltitude={0.2}
          pointsData={cities}
          pointLat={(d: object) => (d as City).lat}
          pointLng={(d: object) => (d as City).lng}
          pointAltitude={0.008}
          pointRadius={0.25}
          pointColor={() => "#ffcc66"}
          pointResolution={6}
          onPointClick={(p: object) => handleCityClick(p as City)}
          onPointHover={(p: object | null) => {
            if (containerRef.current) {
              containerRef.current.style.cursor = p ? "pointer" : "grab";
            }
          }}
        />
      )}
      <div className="pointer-events-none absolute top-3 left-3 right-3 text-zinc-300 text-xs sm:text-sm">
        点黄色城市标记或地球任意位置生成攻略。
      </div>
      <GuidePanel
        attraction={attraction}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onClose={() => setAttraction(null)}
      />
    </div>
  );
}
