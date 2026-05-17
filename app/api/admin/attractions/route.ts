import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const count = await prisma.attraction.count();
  return NextResponse.json({ count });
}

export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await prisma.attraction.deleteMany();
  return NextResponse.json({ deleted: result.count });
}
