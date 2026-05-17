import { z } from "zod";

const itemSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const guideSchema = z.object({
  intro: z.string(),
  attractions: z.array(itemSchema),
  food: z.array(itemSchema),
  accommodation: z.array(itemSchema),
  season: z.string(),
  transport: z.string(),
  tips: z.array(z.string()),
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
