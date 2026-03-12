import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PendingLounge = Tables<"pending_lounges">;

// Cache to prevent parallel city creation race conditions
const cityCache = new Map<string, string>();

export async function getOrCreateCity(cityName: string, country: string): Promise<string> {
  const cacheKey = `${cityName}|${country}`;
  if (cityCache.has(cacheKey)) return cityCache.get(cacheKey)!;

  let { data: city } = await supabase
    .from("cities")
    .select("id")
    .eq("name", cityName)
    .maybeSingle();

  if (!city) {
    const slug = cityName.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const { data: newCity, error: cityErr } = await supabase
      .from("cities")
      .insert({ name: cityName, country, slug })
      .select("id")
      .single();

    if (cityErr) {
      const { data: existing } = await supabase
        .from("cities")
        .select("id")
        .eq("name", cityName)
        .maybeSingle();
      if (!existing) {
        const { data: bySlug } = await supabase
          .from("cities")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!bySlug) throw cityErr;
        city = bySlug;
      } else {
        city = existing;
      }
    } else {
      city = newCity;
    }
  }

  cityCache.set(cacheKey, city!.id);
  return city!.id;
}

export async function approveLounge(lounge: PendingLounge, userId: string) {
  const cityId = await getOrCreateCity(lounge.city_name, lounge.country);

  const { error: loungeErr } = await supabase.from("lounges").upsert({
    name: lounge.name, slug: lounge.slug, city_id: cityId, type: lounge.type,
    address: lounge.address, description: lounge.description, phone: lounge.phone,
    website: lounge.website, rating: lounge.rating || 0, review_count: lounge.review_count || 0,
    price_tier: lounge.price_tier || 2, features: lounge.features,
    cigar_highlights: lounge.cigar_highlights, image_url: lounge.image_url,
    gallery: lounge.gallery, latitude: lounge.latitude, longitude: lounge.longitude,
    hours: lounge.hours, google_place_id: lounge.google_place_id,
  }, { onConflict: "city_id,slug" });
  if (loungeErr) throw loungeErr;

  const { count } = await supabase.from("lounges").select("id", { count: "exact", head: true }).eq("city_id", cityId);
  await supabase.from("cities").update({ lounge_count: count || 0 }).eq("id", cityId);

  const { error: statusErr } = await supabase
    .from("pending_lounges")
    .update({ status: "approved" })
    .eq("id", lounge.id);
  if (statusErr) throw statusErr;
}
