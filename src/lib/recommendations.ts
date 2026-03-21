/**
 * Haversine distance between two lat/lng points in kilometres.
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type VisitType = "Quick Smoke" | "Full Evening";
export type VenueType = "Lounge" | "Shop" | "All";

export interface LoungeWithCoords {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  connoisseur_score: number | null;
  visit_type: string | null;
  type: string;
  address: string | null;
  image_url: string | null;
  image_url_cached?: string | null;
  score_label: string | null;
  score_source: string;
  score_summary?: string | null;
  rating: number;
  city_id: string;
  city_name?: string;
  city_slug?: string;
}

export interface RecommendedLounge extends LoungeWithCoords {
  recommendationScore: number;
  distanceKm: number;
}

export function getRecommendations(
  userLat: number,
  userLng: number,
  visitType: VisitType,
  lounges: LoungeWithCoords[],
  venueType: VenueType = "All",
): RecommendedLounge[] {
  return lounges
    .filter((l) => l.latitude != null && l.longitude != null)
    .filter((l) => {
      if (venueType === "All") return true;
      const t = (l.type || "lounge").toLowerCase();
      if (venueType === "Lounge") return t === "lounge" || t === "both";
      if (venueType === "Shop") return t === "shop" || t === "both";
      return true;
    })
    .map((lounge) => {
      const distanceKm = haversine(
        userLat,
        userLng,
        lounge.latitude!,
        lounge.longitude!,
      );

      const proximityScore = Math.max(0, 100 - distanceKm * 2);
      const connoisseurScore = lounge.connoisseur_score ?? 50;
      const visitMatch =
        lounge.visit_type === visitType || lounge.visit_type === "Both"
          ? 100
          : 0;

      const recommendationScore =
        connoisseurScore * 0.6 + proximityScore * 0.3 + visitMatch * 0.1;

      return { ...lounge, recommendationScore, distanceKm };
    })
    .filter((l) => l.distanceKm <= 50)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 20);
}

export type VenuePreference = "lounge" | "shop" | "both";

export function buildItinerary(
  lounges: LoungeWithCoords[],
  stopCount: number,
  preference: VenuePreference,
): LoungeWithCoords[] {
  let pool = lounges
    .filter((l) => {
      const t = (l.type || "lounge").toLowerCase();
      if (preference === "lounge") return t === "lounge" || t === "both";
      if (preference === "shop") return t === "shop" || t === "both";
      return true;
    })
    .filter((l) => l.connoisseur_score != null);

  pool.sort((a, b) => (b.connoisseur_score ?? 0) - (a.connoisseur_score ?? 0));

  if (pool.length === 0) return [];

  const selected: LoungeWithCoords[] = [];
  const usedIds = new Set<string>();

  // Rule: if preference is "both" and there's a shop in top candidates, put it first
  if (preference === "both") {
    const topShop = pool.find((l) => {
      const t = l.type.toLowerCase();
      return (t === "shop" || t === "both") && !usedIds.has(l.id);
    });
    if (topShop && pool.indexOf(topShop) < stopCount * 2) {
      selected.push(topShop);
      usedIds.add(topShop.id);
    }
  }

  // Fill remaining stops from top scored, alternating type where possible
  for (const l of pool) {
    if (selected.length >= stopCount) break;
    if (usedIds.has(l.id)) continue;
    const lastType = selected[selected.length - 1]?.type?.toLowerCase();
    const thisType = l.type?.toLowerCase();
    if (
      selected.length >= 2 &&
      lastType === thisType &&
      thisType === "lounge" &&
      pool.some(
        (p) => !usedIds.has(p.id) && p.type?.toLowerCase() !== "lounge",
      )
    )
      continue;
    selected.push(l);
    usedIds.add(l.id);
  }

  // If still not enough stops, fill without type constraint
  for (const l of pool) {
    if (selected.length >= stopCount) break;
    if (usedIds.has(l.id)) continue;
    selected.push(l);
    usedIds.add(l.id);
  }

  return selected;
}
