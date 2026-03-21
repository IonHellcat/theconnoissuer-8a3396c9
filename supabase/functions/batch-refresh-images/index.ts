import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 5;
const DELAY_MS = 500;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY")!;

  const client = createClient(supabaseUrl, serviceKey);

  // Optional limit param
  let limit = 50;
  try {
    const body = await req.json();
    if (body.limit) limit = Math.min(Number(body.limit), 500);
  } catch {
    // no body is fine, use default
  }

  // Fetch lounges needing cached images
  const { data: lounges, error } = await client
    .from("lounges")
    .select("id, google_place_id")
    .not("google_place_id", "is", null)
    .is("image_url_cached", null)
    .limit(limit);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!lounges?.length) {
    return new Response(
      JSON.stringify({ processed: 0, message: "All lounges already cached" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: { id: string; status: string; url?: string }[] = [];

  // Process in batches
  for (let i = 0; i < lounges.length; i += BATCH_SIZE) {
    const batch = lounges.slice(i, i + BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map(async (lounge) => {
        try {
          // Fetch place photos
          const placeRes = await fetch(
            `https://places.googleapis.com/v1/places/${lounge.google_place_id}?fields=photos&key=${googleKey}`
          );
          if (!placeRes.ok) return { id: lounge.id, status: "places_api_error" };

          const placeData = await placeRes.json();
          const photos = placeData.photos;
          if (!photos?.length) return { id: lounge.id, status: "no_photos" };

          const photoName = photos[0].name;
          const freshUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${googleKey}`;

          // Download image
          const imgRes = await fetch(freshUrl);
          if (!imgRes.ok) {
            // At least update the image_url with fresh Google URL
            await client.from("lounges").update({ image_url: freshUrl }).eq("id", lounge.id);
            return { id: lounge.id, status: "download_failed", url: freshUrl };
          }

          const imgBytes = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : "jpg";
          const path = `${lounge.id}.${ext}`;

          // Upload to storage
          const { error: uploadErr } = await client.storage
            .from("lounge-images")
            .upload(path, imgBytes, { contentType, upsert: true });

          if (uploadErr) {
            await client.from("lounges").update({ image_url: freshUrl }).eq("id", lounge.id);
            return { id: lounge.id, status: "upload_failed", url: freshUrl };
          }

          const { data: { publicUrl } } = client.storage
            .from("lounge-images")
            .getPublicUrl(path);

          await client.from("lounges")
            .update({ image_url_cached: publicUrl, image_url: publicUrl })
            .eq("id", lounge.id);

          return { id: lounge.id, status: "cached", url: publicUrl };
        } catch (e: any) {
          return { id: lounge.id, status: `error: ${e.message}` };
        }
      })
    );

    for (const r of settled) {
      results.push(r.status === "fulfilled" ? r.value : { id: "unknown", status: "rejected" });
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < lounges.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  const cached = results.filter((r) => r.status === "cached").length;

  return new Response(
    JSON.stringify({ processed: results.length, cached, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
