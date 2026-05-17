import { parseGuide, type StructuredGuide } from "./guide-types";

export interface GuideInput {
  placeName: string;
  country?: string | null;
  lat: number;
  lng: number;
}

export interface GuideResult {
  guide: string;
  cacheable: boolean;
}

export async function generateGuide(input: GuideInput): Promise<GuideResult> {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "openai") {
    const guide = await openAICompatibleGuide(input);
    return { guide: JSON.stringify(guide), cacheable: true };
  }
  return { guide: JSON.stringify(mockGuide(input)), cacheable: false };
}

function mockGuide(input: GuideInput): StructuredGuide {
  const { placeName, country } = input;
  const where = country ? `${placeName}（${country}）` : placeName;
  return {
    intro: `${where} 是一座值得探索的目的地。当前为占位攻略，配置 LLM_PROVIDER=openai 后将由大模型生成真实内容。`,
    attractions: [
      { name: "示例景点 A", description: "代表性人文景观，建议游玩 2 小时。" },
      { name: "示例景点 B", description: "自然风光，适合拍照和散步。" },
      { name: "示例景点 C", description: "当地博物馆，了解城市历史。" },
    ],
    food: [
      { name: "当地特色菜", description: "必尝的招牌菜。" },
      { name: "传统小吃", description: "街头巷尾随处可见。" },
    ],
    accommodation: [
      { name: "市中心区域", description: "交通便利，餐饮和景点都在步行范围内。" },
      { name: "老城区民宿", description: "性价比高，体验本地生活。" },
    ],
    season: "春秋两季气候宜人，适合出行。",
    transport: "市内可乘坐公共交通或打车，景点之间步行可达。",
    tips: ["提前查好开放时间", "注意保管好随身物品", "尊重当地风俗"],
  };
}

async function openAICompatibleGuide(input: GuideInput): Promise<StructuredGuide> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  if (!apiKey) throw new Error("LLM_API_KEY 未配置");

  const prompt = `请用中文为以下地点生成一份详细的旅游攻略。
必须严格按照下面的 JSON 结构返回，不要输出任何 JSON 之外的文字、解释或代码块标记。

{
  "intro": "地点简介，2-3 句话",
  "attractions": [{ "name": "景点名", "description": "一句话描述" }],
  "food": [{ "name": "美食名", "description": "一句话描述" }],
  "accommodation": [{ "name": "推荐住宿区域/类型", "description": "推荐理由" }],
  "season": "最佳旅游季节描述，一段话",
  "transport": "交通建议，一段话",
  "tips": ["注意事项1", "注意事项2"]
}

要求:
- attractions 至少 5 项
- food 至少 3 项
- accommodation 至少 2 项
- tips 至少 3 项

地点：${input.placeName}${input.country ? `（${input.country}）` : ""}
经纬度：${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM 请求失败：${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "";
  const parsed = parseGuide(raw);
  if (!parsed) {
    console.error(
      "[llm] parse failed. raw content:",
      JSON.stringify(raw),
      "full response:",
      JSON.stringify(json).slice(0, 1000),
    );
    throw new Error(
      `LLM 返回无法解析为攻略 JSON: ${raw.slice(0, 200) || "(空响应)"}`,
    );
  }
  return parsed;
}
