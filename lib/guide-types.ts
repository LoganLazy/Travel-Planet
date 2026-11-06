import { z } from "zod";

// 下限与 lib/llm.ts 提示词里的要求一致；上限防止异常大模型输出把超大
// 文本写进数据库。
const itemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
});

export const guideSchema = z.object({
  intro: z.string().min(1).max(2000),
  attractions: z.array(itemSchema).min(5).max(20),
  food: z.array(itemSchema).min(3).max(20),
  accommodation: z.array(itemSchema).min(2).max(20),
  season: z.string().min(1).max(2000),
  transport: z.string().min(1).max(2000),
  tips: z.array(z.string().min(1).max(1000)).min(3).max(20),
});

export type StructuredGuide = z.infer<typeof guideSchema>;

export function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

export function parseGuide(raw: string): StructuredGuide | null {
  if (!raw) return null;
  const stripped = stripCodeFence(raw);
  const candidates = [stripped, extractJsonObject(stripped)].filter(
    (s): s is string => Boolean(s),
  );
  for (const c of candidates) {
    try {
      return guideSchema.parse(JSON.parse(c));
    } catch {}
  }
  return null;
}
