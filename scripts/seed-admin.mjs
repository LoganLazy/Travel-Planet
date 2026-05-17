import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const resetPassword = process.argv.includes("--reset-password");

if (!email || !password) {
  console.error("[seed-admin] 请在 .env 中配置 ADMIN_EMAIL 和 ADMIN_PASSWORD");
  process.exit(1);
}

const prisma = new PrismaClient();
const normalizedEmail = email.trim().toLowerCase();

try {
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    const data = resetPassword
      ? { isAdmin: true, passwordHash: await bcrypt.hash(password, 10) }
      : { isAdmin: true };
    await prisma.user.update({ where: { email: normalizedEmail }, data });
    console.log(
      `[seed-admin] 已将 ${normalizedEmail} 设为管理员${
        resetPassword ? "（密码已重置）" : "（密码未变）"
      }`,
    );
  } else {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 10),
        isAdmin: true,
        name: "Admin",
      },
    });
    console.log(`[seed-admin] 已创建管理员账号: ${normalizedEmail}`);
  }
} finally {
  await prisma.$disconnect();
}
