import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { reverseGeocode } from "@/lib/geocode";
import { generateGuide } from "@/lib/llm";
import { requireAdmin } from "@/lib/admin-guard";

// 注意：maxDuration 只在 Vercel 部署上生效（Pro 套餐上限 300 秒，免费版
// 会被钳制到更小的值）；aPanel 自建部署（PM2 + Nginx）下这个值会被忽略，
// 超时由 Nginx / PM2 的配置决定。
export const maxDuration = 300;

const schema = z.object({
  cursor: z.string().optional(),
  batch: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const cursor = parsed.success ? parsed.data.cursor : undefined;
  const batch = parsed.success ? (parsed.data.batch ?? 10) : 10;

  const list = await prisma.attraction.findMany({
    select: { id: true, lat: true, lng: true },
    orderBy: { id: "asc" },
    take: batch,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let success = 0;
  const failures: { id: string; error: string }[] = [];

  for (const item of list) {
    try {
      const place = await reverseGeocode(item.lat, item.lng);
      if (!place) throw new Error("反向地理编码失败");
      const { guide } = await generateGuide({
        ...place,
        lat: item.lat,
        lng: item.lng,
      });
      await prisma.attraction.update({
        where: { id: item.id },
        data: { ...place, guide },
      });
      success++;
      await new Promise((r) => setTimeout(r, 1100));
    } catch (e) {
      failures.push({
        id: item.id,
        error: e instanceof Error ? e.message : "未知错误",
      });
    }
  }

  const nextCursor =
    list.length === batch ? list[list.length - 1]!.id : null;

  return NextResponse.json({
    processed: list.length,
    success,
    failed: failures.length,
    failures,
    nextCursor,
  });
}
