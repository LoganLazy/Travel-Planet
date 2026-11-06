type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/**
 * 从请求头里取客户端 IP。
 *
 * 取 X-Forwarded-For 的**最后一个**值，而不是第一个：链上的每个代理都会把
 * 直接连它的对端 IP 追加到末尾，所以最后一个值是由离服务器最近的可信代理
 * （本站部署文档里的 Nginx，`$proxy_add_x_forwarded_for`）追加的真实客户
 * 端 IP；请求方自己伪造的值只会出现在前面的位置。取第一个值的话，攻击者
 * 随便换一个假 IP 就能绕过按 IP 计数的限流。
 *
 * 前提：服务器前面只有一层可信反代（Nginx），且它透传了
 * `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`。
 * 如果没有经过反代（直连开发环境），XFF 只有一个值，直接用它。
 */
export function getClientIpFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string {
  const fwd = headers["x-forwarded-for"];
  const fwdValue = Array.isArray(fwd) ? fwd[0] : fwd;
  if (fwdValue) {
    const parts = fwdValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  const realIp = headers["x-real-ip"];
  const realValue = Array.isArray(realIp) ? realIp[0] : realIp;
  if (realValue) return realValue.trim();
  return "unknown";
}

export function getClientIp(req: Request): string {
  return getClientIpFromHeaders({
    "x-forwarded-for": req.headers.get("x-forwarded-for") ?? undefined,
    "x-real-ip": req.headers.get("x-real-ip") ?? undefined,
  });
}
