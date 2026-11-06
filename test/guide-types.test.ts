import { describe, it, expect } from "vitest";
import { parseGuide, guideSchema } from "../lib/guide-types";
import { mockGuide } from "../lib/llm";

function validGuide() {
  return {
    intro: "一座值得探索的城市。",
    attractions: Array.from({ length: 5 }, (_, i) => ({
      name: `景点 ${i + 1}`,
      description: "值得一去。",
    })),
    food: Array.from({ length: 3 }, (_, i) => ({
      name: `美食 ${i + 1}`,
      description: "必尝。",
    })),
    accommodation: Array.from({ length: 2 }, (_, i) => ({
      name: `住宿 ${i + 1}`,
      description: "方便。",
    })),
    season: "春秋适宜。",
    transport: "公共交通方便。",
    tips: ["提示一", "提示二", "提示三"],
  };
}

describe("parseGuide", () => {
  it("合法 JSON 能解析", () => {
    const parsed = parseGuide(JSON.stringify(validGuide()));
    expect(parsed?.intro).toBe("一座值得探索的城市。");
    expect(parsed?.attractions).toHaveLength(5);
  });

  it("带 ```json 代码围栏能解析", () => {
    const parsed = parseGuide(
      "```json\n" + JSON.stringify(validGuide()) + "\n```",
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.food).toHaveLength(3);
  });

  it("前后夹杂文字能提取出 JSON 对象", () => {
    const parsed = parseGuide(
      "这是你要的攻略：\n" +
        JSON.stringify(validGuide()) +
        "\n祝旅途愉快！",
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.tips).toHaveLength(3);
  });

  it("空数组被拒绝（下限）", () => {
    expect(parseGuide(JSON.stringify({ ...validGuide(), attractions: [] }))).toBeNull();
    expect(parseGuide(JSON.stringify({ ...validGuide(), food: [] }))).toBeNull();
    expect(parseGuide(JSON.stringify({ ...validGuide(), tips: [] }))).toBeNull();
  });

  it("数量不够下限被拒绝", () => {
    expect(
      parseGuide(
        JSON.stringify({
          ...validGuide(),
          attractions: validGuide().attractions.slice(0, 4),
        }),
      ),
    ).toBeNull();
  });

  it("缺字段被拒绝", () => {
    const { intro, ...rest } = validGuide();
    void intro;
    expect(parseGuide(JSON.stringify(rest))).toBeNull();
  });

  it("空字符串被拒绝", () => {
    expect(
      parseGuide(JSON.stringify({ ...validGuide(), intro: "" })),
    ).toBeNull();
    expect(
      parseGuide(
        JSON.stringify({
          ...validGuide(),
          attractions: [{ name: "", description: "x" }],
        }),
      ),
    ).toBeNull();
  });

  it("超长字段被拒绝（上限）", () => {
    expect(
      parseGuide(
        JSON.stringify({ ...validGuide(), intro: "x".repeat(2001) }),
      ),
    ).toBeNull();
    expect(
      parseGuide(
        JSON.stringify({
          ...validGuide(),
          attractions: Array.from({ length: 21 }, (_, i) => ({
            name: `景点 ${i}`,
            description: "x",
          })),
        }),
      ),
    ).toBeNull();
  });

  it("不是 JSON 时返回 null", () => {
    expect(parseGuide("这里没有 JSON")).toBeNull();
    expect(parseGuide("")).toBeNull();
  });
});

describe("mockGuide", () => {
  it("占位攻略本身能通过 guideSchema", () => {
    const guide = mockGuide({ placeName: "北京", country: "中国", lat: 39.9, lng: 116.4 });
    const result = guideSchema.safeParse(guide);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attractions.length).toBeGreaterThanOrEqual(5);
      expect(result.data.food.length).toBeGreaterThanOrEqual(3);
    }
  });
});
