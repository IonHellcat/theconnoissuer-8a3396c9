import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 60;

const POSITIVE_KEYWORDS = [
  "cigar", "cigars", "tobacco", "tobacconist", "humidor", "havana", "habano", "habanos",
  "stogie", "zigarren", "zigar", "puro", "puros", "cohiba", "cohibas", "davidoff",
  "villiger", "herf", "tabacalera", "torcedor", "vitola",
];

const PLACE_FIELD_MASK = "primaryType,types,websiteUri";

async function enrichMissingTypes(
  venues: any[],
  serviceClient: any,
  googleApiKey: string
): Promise<any[]> {
  const enriched = [...venues];
  const toEnrich = enriched
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => !((v.google_types as any)?.types?.length > 0) && v.google_place_id);

  for (let b = 0; b < toEnrich.length; b += 5) {
    const batch = toEnrich.slice(b, b + 5);
    await Promise.allSettled(
      batch.map(async ({ v, i }) => {
        try {
          const res = await fetch(
            `https://places.googleapis.com/v1/places/${v.google_place_id}`,
            { headers: { "X-Goog-Api-Key": googleApiKey, "X-Goog-FieldMask": PLACE_FIELD_MASK } }
          );
          if (!res.ok) return;
          const data = await res.json();
          const googleTypes = { primaryType: data.primaryType || null, types: data.types || [] };
          const update: any = { google_types: googleTypes };
          if (!v.website && data.websiteUri) update.website = data.websiteUri;
          await serviceClient.from("lounges").update(update).eq("id", v.id);
          enriched[i] = { ...v, google_types: googleTypes, website: v.website || data.websiteUri || null };
          console.log(`Enriched "${v.name}" with types: ${googleTypes.types.join(", ")}`);
        } catch (e) {
          console.error(`Enrichment failed for "${v.name}":`, e);
        }
      })
    );
  }

  return enriched;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await serviceClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // DELETE MODE
    if (body.delete_ids && Array.isArray(body.delete_ids) && body.delete_ids.length > 0) {
      const ids: string[] = body.delete_ids;

      // Fetch lounge data before deleting
      const { data: toDelete, error: fetchErr } = await serviceClient
        .from("lounges")
        .select("id, name, google_place_id, city_id")
        .in("id", ids);
      if (fetchErr) throw fetchErr;

      // Get city names
      const cityIds = [...new Set((toDelete || []).map((l: any) => l.city_id).filter(Boolean))];
      let cityMap: Record<string, string> = {};
      if (cityIds.length > 0) {
        const { data: cities } = await serviceClient.from("cities").select("id, name").in("id", cityIds);
        cityMap = Object.fromEntries((cities || []).map((c: any) => [c.id, c.name]));
      }

      // Insert into deleted_lounges
      if (toDelete && toDelete.length > 0) {
        const blocklist = toDelete.map((l: any) => ({
          name: l.name,
          google_place_id: l.google_place_id || null,
          city_name: cityMap[l.city_id] || null,
        }));
        const { error: insertErr } = await serviceClient.from("deleted_lounges").insert(blocklist);
        if (insertErr) console.error("Blocklist insert error:", insertErr);
      }

      // Delete from lounges
      const { error: delErr } = await serviceClient.from("lounges").delete().in("id", ids);
      if (delErr) throw delErr;

      return new Response(
        JSON.stringify({ deleted: toDelete?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SCAN MODE
    const offset = typeof body.offset === "number" ? body.offset : 0;

    const { data: venues, error: fetchErr } = await serviceClient
      .from("lounges")
      .select("id, name, address, google_types, website, google_place_id, description, image_url")
      .range(offset, offset + BATCH_SIZE - 1)
      .order("created_at", { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({ flagged: [], total_scanned: 0, flagged_count: 0, remaining: 0, next_offset: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enrich venues missing Google type data
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const enrichedVenues = GOOGLE_PLACES_API_KEY
      ? await enrichMissingTypes(venues, serviceClient, GOOGLE_PLACES_API_KEY)
      : venues;

    // Fetch review samples for all venues in batch
    const venueIds = enrichedVenues.map((v: any) => v.id);
    const { data: allReviews } = await serviceClient
      .from("google_reviews")
      .select("lounge_id, review_text")
      .in("lounge_id", venueIds)
      .not("review_text", "is", null)
      .limit(300);

    const reviewsByLounge = new Map<string, string[]>();
    for (const r of (allReviews || [])) {
      if (!reviewsByLounge.has(r.lounge_id)) reviewsByLounge.set(r.lounge_id, []);
      reviewsByLounge.get(r.lounge_id)!.push(r.review_text);
    }

    const flagged: { id: string; name: string; address: string | null; google_types: any; image_url: string | null; reason: string | null }[] = [];
    const needsAI: { idx: number; venue: any }[] = [];

    // Pre-filter
    for (let i = 0; i < enrichedVenues.length; i++) {
      const v = enrichedVenues[i];
      const nameLower = (v.name || "").toLowerCase();

      // Positive keyword → relevant, skip
      if (POSITIVE_KEYWORDS.some((kw) => nameLower.includes(kw))) {
        continue;
      }

      // Data sufficiency check: skip AI if no evaluable data
      const hasTypes = (v.google_types as any)?.types?.length > 0;
      const hasDesc = !!v.description;
      const hasWebsite = !!v.website;
      const hasReviews = (reviewsByLounge.get(v.id)?.length || 0) > 0;
      if (!hasTypes && !hasDesc && !hasWebsite && !hasReviews) {
        continue; // Can't evaluate — keep by default
      }

      // Everything else needs AI classification
      needsAI.push({ idx: i, venue: v });
    }

    // AI classification for remaining venues
    if (needsAI.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured, skipping AI classification");
        // Fail closed: don't flag but don't pass either — just skip AI portion
      } else {
        const businessList = needsAI
          .map((item, i) => {
            const v = item.venue;
            const googleTypes = (v.google_types as any)?.types?.length
              ? `Google types: ${(v.google_types as any).types.join(", ")}`
              : "no Google type data";
            const website = v.website ? `website: ${v.website}` : "no website";
            const desc = v.description ? `description: ${v.description.substring(0, 150)}` : "no description";
            const venueReviews = reviewsByLounge.get(v.id) || [];
            const reviewSnippet = venueReviews.length > 0
              ? venueReviews.slice(0, 4).map((r: string) => r.substring(0, 120)).join(" | ")
              : "none";
            return `${i + 1}. "${v.name}" - ${v.address || "no address"} - ${googleTypes} - ${website} - ${desc} - reviews: ${reviewSnippet}`;
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
                    "You determine if a business belongs in a curated cigar venue directory. Mark relevant=true for cigar lounges, cigar bars, cigar shops, tobacconists, and upscale lounges or bars where cigars are a primary or significant offering. Mark relevant=false only if you are confident the business has no meaningful cigar focus — for example: hookah-only bars, vape shops, cannabis dispensaries, convenience stores, or clearly unrelated businesses. When in doubt, mark relevant=true. These venues were previously approved so give them the benefit of the doubt. Pay special attention to the reviews field — if reviews exist and none mention cigars, smoking, humidors, or tobacco, that is strong evidence the venue is not cigar-related.",
                },
                {
                  role: "user",
                  content: `For each numbered business, determine if it is a cigar-focused venue. Return ONLY via the tool call.\n\n${businessList}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "classify_relevance",
                    description: "Return relevance classification for each venue",
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
                            },
                            required: ["index", "relevant"],
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
              tool_choice: { type: "function", function: { name: "classify_relevance" } },
            }),
          });

          if (!res.ok) {
            console.error("AI audit error:", await res.text());
          } else {
            const data = await res.json();
            const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              const parsed = JSON.parse(toolCall.function.arguments);
              const classifications: { index: number; relevant: boolean }[] = parsed.classifications || [];
              for (const c of classifications) {
                const item = needsAI[c.index - 1];
                if (item && c.relevant === false) {
                  flagged.push({
                    id: item.venue.id,
                    name: item.venue.name,
                    address: item.venue.address,
                    google_types: item.venue.google_types,
                    image_url: item.venue.image_url || null,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("AI audit exception:", err);
        }
      }
    }

    // Check remaining
    const { count: totalCount } = await serviceClient
      .from("lounges")
      .select("id", { count: "exact", head: true });

    const nextOffset = offset + BATCH_SIZE;
    const remaining = Math.max(0, (totalCount || 0) - nextOffset);

    console.log(`Audit batch offset=${offset}: scanned ${venues.length}, flagged ${flagged.length}, remaining ${remaining}`);

    return new Response(
      JSON.stringify({
        flagged,
        total_scanned: venues.length,
        flagged_count: flagged.length,
        remaining,
        next_offset: remaining > 0 ? nextOffset : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Audit error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
