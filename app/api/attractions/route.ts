import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reverseGeocode } from "@/lib/geocode";
import { generateGuide } from "@/lib/llm";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "仅管理员可刷新攻略" },
        { status: 403 },
      );
    }
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
