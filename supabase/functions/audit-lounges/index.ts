import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 60;

const POSITIVE_KEYWORDS = ["cigar", "cigars", "tobacco", "tobacconist", "humidor", "havana", "habano", "stogie"];


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
      .select("id, name, address, google_types, website, google_place_id, description")
      .range(offset, offset + BATCH_SIZE - 1)
      .order("created_at", { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({ flagged: [], total_scanned: 0, flagged_count: 0, remaining: 0, next_offset: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flagged: { id: string; name: string; address: string | null; google_types: any }[] = [];
    const needsAI: { idx: number; venue: any }[] = [];

    // Pre-filter
    for (let i = 0; i < venues.length; i++) {
      const v = venues[i];
      const nameLower = (v.name || "").toLowerCase();

      // Positive keyword → relevant, skip
      if (POSITIVE_KEYWORDS.some((kw) => nameLower.includes(kw))) {
        continue;
      }

      // Blocked Google type → irrelevant
      const types: string[] = (v.google_types as any)?.types || [];
      if (types.some((t) => BLOCKED_GOOGLE_TYPES.has(t))) {
        flagged.push({ id: v.id, name: v.name, address: v.address, google_types: v.google_types });
        continue;
      }

      // Needs AI classification
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
            return `${i + 1}. "${v.name}" - ${v.address || "no address"} - ${googleTypes} - ${website}`;
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
                    "You determine if a business is a cigar-focused venue. Mark relevant=true ONLY for cigar lounges, cigar bars, cigar shops, or tobacconists where cigars are the primary product. Mark relevant=false for hookah bars, vape shops, cannabis dispensaries, generic smoke shops, bars, restaurants, hotels, and anything not primarily about cigars. When in doubt, mark relevant=false.",
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
