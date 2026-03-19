import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const lat = body.lat;
    const lng = body.lng;
    const visit_type = body.visit_type;
    const venue_type = body.venue_type ?? "All";

    const ALLOWED_VISIT_TYPES = ["Quick Smoke", "Full Evening", "Both"];
    const ALLOWED_VENUE_TYPES = ["All", "Lounge", "Shop"];

    if (typeof lat !== "number" || !isFinite(lat) || lat < -90 || lat > 90 ||
        typeof lng !== "number" || !isFinite(lng) || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (typeof visit_type !== "string" || !ALLOWED_VISIT_TYPES.includes(visit_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid visit_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (typeof venue_type !== "string" || !ALLOWED_VENUE_TYPES.includes(venue_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid venue_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data, error } = await supabase.rpc("recommend_lounges", {
      user_lat: lat,
      user_lng: lng,
      visit_style: visit_type,
      venue_filter: venue_type,
      radius_m: 50000,
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
