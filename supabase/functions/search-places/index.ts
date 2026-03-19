import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours,places.location,places.photos,places.primaryType,places.types";

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
  primaryType?: string;
  types?: string[];
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

const BLOCKED_PRIMARY_TYPES = new Set([
  "hookah_bar", "vape_store", "convenience_store", "gas_station", "grocery_store",
  "supermarket", "beauty_salon", "nail_salon", "spa", "restaurant", "fast_food_restaurant",
  "cafe", "coffee_shop", "pharmacy", "drugstore", "clothing_store", "shoe_store",
  "jewelry_store", "furniture_store", "home_goods_store", "electronics_store", "book_store",
  "sporting_goods_store", "pet_store", "florist", "bakery", "car_dealer", "car_wash",
  "gym", "fitness_center", "movie_theater", "casino", "hotel", "motel", "parking",
  "airport", "transit_station", "bus_station", "train_station", "light_rail_station",
]);

const BLOCKED_NAME_KEYWORDS = [
  "hookah", "shisha", "nargile", "vape", "vapor", "e-cig", "ecig", "cannabis",
  "dispensary", "marijuana", "weed", "cbd", "head shop", "smoke shop",
  "snus", "iqos", "ploom", "glo tobacco", "heated tobacco",
  "presse", "loto", "loterie", "tabac presse", "tabac loto",
  "airport lounge", "vip lounge", "cip lounge", "departure lounge",
  "business lounge", "premium lounge", "transit lounge",
];

const POSITIVE_CIGAR_KEYWORDS = [
  "cigar", "cigars", "tobacco", "tobacconist", "humidor", "havana", "habano", "habanos",
  "stogie", "zigarren", "zigar", "puro", "puros", "cohiba", "cohibas", "davidoff",
  "villiger", "herf", "tabacalera", "torcedor", "vitola",
];

function preFilterPlaces(
  places: Map<string, PlaceResult>
): { filtered: Map<string, PlaceResult>; skippedCount: number } {
  const filtered = new Map<string, PlaceResult>();
  let skippedCount = 0;

  for (const [id, place] of places) {
    const nameLower = (place.displayName?.text || "").toLowerCase();

    // Positive keyword bypass
    if (POSITIVE_CIGAR_KEYWORDS.some((kw) => nameLower.includes(kw))) {
      filtered.set(id, place);
      continue;
    }

    // Blocked primaryType or types[]
    const allTypes = [
      ...(place.primaryType ? [place.primaryType] : []),
      ...(place.types || []),
    ];
    if (allTypes.some((t) => BLOCKED_PRIMARY_TYPES.has(t))) {
      console.log(`Pre-filter blocked (type): "${place.displayName?.text}" [${allTypes.join(", ")}]`);
      skippedCount++;
      continue;
    }

    // Blocked name keyword
    if (BLOCKED_NAME_KEYWORDS.some((kw) => nameLower.includes(kw))) {
      console.log(`Pre-filter blocked (name): "${place.displayName?.text}"`);
      skippedCount++;
      continue;
    }

    filtered.set(id, place);
  }

  return { filtered, skippedCount };
}

