export interface ReverseGeocodeResult {
  placeName: string;
  country: string | null;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-CN&zoom=10`;
  const contact = process.env.NOMINATIM_CONTACT;
  if (!contact) {
    // Nominatim 使用政策要求请求带真实联系方式；没配就明确打出来，不要
    // 伪装成一个看起来真实的地址。
    console.warn(
      "[geocode] 未设置 NOMINATIM_CONTACT：Nominatim 使用政策要求提供真实邮箱或仓库地址作为联系方式",
    );
  }
  const userAgent = contact
    ? `TravelGuideApp/1.0 (${contact})`
    : "TravelGuideApp/1.0 (未设置 NOMINATIM_CONTACT)";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = json.address ?? {};
    const placeName =
      a.city ??
      a.town ??
      a.village ??
      a.county ??
      a.state ??
      json.display_name?.split(",")[0]?.trim();
    if (!placeName) return null;
    return { placeName, country: a.country ?? null };
  } catch {
    return null;
  }
}
