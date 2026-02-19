import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours,places.location,places.photos";

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: any[];
  };
  location?: { latitude: number; longitude: number };
  photos?: { name: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country, auto_approve } = await req.json();
    if (!city || !country) {
      return new Response(
        JSON.stringify({ error: "city and country are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Searching Google Places for: ${city}, ${country}`);

    // Search for cigar lounges and shops
    const queries = [
      `cigar lounge in ${city}, ${country}`,
      `cigar shop in ${city}, ${country}`,
    ];

    const allPlaces = new Map<string, PlaceResult>();

    for (const query of queries) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Google Places error for "${query}":`, errText);
        continue;
      }

      const data = await res.json();
      if (data.places) {
        for (const place of data.places) {
          if (place.id && !allPlaces.has(place.id)) {
            allPlaces.set(place.id, place);
          }
        }
      }
    }

    console.log(`Found ${allPlaces.size} unique places`);

    if (allPlaces.size === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No places found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing google_place_ids in both tables
    const placeIds = [...allPlaces.keys()];

    const { data: existingLounges } = await supabase
      .from("lounges")
      .select("google_place_id")
      .in("google_place_id", placeIds);

    const { data: existingPending } = await supabase
      .from("pending_lounges")
      .select("google_place_id")
      .in("google_place_id", placeIds);

    const existingIds = new Set([
      ...(existingLounges || []).map((l) => l.google_place_id),
      ...(existingPending || []).map((l) => l.google_place_id),
    ]);

    const newPlaces = [...allPlaces.entries()].filter(([id]) => !existingIds.has(id));
    console.log(`${newPlaces.length} new places after dedup`);

    if (newPlaces.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "All places already exist" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build photo URL helper
    const getPhotoUrl = (place: PlaceResult): string | null => {
      if (!place.photos || place.photos.length === 0) return null;
      const photoName = place.photos[0].name;
      return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`;
    };

    // Build hours JSONB
    const buildHours = (place: PlaceResult): any => {
      if (!place.regularOpeningHours) return null;
      return {
        weekday_descriptions: place.regularOpeningHours.weekdayDescriptions || [],
        periods: place.regularOpeningHours.periods || [],
      };
    };

    let insertedCount = 0;

    if (auto_approve) {
      // Ensure city exists
      let { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .eq("name", city)
        .maybeSingle();

      if (!cityRow) {
        const slug = city.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
        const { data: newCity, error: cityErr } = await supabase
          .from("cities")
          .insert({ name: city, country, slug })
          .select("id")
          .single();
        if (cityErr) throw cityErr;
        cityRow = newCity;
      }

      for (const [, place] of newPlaces) {
        const name = place.displayName?.text || "Unknown";
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") + "-" + place.id.slice(-6);

        const { error } = await supabase.from("lounges").insert({
          name,
          slug,
          city_id: cityRow!.id,
          type: "lounge",
          address: place.formattedAddress || null,
          phone: place.nationalPhoneNumber || null,
          website: place.websiteUri || null,
          rating: place.rating || 0,
          review_count: place.userRatingCount || 0,
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
          hours: buildHours(place),
          image_url: getPhotoUrl(place),
          google_place_id: place.id,
        });

        if (error) {
          console.error(`Error inserting lounge "${name}":`, error);
        } else {
          insertedCount++;
        }
      }

      // Update city lounge count
      const { count } = await supabase
        .from("lounges")
        .select("id", { count: "exact", head: true })
        .eq("city_id", cityRow!.id);
      await supabase.from("cities").update({ lounge_count: count || 0 }).eq("id", cityRow!.id);
    } else {
      // Insert into pending_lounges
      for (const [, place] of newPlaces) {
        const name = place.displayName?.text || "Unknown";
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") + "-" + place.id.slice(-6);

        const { error } = await supabase.from("pending_lounges").insert({
          name,
          slug,
          city_name: city,
          country,
          type: "lounge",
          source: "google_places",
          status: "pending",
          address: place.formattedAddress || null,
          phone: place.nationalPhoneNumber || null,
          website: place.websiteUri || null,
          rating: place.rating || 0,
          review_count: place.userRatingCount || 0,
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
          hours: buildHours(place),
          image_url: getPhotoUrl(place),
          google_place_id: place.id,
        });

        if (error) {
          console.error(`Error inserting pending "${name}":`, error);
        } else {
          insertedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("search-places error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
