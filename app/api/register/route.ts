import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("邮箱格式不正确").max(254),
  password: z.string().min(6, "密码至少 6 位").max(128),
  name: z.string().max(40).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`register:ip:${ip}`, 5, 60 * 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `注册过于频繁，请 ${ipLimit.retryAfter} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  if (parsed.data.website) {
    return NextResponse.json({ id: "ok" }, { status: 201 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { password, name } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name?.trim() || null },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json({ error: "邮箱已被注册" }, { status: 409 });
    }
    throw e;
  }
}
