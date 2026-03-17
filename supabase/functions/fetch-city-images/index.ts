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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { data: roleData } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request body for optional params
    let mode = "missing";
    let limit = 5;
    let city_ids: string[] | undefined;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.mode && !["all", "missing"].includes(body.mode)) {
          return new Response(JSON.stringify({ error: "Invalid mode (must be 'all' or 'missing')" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (body.mode === "all") mode = "all";
        if (body.limit) {
          const n = Number(body.limit);
          if (!Number.isInteger(n) || n < 1 || n > 10) {
            return new Response(JSON.stringify({ error: "Invalid limit (integer 1-10)" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          limit = n;
        }
        if (body.city_ids !== undefined) {
          if (!Array.isArray(body.city_ids) || body.city_ids.length === 0 || body.city_ids.length > 20 ||
              !body.city_ids.every((id: unknown) => typeof id === "string" && id.length <= 100)) {
            return new Response(JSON.stringify({ error: "Invalid city_ids (array of 1-20 string IDs)" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          city_ids = body.city_ids;
        }
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    // Build query
    let query = supabase.from("cities").select("id, name, country");
    
    if (city_ids) {
      query = query.in("id", city_ids);
    } else if (mode === "missing") {
      query = query.is("image_url", null);
    }
    
    query = query.limit(limit);

    const { data: cities, error: citiesErr } = await query;
    if (citiesErr) throw citiesErr;

    // Count total remaining (for progress tracking)
    let remaining = 0;
    if (!city_ids) {
      const countQuery = supabase.from("cities").select("id", { count: "exact", head: true });
      if (mode === "missing") {
        countQuery.is("image_url", null);
      }
      const { count } = await countQuery;
      remaining = Math.max(0, (count || 0) - (cities?.length || 0));
    }

    if (!cities || cities.length === 0) {
      return new Response(JSON.stringify({ message: "No cities to process", processed: 0, results: [], remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { city: string; status: string }[] = [];

    for (const city of cities) {
      try {
        const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": "places.photos,places.displayName",
          },
          body: JSON.stringify({
            textQuery: `${city.name} ${city.country} city`,
            maxResultCount: 5,
          }),
        });

        if (!searchRes.ok) {
          console.error(`Search failed for ${city.name}:`, await searchRes.text());
          results.push({ city: city.name, status: "search failed" });
          continue;
        }

        const searchData = await searchRes.json();
        const places = searchData.places || [];

        let photoName: string | null = null;
        for (const place of places) {
          if (place.photos && place.photos.length > 0) {
            photoName = place.photos[0].name;
            break;
          }
        }

        if (!photoName) {
          results.push({ city: city.name, status: "no photos found" });
          continue;
        }

        const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${GOOGLE_PLACES_API_KEY}`;
        const photoRes = await fetch(photoUrl);
        if (!photoRes.ok) {
          results.push({ city: city.name, status: "photo fetch failed" });
          continue;
        }

        const photoBytes = new Uint8Array(await photoRes.arrayBuffer());
        const contentType = photoRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const fileName = `${city.id}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("city-images")
          .upload(fileName, photoBytes, { contentType, upsert: true });

        if (uploadErr) {
          console.error(`Upload error for ${city.name}:`, uploadErr);
          results.push({ city: city.name, status: "upload failed" });
          continue;
        }

        const { data: urlData } = supabase.storage.from("city-images").getPublicUrl(fileName);

        const { error: updateErr } = await supabase
          .from("cities")
          .update({ image_url: urlData.publicUrl })
          .eq("id", city.id);

        if (updateErr) {
          results.push({ city: city.name, status: "db update failed" });
        } else {
          results.push({ city: city.name, status: "success" });
        }
      } catch (err) {
        results.push({ city: city.name, status: "processing error" });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results, remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
