import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkLoginAllowed } from "./login-limit";
import { getClientIpFromHeaders } from "./rate-limit";

const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.ck6V1n8H5mC0qg6oLQ8XQ7wQo3Vy";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        // 限流在查用户之前：命中时不走 bcrypt，直接返回 null（与密码错误
        // 同样的表现，不泄露限流状态）。
        const ip = getClientIpFromHeaders(req?.headers ?? {});
        if (!checkLoginAllowed(ip, email).ok) {
          console.warn(
            `[auth] 登录限流命中 ip=${ip} email=${email}`,
          );
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const ok = await bcrypt.compare(credentials.password, hash);
        if (!user || !ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  // JWT 会话默认 30 天有效且无法吊销：被撤权的管理员在这 30 天内仍持有
  // 旧 JWT。缩短到 1 天，把撤权后的窗口期压到一天以内。
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