async function filterAndClassifyPlaces(
  places: Map<string, PlaceResult>
): Promise<{ relevant: Map<string, { place: PlaceResult; type: string }>; skippedCount: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set, failing closed — rejecting all places");
    return { relevant: new Map(), skippedCount: places.size };
  }

  const entries = [...places.entries()];
  const businessList = entries
    .map(([id, p], i) => {
      const googleTypes = p.types?.length ? ` - Google types: ${p.types.join(", ")}` : "";
      return `${i + 1}. "${p.displayName?.text || "Unknown"}" - ${p.formattedAddress || "no address"}${googleTypes}`;
    })
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
              "You classify whether a business is a cigar-focused venue. Mark relevant=true ONLY for: cigar lounges, cigar bars, cigar shops/tobacconists where cigars are the primary product. Mark relevant=false for: hookah/shisha bars, vape/e-cigarette shops, cannabis dispensaries, generic smoke shops with no clear cigar focus, bars or restaurants that happen to allow smoking, and any business not primarily centered on cigars. When in doubt, mark relevant=false.",
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
      return { relevant: new Map(), skippedCount: places.size };
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.warn("No tool call in AI response, failing closed — rejecting all places");
      return { relevant: new Map(), skippedCount: places.size };
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
    return { relevant: new Map(), skippedCount: places.size };
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
    // ── Auth: require admin role ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const { data: roleData } = await authClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { city, country, auto_approve } = await req.json();
    if (!city || typeof city !== "string" || city.length < 2 || city.length > 100) {
      return new Response(
        JSON.stringify({ error: "city is required (2-100 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!country || typeof country !== "string" || country.length < 2 || country.length > 60) {
      return new Response(
        JSON.stringify({ error: "country is required (2-60 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (auto_approve !== undefined && typeof auto_approve !== "boolean") {
      return new Response(
        JSON.stringify({ error: "auto_approve must be a boolean" }),
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

    // ── 2a. Pre-filter by type/name ──
    const { filtered: preFiltered, skippedCount: skippedByPreFilter } = preFilterPlaces(allPlaces);
    console.log(`${preFiltered.size} after pre-filter (${skippedByPreFilter} blocked)`);

    // ── 2b. AI Relevance + Type Classification ──
    const { relevant: relevantPlaces, skippedCount: skippedByAI } =
      await filterAndClassifyPlaces(preFiltered);
    let skippedIrrelevant = skippedByPreFilter + skippedByAI;
    console.log(`${relevantPlaces.size} relevant after AI filter (${skippedIrrelevant} total irrelevant)`);

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

    // Check deleted/blocklisted lounges
    const { data: deletedLounges } = await supabase
      .from("deleted_lounges")
      .select("google_place_id, name");
    const deletedPlaceIds = new Set(
      (deletedLounges || []).filter((d: any) => d.google_place_id).map((d: any) => d.google_place_id)
    );
    const deletedNames = new Set(
      (deletedLounges || []).map((d: any) => (d.name as string).toLowerCase())
    );

    const existingIds = new Set([
      ...(existingLounges || []).map((l: any) => l.google_place_id),
      ...(existingPending || []).map((l: any) => l.google_place_id),
    ]);

    const afterIdDedup = new Map<string, { place: PlaceResult; type: string }>();
    let skippedByPlaceId = 0;
    for (const [id, entry] of relevantPlaces) {
      const name = entry.place.displayName?.text?.toLowerCase() || "";
      if (existingIds.has(id) || deletedPlaceIds.has(id) || deletedNames.has(name)) {
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

    // ── 4b. Generic tobacco retail post-filter ──
    const GENERIC_TOBACCO_RETAIL_RE = /^(tabac|tabak|tabacchi|tabaccheria|tabacaria|estanco|tobak|tabagie)\b/i;
    const afterRetailFilter = new Map<string, { place: PlaceResult; type: string }>();
    let skippedGenericRetail = 0;
    for (const [id, entry] of newPlaces) {
      const name = entry.place.displayName?.text || "";
      const nameLower = name.toLowerCase();
      if (GENERIC_TOBACCO_RETAIL_RE.test(name) && !POSITIVE_CIGAR_KEYWORDS.some((kw) => nameLower.includes(kw))) {
        console.log(`Skipped (generic tobacco retail): "${name}"`);
        skippedGenericRetail++;
        skippedIrrelevant++;
      } else {
        afterRetailFilter.set(id, entry);
      }
    }
    if (skippedGenericRetail > 0) {
      console.log(`${skippedGenericRetail} skipped as generic tobacco retail`);
    }

    if (afterRetailFilter.size === 0) {
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

    const finalPlaces = afterRetailFilter;
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

      for (const [placeId, { place, type: venueType }] of finalPlaces) {
        const name = place.displayName?.text || "Unknown";
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") + "-" + placeId.slice(-6);
        const googleTypes = place.primaryType || place.types?.length
          ? { primaryType: place.primaryType || null, types: place.types || [] }
          : null;
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
          google_types: googleTypes,
        });
        if (error) console.error(`Error inserting "${name}":`, error);
        else insertedCount++;
      }

      const { count } = await supabase
        .from("lounges").select("id", { count: "exact", head: true }).eq("city_id", cityRow!.id);
      await supabase.from("cities").update({ lounge_count: count || 0 }).eq("id", cityRow!.id);
    } else {
      for (const [placeId, { place, type: venueType }] of finalPlaces) {
        const name = place.displayName?.text || "Unknown";
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") + "-" + placeId.slice(-6);
        const googleTypes = place.primaryType || place.types?.length
          ? { primaryType: place.primaryType || null, types: place.types || [] }
          : null;
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
          google_types: googleTypes,
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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
