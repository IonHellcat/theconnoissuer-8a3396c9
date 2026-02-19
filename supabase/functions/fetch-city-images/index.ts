import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get cities without images
    const { data: cities, error: citiesErr } = await supabase
      .from("cities")
      .select("id, name, country")
      .is("image_url", null)
      .limit(3);

    if (citiesErr) throw citiesErr;
    if (!cities || cities.length === 0) {
      return new Response(JSON.stringify({ message: "All cities have images", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    for (const city of cities) {
      try {
        // Search for a photo of the city
        const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": "places.photos,places.displayName",
          },
          body: JSON.stringify({
            textQuery: `${city.name} ${city.country} city landmark`,
            maxResultCount: 5,
          }),
        });

        if (!searchRes.ok) {
          console.error(`Search failed for ${city.name}:`, await searchRes.text());
          results.push(`${city.name}: search failed`);
          continue;
        }

        const searchData = await searchRes.json();
        const places = searchData.places || [];

        // Find the first place with photos
        let photoName: string | null = null;
        for (const place of places) {
          if (place.photos && place.photos.length > 0) {
            photoName = place.photos[0].name;
            break;
          }
        }

        if (!photoName) {
          results.push(`${city.name}: no photos found`);
          continue;
        }

        // Fetch the photo binary
        const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${GOOGLE_PLACES_API_KEY}`;
        const photoRes = await fetch(photoUrl);
        if (!photoRes.ok) {
          results.push(`${city.name}: photo fetch failed`);
          continue;
        }

        const photoBytes = new Uint8Array(await photoRes.arrayBuffer());
        const contentType = photoRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const fileName = `${city.id}.${ext}`;

        // Upload to storage
        const { error: uploadErr } = await supabase.storage
          .from("city-images")
          .upload(fileName, photoBytes, { contentType, upsert: true });

        if (uploadErr) {
          console.error(`Upload error for ${city.name}:`, uploadErr);
          results.push(`${city.name}: upload failed`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("city-images").getPublicUrl(fileName);

        // Update city
        const { error: updateErr } = await supabase
          .from("cities")
          .update({ image_url: urlData.publicUrl })
          .eq("id", city.id);

        if (updateErr) {
          results.push(`${city.name}: db update failed`);
        } else {
          results.push(`${city.name}: ✓`);
        }
      } catch (err) {
        results.push(`${city.name}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
