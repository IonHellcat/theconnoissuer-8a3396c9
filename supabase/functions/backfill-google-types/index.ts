import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Admin auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const url = Deno.env.get("SUPABASE_URL")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- End auth check ---

    const { table = "lounges", offset = 0 } = await req.json().catch(() => ({}));
    const targetTable = table === "pending_lounges" ? "pending_lounges" : "lounges";

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch venues that have a google_place_id but no google_types
    const { data: venues, error: fetchErr } = await supabase
      .from(targetTable)
      .select("id, name, google_place_id")
      .not("google_place_id", "is", null)
      .is("google_types", null)
      .order("created_at")
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchErr) throw fetchErr;
    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No more venues to backfill" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Backfilling ${venues.length} venues from offset ${offset}`);

    let updated = 0;
    let errors = 0;

    // Process in parallel batches of 5
    for (let i = 0; i < venues.length; i += 5) {
      const batch = venues.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (venue: any) => {
          const res = await fetch(
            `https://places.googleapis.com/v1/places/${venue.google_place_id}`,
            {
              headers: {
                "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": "primaryType,types",
              },
            }
          );

          if (!res.ok) {
            console.error(`Google API error for ${venue.name}: ${res.status}`);
            return null;
          }

          const data = await res.json();
          const googleTypes = {
            primaryType: data.primaryType || null,
            types: data.types || [],
          };

          const { error: updateErr } = await supabase
            .from(targetTable)
            .update({ google_types: googleTypes })
            .eq("id", venue.id);

          if (updateErr) {
            console.error(`Update error for ${venue.name}:`, updateErr);
            return null;
          }

          return venue.name;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) updated++;
        else errors++;
      }
    }

    const hasMore = venues.length === BATCH_SIZE;

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        errors,
        processed: venues.length,
        next_offset: hasMore ? offset + BATCH_SIZE : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("backfill-google-types error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
