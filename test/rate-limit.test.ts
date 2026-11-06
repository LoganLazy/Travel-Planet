import { describe, it, expect, vi, afterEach } from "vitest";
import {
  rateLimit,
  getClientIp,
  getClientIpFromHeaders,
} from "../lib/rate-limit";

let n = 0;
function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${n++}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("限内放行", () => {
    const key = uniq("ok");
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true);
    }
  });

  it("超限拒绝并给出 retryAfter", () => {
    const key = uniq("over");
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
    const r = rateLimit(key, 5, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("窗口过期后恢复", () => {
    vi.useFakeTimers();
    const key = uniq("window");
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 1000);
    expect(rateLimit(key, 3, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, 3, 1000).ok).toBe(true);
  });

  it("不同 key 互不干扰", () => {
    const a = uniq("a");
    const b = uniq("b");
    for (let i = 0; i < 3; i++) rateLimit(a, 3, 60_000);
    expect(rateLimit(a, 3, 60_000).ok).toBe(false);
    expect(rateLimit(b, 3, 60_000).ok).toBe(true);
  });
});

describe("getClientIp", () => {
  function req(headers: Record<string, string>): Request {
    return new Request("http://localhost/", { headers });
  }

  it("取 X-Forwarded-For 的最后一个值", () => {
    expect(
      getClientIp(
        req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9" }),
      ),
    ).toBe("203.0.113.9");
  });

  it("XFF 只有一个值时用它", () => {
    expect(getClientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("伪造前缀 + 真实后缀时取后缀（绕过旧的取首值逻辑）", () => {
    // 攻击者伪造 1.1.1.1，Nginx 在末尾追加真实 IP 203.0.113.9
    expect(
      getClientIp(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" })),
    ).toBe("203.0.113.9");
  });

  it("无 XFF 时用 x-real-ip", () => {
    expect(getClientIp(req({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
  });

  it("两个头都没有返回 unknown", () => {
    expect(getClientIp(req({}))).toBe("unknown");
  });

  it("忽略空段和多余空格", () => {
    expect(
      getClientIp(req({ "x-forwarded-for": " 1.1.1.1 , , 203.0.113.9 " })),
    ).toBe("203.0.113.9");
  });
});

describe("getClientIpFromHeaders（NextAuth authorize 用的记录形式）", () => {
  it("取最后一个值；数组形式的头取第一项再拆", () => {
    expect(
      getClientIpFromHeaders({
        "x-forwarded-for": ["1.1.1.1, 203.0.113.9"],
      }),
    ).toBe("203.0.113.9");
    expect(
      getClientIpFromHeaders({ "x-real-ip": "198.51.100.7" }),
    ).toBe("198.51.100.7");
    expect(getClientIpFromHeaders({})).toBe("unknown");
  });
});
