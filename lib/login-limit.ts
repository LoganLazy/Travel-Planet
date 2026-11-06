import { rateLimit } from "./rate-limit";

/**
 * 登录限流：同一 IP、同一邮箱各 10 次 / 15 分钟。
 *
 * 在 NextAuth 的 authorize 里查用户之前调用（见 lib/auth.ts），命中时直接
 * 返回 null——登录页本来就显示“邮箱或密码错误”，不要泄露到底是密码错还是
 * 被限流；同时记一条 warn 方便排查。限流命中时不要走到 bcrypt，既省 CPU
 * 也避免时序侧信道。
 *
 * 注意：这里统计的是 authorize 的调用次数（含成功登录），不是失败次数。
 * 成功登录也被计数是刻意为之：攻击者无法通过“先成功登录一次再爆破”来
 * 绕过按邮箱的计数。
 */
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60_000;

export function checkLoginAllowed(
  ip: string,
  email: string,
): { ok: boolean } {
  const byIp = rateLimit(`login:ip:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!byIp.ok) return { ok: false };
  const byEmail = rateLimit(
    `login:email:${email}`,
    LOGIN_LIMIT,
    LOGIN_WINDOW_MS,
  );
  if (!byEmail.ok) return { ok: false };
  return { ok: true };
}
