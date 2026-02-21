import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 40;

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await serviceClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { table = "lounges", offset = 0 } = await req.json();
    const targetTable = table === "pending_lounges" ? "pending_lounges" : "lounges";
    if (typeof offset !== "number" || offset < 0 || offset > 100000 || !Number.isInteger(offset)) {
      return new Response(JSON.stringify({ error: "Invalid offset (integer 0-100000)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch a batch of venues
    const { data: venues, error: fetchErr } = await serviceClient
      .from(targetTable)
      .select("id, name, address, description")
      .range(offset, offset + BATCH_SIZE - 1)
      .order("created_at", { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!venues || venues.length === 0) {
      return new Response(JSON.stringify({ success: true, classified: 0, remaining: 0, message: "No more venues to classify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build business list for AI
    const businessList = venues
      .map((v: any, i: number) => `${i + 1}. "${v.name}" - ${v.address || "no address"} - ${(v.description || "").substring(0, 100)}`)
      .join("\n");

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
              "You classify cigar businesses. For each numbered business, classify as: 'lounge' (cigar lounge, cigar bar, place primarily for smoking cigars on-site), 'shop' (retail cigar shop, tobacconist, primarily for purchasing cigars), or 'both' (offers both a lounge and retail). Use the name, address, and description to decide. If unclear, default to 'lounge'.",
          },
          {
            role: "user",
            content: `Classify each business type. Return ONLY via the tool call.\n\n${businessList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_venues",
              description: "Return type classification for each venue",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        venue_type: { type: "string", enum: ["lounge", "shop", "both"] },
                      },
                      required: ["index", "venue_type"],
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
        tool_choice: { type: "function", function: { name: "classify_venues" } },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI classify error:", errText);
      throw new Error(`AI request failed: ${res.status}`);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const classifications: { index: number; venue_type: string }[] = parsed.classifications;

    let updated = 0;
    const changes: { name: string; oldType: string; newType: string }[] = [];

    for (const c of classifications) {
      const venue = venues[c.index - 1];
      if (!venue) continue;
      const newType = ["lounge", "shop", "both"].includes(c.venue_type) ? c.venue_type : "lounge";
      
      const { error: updateErr } = await serviceClient
        .from(targetTable)
        .update({ type: newType })
        .eq("id", venue.id);

      if (!updateErr) {
        updated++;
        if (newType !== "lounge") {
          changes.push({ name: venue.name, oldType: "lounge", newType });
        }
      }
    }

    // Check if there are more to process
    const { count: totalCount } = await serviceClient
      .from(targetTable)
      .select("id", { count: "exact", head: true });

    const nextOffset = offset + BATCH_SIZE;
    const remaining = Math.max(0, (totalCount || 0) - nextOffset);

    console.log(`Classified ${updated} venues (offset ${offset}), ${changes.length} reclassified, ${remaining} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        classified: updated,
        reclassified: changes.length,
        changes,
        remaining,
        next_offset: remaining > 0 ? nextOffset : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reclassify error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
