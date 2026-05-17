export interface ReverseGeocodeResult {
  placeName: string;
  country: string | null;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-CN&zoom=10`;
  const contact =
    process.env.NOMINATIM_CONTACT ?? "https://github.com/your-repo/travel";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `TravelGuideApp/1.0 (${contact})` },
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
