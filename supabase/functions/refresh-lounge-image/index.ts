import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY")!;

  try {
    const { lounge_id } = await req.json();

    if (!lounge_id) {
      return new Response(
        JSON.stringify({ error: "lounge_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get lounge
    const { data: lounge } = await serviceClient
      .from("lounges")
      .select("id, google_place_id, image_url_cached")
      .eq("id", lounge_id)
      .single();

    if (!lounge?.google_place_id) {
      return new Response(
        JSON.stringify({ error: "No google_place_id" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already cached in storage, return it
    if (lounge.image_url_cached) {
      return new Response(
        JSON.stringify({ url: lounge.image_url_cached, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch fresh photo reference from Places API
    const placeUrl =
      `https://places.googleapis.com/v1/places/${lounge.google_place_id}?fields=photos&key=${GOOGLE_KEY}`;

    const placeRes = await fetch(placeUrl);
    if (!placeRes.ok) {
      return new Response(
        JSON.stringify({ error: "Places API failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placeData = await placeRes.json();
    const photos = placeData.photos;
    if (!photos?.length) {
      return new Response(
        JSON.stringify({ error: "No photos available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build fresh photo URL
    const photoName = photos[0].name;
    const freshUrl =
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GOOGLE_KEY}`;

    // Update image_url with fresh URL immediately
    await serviceClient
      .from("lounges")
      .update({ image_url: freshUrl })
      .eq("id", lounge_id);

    // Download the image
    const imgRes = await fetch(freshUrl);
    if (!imgRes.ok) {
      return new Response(
        JSON.stringify({ url: freshUrl, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imgBytes = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `${lounge_id}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await serviceClient
      .storage
      .from("lounge-images")
      .upload(path, imgBytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ url: freshUrl, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = serviceClient
      .storage
      .from("lounge-images")
      .getPublicUrl(path);

    // Save to image_url_cached and update main URL
    await serviceClient
      .from("lounges")
      .update({
        image_url_cached: publicUrl,
        image_url: publicUrl,
      })
      .eq("id", lounge_id);

    return new Response(
      JSON.stringify({ url: publicUrl, cached: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("refresh-lounge-image error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
