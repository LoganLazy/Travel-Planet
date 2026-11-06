import { describe, it, expect } from "vitest";
import { checkLoginAllowed } from "../lib/login-limit";

let n = 0;
function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${n++}`;
}

describe("checkLoginAllowed", () => {
  it("同一 IP 10 次后拒绝", () => {
    const ip = uniq("ip");
    for (let i = 0; i < 10; i++) {
      expect(checkLoginAllowed(ip, uniq("mail")).ok).toBe(true);
    }
    expect(checkLoginAllowed(ip, uniq("mail")).ok).toBe(false);
  });

  it("同一邮箱 10 次后拒绝（换 IP 也没用）", () => {
    const email = uniq("mail") + "@example.com";
    for (let i = 0; i < 10; i++) {
      expect(checkLoginAllowed(uniq("ip"), email).ok).toBe(true);
    }
    expect(checkLoginAllowed(uniq("ip"), email).ok).toBe(false);
  });

  it("不同 IP / 邮箱互不干扰", () => {
    const email = uniq("mail") + "@example.com";
    for (let i = 0; i < 10; i++) checkLoginAllowed(uniq("ip"), email);
    expect(checkLoginAllowed(uniq("ip"), email).ok).toBe(false);
    // 全新的 IP + 邮箱不受影响
    expect(checkLoginAllowed(uniq("ip"), uniq("mail") + "@example.com").ok).toBe(
      true,
    );
  });

  it("限内放行", () => {
    expect(
      checkLoginAllowed(uniq("ip"), uniq("mail") + "@example.com").ok,
    ).toBe(true);
  });
});
