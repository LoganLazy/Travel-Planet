import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ attractionId: z.string() });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const list = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      attraction: {
        select: {
          id: true,
          placeName: true,
          country: true,
          lat: true,
          lng: true,
        },
      },
    },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const userId = session.user.id;
  const { attractionId } = parsed.data;

  // 收藏前先确认地点存在：否则 create 会抛 P2003 外键错。
  const attraction = await prisma.attraction.findUnique({
    where: { id: attractionId },
    select: { id: true },
  });
  if (!attraction) {
    return NextResponse.json({ error: "地点不存在" }, { status: 404 });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_attractionId: { userId, attractionId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.favorite
      .delete({ where: { id: existing.id } })
      .catch((e) => {
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== "P2025"
        )
          throw e;
      });
    return NextResponse.json({ favorited: false });
  }
  try {
    await prisma.favorite.create({ data: { userId, attractionId } });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      // 并发下地点在上面查完之后被删：外键错同样映射成 404。
      return NextResponse.json({ error: "地点不存在" }, { status: 404 });
    }
    if (
      !(e instanceof Prisma.PrismaClientKnownRequestError) ||
      e.code !== "P2002"
    )
      throw e;
  }
  return NextResponse.json({ favorited: true });
}
