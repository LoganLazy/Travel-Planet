import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ favorited: false });
  }
  const attractionId = new URL(req.url).searchParams.get("attractionId");
  if (!attractionId) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const found = await prisma.favorite.findUnique({
    where: { userId_attractionId: { userId: session.user.id, attractionId } },
    select: { id: true },
  });
  return NextResponse.json({ favorited: Boolean(found) });
}
