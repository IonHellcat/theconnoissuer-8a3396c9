import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function processLounge(
  lounge: { id: string; slug: string; google_place_id: string },
  apiKey: string,
  supabase: any,
  supabaseUrl: string
): Promise<{ lounge: string; status: string; error?: string }> {
  try {
    const detailRes = await fetch(
      `https://places.googleapis.com/v1/places/${lounge.google_place_id}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos",
        },
      }
    );

    if (!detailRes.ok) {
      await detailRes.text();
      return { lounge: lounge.slug, status: "error", error: `Places API: ${detailRes.status}` };
    }

    const placeData = await detailRes.json();
    if (!placeData.photos || placeData.photos.length === 0) {
      return { lounge: lounge.slug, status: "no_photo" };
    }

    const photoName = placeData.photos[0].name;
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`,
      { redirect: "follow" }
    );

    if (!photoRes.ok) {
      await photoRes.text();
      return { lounge: lounge.slug, status: "error", error: `Photo fetch: ${photoRes.status}` };
    }

    const imageBytes = new Uint8Array(await photoRes.arrayBuffer());
    const contentType = photoRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const filePath = `${lounge.slug}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("lounge-images")
      .upload(filePath, imageBytes, { contentType, upsert: true });

    if (uploadError) {
      return { lounge: lounge.slug, status: "error", error: uploadError.message };
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/lounge-images/${filePath}`;

    const { error: updateError } = await supabase
      .from("lounges")
      .update({ image_url: publicUrl })
      .eq("id", lounge.id);

    if (updateError) {
      return { lounge: lounge.slug, status: "error", error: updateError.message };
    }

    return { lounge: lounge.slug, status: "success" };
  } catch (err: any) {
    return { lounge: lounge.slug, status: "error", error: err.message };
  }
}

serve(async (req) => {
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

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await authClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mode = "missing", limit = 25 } = await req.json();

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    let query = supabase
      .from("lounges")
      .select("id, slug, image_url, google_place_id")
      .not("google_place_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(Math.min(limit, 50));

    if (mode === "missing") {
      query = query.or("image_url.is.null,image_url.like.%places.googleapis.com%");
    }

    const { data: lounges, error: queryError } = await query;
    if (queryError) throw queryError;

    if (!lounges || lounges.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, remaining: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count remaining
    let countQuery = supabase
      .from("lounges")
      .select("id", { count: "exact", head: true })
      .not("google_place_id", "is", null);

    if (mode === "missing") {
      countQuery = countQuery.or("image_url.is.null,image_url.like.%places.googleapis.com%");
    }

    const { count: totalCount } = await countQuery;
    const remaining = Math.max(0, (totalCount || 0) - lounges.length);

    // Process in parallel with concurrency limit of 5
    const CONCURRENCY = 5;
    const results: { lounge: string; status: string; error?: string }[] = [];

    for (let i = 0; i < lounges.length; i += CONCURRENCY) {
      const chunk = lounges.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(
        chunk.map((l) => processLounge(l, GOOGLE_PLACES_API_KEY, supabase, SUPABASE_URL))
      );
      for (const r of chunkResults) {
        results.push(r.status === "fulfilled" ? r.value : { lounge: "unknown", status: "error", error: String(r.reason) });
      }
    }

    return new Response(
      JSON.stringify({ processed: lounges.length, remaining, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("fetch-lounge-images error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
