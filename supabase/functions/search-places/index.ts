import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours,places.location,places.photos";

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: any[];
  };
  location?: { latitude: number; longitude: number };
  photos?: { name: string }[];
}

// ── Helpers ──

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\band\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function filterAndClassifyPlaces(
  places: Map<string, PlaceResult>
): Promise<{ relevant: Map<string, { place: PlaceResult; type: string }>; skippedCount: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set, skipping AI filter");
    const result = new Map<string, { place: PlaceResult; type: string }>();
    for (const [id, p] of places) result.set(id, { place: p, type: "lounge" });
    return { relevant: result, skippedCount: 0 };
  }

  const entries = [...places.entries()];
  const businessList = entries
    .map(([id, p], i) => `${i + 1}. "${p.displayName?.text || "Unknown"}" - ${p.formattedAddress || "no address"}`)
    .join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You classify cigar businesses. For each numbered business, determine: 1) Is it relevant (a cigar lounge, cigar bar, cigar shop, or tobacconist)? Answer NO for hookah bars, vape shops, smoke shops without cigar focus, or unrelated businesses. 2) If relevant, classify the type: 'lounge' (cigar lounge, cigar bar, or place primarily for smoking cigars on-site), 'shop' (retail cigar shop or tobacconist primarily for purchasing cigars to take away), or 'both' (offers both a lounge experience and retail shop).",
          },
          {
            role: "user",
            content: `Classify each business. Return ONLY via the tool call.\n\n${businessList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_businesses",
              description: "Return relevance and type classification for each business",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        relevant: { type: "boolean" },
                        venue_type: { type: "string", enum: ["lounge", "shop", "both"] },
                      },
                      required: ["index", "relevant", "venue_type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["classifications"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_businesses" } },
      }),
    });

    if (!res.ok) {
      console.error("AI filter request failed:", res.status, await res.text());
      const result = new Map<string, { place: PlaceResult; type: string }>();
      for (const [id, p] of places) result.set(id, { place: p, type: "lounge" });
      return { relevant: result, skippedCount: 0 };
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.warn("No tool call in AI response, keeping all places");
      const result = new Map<string, { place: PlaceResult; type: string }>();
      for (const [id, p] of places) result.set(id, { place: p, type: "lounge" });
      return { relevant: result, skippedCount: 0 };
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const classifications: { index: number; relevant: boolean; venue_type: string }[] = parsed.classifications;

    const classMap = new Map<number, { relevant: boolean; venue_type: string }>();
    for (const c of classifications) classMap.set(c.index - 1, c);

    const relevant = new Map<string, { place: PlaceResult; type: string }>();
    let skippedCount = 0;
    entries.forEach(([id, place], i) => {
      const c = classMap.get(i);
      if (c && !c.relevant) {
        console.log(`Filtered out (irrelevant): "${place.displayName?.text}"`);
        skippedCount++;
      } else {
        const venueType = c?.venue_type || "lounge";
        relevant.set(id, { place, type: ["lounge", "shop", "both"].includes(venueType) ? venueType : "lounge" });
      }
    });

    return { relevant, skippedCount };
  } catch (err) {
    console.error("AI relevance filter error:", err);
    const result = new Map<string, { place: PlaceResult; type: string }>();
    for (const [id, p] of places) result.set(id, { place: p, type: "lounge" });
    return { relevant: result, skippedCount: 0 };
  }
}

async function fuzzyDedup(
  places: Map<string, { place: PlaceResult; type: string }>,
  city: string,
  supabase: any
): Promise<{ dedupedPlaces: Map<string, { place: PlaceResult; type: string }>; skippedCount: number }> {
  const { data: cityRow } = await supabase
    .from("cities")
    .select("id")
    .eq("name", city)
    .maybeSingle();

  const existingNames: string[] = [];

  if (cityRow) {
    const { data: existingLounges } = await supabase
      .from("lounges")
      .select("name")
      .eq("city_id", cityRow.id);
    if (existingLounges) {
      existingLounges.forEach((l: any) => existingNames.push(normalizeName(l.name)));
    }
  }

  const { data: existingPending } = await supabase
    .from("pending_lounges")
    .select("name")
    .eq("city_name", city);
  if (existingPending) {
    existingPending.forEach((l: any) => existingNames.push(normalizeName(l.name)));
  }

  const dedupedPlaces = new Map<string, { place: PlaceResult; type: string }>();
  let skippedCount = 0;

  for (const [id, entry] of places) {
    const normalized = normalizeName(entry.place.displayName?.text || "");
    if (existingNames.includes(normalized)) {
      console.log(`Fuzzy dedup: "${entry.place.displayName?.text}" matches existing name`);
      skippedCount++;
    } else {
      dedupedPlaces.set(id, entry);
      existingNames.push(normalized);
    }
  }

  return { dedupedPlaces, skippedCount };
}

// ── Shared helpers ──

function getPhotoUrl(place: PlaceResult, apiKey: string): string | null {
  if (!place.photos || place.photos.length === 0) return null;
  return `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=800&key=${apiKey}`;
}

function buildHours(place: PlaceResult): any {
  if (!place.regularOpeningHours) return null;
  return {
    weekday_descriptions: place.regularOpeningHours.weekdayDescriptions || [],
    periods: place.regularOpeningHours.periods || [],
  };
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country, auto_approve } = await req.json();
    if (!city || !country) {
      return new Response(
        JSON.stringify({ error: "city and country are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Searching Google Places for: ${city}, ${country}`);

    // ── 1. Fetch from Google Places ──
    const queries = [
      `cigar lounge in ${city}, ${country}`,
      `cigar shop in ${city}, ${country}`,
    ];

    const allPlaces = new Map<string, PlaceResult>();

    for (const query of queries) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
      });

      if (!res.ok) {
        console.error(`Google Places error for "${query}":`, await res.text());
        continue;
      }

      const data = await res.json();
      if (data.places) {
        for (const place of data.places) {
          if (place.id && !allPlaces.has(place.id)) {
            allPlaces.set(place.id, place);
          }
        }
      }
    }

    const totalFound = allPlaces.size;
    console.log(`Found ${totalFound} unique places`);

    if (totalFound === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, total_found: 0, skipped_duplicates: 0, skipped_irrelevant: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. AI Relevance + Type Classification ──
    const { relevant: relevantPlaces, skippedCount: skippedIrrelevant } =
      await filterAndClassifyPlaces(allPlaces);
    console.log(`${relevantPlaces.size} relevant after AI filter (${skippedIrrelevant} filtered)`);

    // ── 3. Google Place ID dedup ──
    const placeIds = [...relevantPlaces.keys()];
    const { data: existingLounges } = await supabase
      .from("lounges")
      .select("google_place_id")
      .in("google_place_id", placeIds);
    const { data: existingPending } = await supabase
      .from("pending_lounges")
      .select("google_place_id")
      .in("google_place_id", placeIds);

    const existingIds = new Set([
      ...(existingLounges || []).map((l: any) => l.google_place_id),
      ...(existingPending || []).map((l: any) => l.google_place_id),
    ]);

    const afterIdDedup = new Map<string, { place: PlaceResult; type: string }>();
    let skippedByPlaceId = 0;
    for (const [id, entry] of relevantPlaces) {
      if (existingIds.has(id)) {
        skippedByPlaceId++;
      } else {
        afterIdDedup.set(id, entry);
      }
    }

    // ── 4. Fuzzy name dedup ──
    const { dedupedPlaces: newPlaces, skippedCount: skippedByName } =
      await fuzzyDedup(afterIdDedup, city, supabase);

    const skippedDuplicates = skippedByPlaceId + skippedByName;
    console.log(`${newPlaces.size} new places after all dedup (${skippedDuplicates} dupes total)`);

    if (newPlaces.size === 0) {
      return new Response(
        JSON.stringify({
          success: true, count: 0, total_found: totalFound,
          skipped_duplicates: skippedDuplicates, skipped_irrelevant: skippedIrrelevant,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Insert ──
    let insertedCount = 0;

    if (auto_approve) {
      let { data: cityRow } = await supabase
        .from("cities").select("id").eq("name", city).maybeSingle();

      if (!cityRow) {
        const slug = city.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
        const { data: newCity, error: cityErr } = await supabase
          .from("cities").insert({ name: city, country, slug }).select("id").single();
        if (cityErr) throw cityErr;
        cityRow = newCity;
      }

      for (const [placeId, { place, type: venueType }] of newPlaces) {
        const name = place.displayName?.text || "Unknown";
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") + "-" + placeId.slice(-6);
        const { error } = await supabase.from("lounges").insert({
          name, slug, city_id: cityRow!.id, type: venueType,
          address: place.formattedAddress || null,
          phone: place.nationalPhoneNumber || null,
          website: place.websiteUri || null,
          rating: place.rating || 0,
          review_count: place.userRatingCount || 0,
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
          hours: buildHours(place),
          image_url: getPhotoUrl(place, GOOGLE_PLACES_API_KEY),
          google_place_id: placeId,
        });
        if (error) console.error(`Error inserting "${name}":`, error);
        else insertedCount++;
      }

      const { count } = await supabase
        .from("lounges").select("id", { count: "exact", head: true }).eq("city_id", cityRow!.id);
      await supabase.from("cities").update({ lounge_count: count || 0 }).eq("id", cityRow!.id);
    } else {
      for (const [placeId, { place, type: venueType }] of newPlaces) {
        const name = place.displayName?.text || "Unknown";
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") + "-" + placeId.slice(-6);
        const { error } = await supabase.from("pending_lounges").insert({
          name, slug, city_name: city, country, type: venueType,
          source: "google_places", status: "pending",
          address: place.formattedAddress || null,
          phone: place.nationalPhoneNumber || null,
          website: place.websiteUri || null,
          rating: place.rating || 0,
          review_count: place.userRatingCount || 0,
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
          hours: buildHours(place),
          image_url: getPhotoUrl(place, GOOGLE_PLACES_API_KEY),
          google_place_id: placeId,
        });
        if (error) console.error(`Error inserting pending "${name}":`, error);
        else insertedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true, count: insertedCount, total_found: totalFound,
        skipped_duplicates: skippedDuplicates, skipped_irrelevant: skippedIrrelevant,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("search-places error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
