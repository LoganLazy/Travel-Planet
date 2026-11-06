import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reverseGeocode } from "@/lib/geocode";
import { generateGuide } from "@/lib/llm";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-guard";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  refresh: z.boolean().optional(),
});

function geoKey(lat: number, lng: number) {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const { lat, lng, refresh } = parsed.data;
  const key = geoKey(lat, lng);

  if (refresh) {
    // 不要只认 JWT 里的 isAdmin：JWT 在签发后无法吊销，被撤权的管理员在
    // 会话有效期内仍持有旧 token。requireAdmin 每次都查库，和 /api/admin/*
    // 的做法一致。
    const denied = await requireAdmin();
    if (denied) return denied;
    const place = await reverseGeocode(lat, lng);
    if (!place) {
      return NextResponse.json(
        { error: "无法识别该位置，请稍后再试" },
        { status: 502 },
      );
    }
    const { guide } = await generateGuide({ ...place, lat, lng });
    const updated = await prisma.attraction.upsert({
      where: { geoKey: key },
      update: { ...place, guide },
      create: { geoKey: key, lat, lng, ...place, guide },
    });
    return NextResponse.json(updated);
  }

  const cached = await prisma.attraction.findUnique({ where: { geoKey: key } });
  if (cached) return NextResponse.json(cached);

  const limit = rateLimit(`attractions:${getClientIp(req)}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${limit.retryAfter} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const place = await reverseGeocode(lat, lng);
  if (!place) {
    return NextResponse.json(
      { error: "无法识别该位置，请稍后再试" },
      { status: 502 },
    );
  }
  const { guide, cacheable } = await generateGuide({ ...place, lat, lng });

  if (!cacheable) {
    return NextResponse.json({
      id: `transient:${key}`,
      geoKey: key,
      lat,
      lng,
      ...place,
      guide,
    });
  }

  try {
    const created = await prisma.attraction.create({
      data: { geoKey: key, lat, lng, ...place, guide },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await prisma.attraction.findUnique({
        where: { geoKey: key },
      });
      if (existing) return NextResponse.json(existing);
    }
    throw e;
  }
}
