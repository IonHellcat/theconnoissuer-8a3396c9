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

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const cityId = body.city_id as string | undefined;

    // Fetch cities that need images (limit to 1 at a time to avoid timeout)
    let query = supabase.from("cities").select("id, name, country").is("image_url", null).limit(1);
    if (cityId) query = query.eq("id", cityId);
    const { data: cities, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!cities || cities.length === 0) {
      return new Response(JSON.stringify({ message: "No cities need images", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { city: string; status: string }[] = [];

    for (const city of cities) {
      try {
        console.log(`Generating image for ${city.name}, ${city.country}...`);

        const prompt = `A stunning, high-quality photograph of the city skyline or iconic landmark of ${city.name}, ${city.country}. Beautiful golden hour lighting, cinematic composition, travel photography style. No text or watermarks. 3:4 aspect ratio.`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`AI error for ${city.name}: ${aiResp.status} ${errText}`);
          results.push({ city: city.name, status: `ai_error_${aiResp.status}` });
          // Wait a bit to avoid rate limits
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const aiData = await aiResp.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl || !imageUrl.startsWith("data:image")) {
          console.error(`No image returned for ${city.name}`);
          results.push({ city: city.name, status: "no_image_returned" });
          continue;
        }

        // Extract base64 data
        const base64Data = imageUrl.split(",")[1];
        const mimeMatch = imageUrl.match(/data:(image\/\w+);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const ext = mime.split("/")[1];
        const fileName = `${city.id}.${ext}`;

        // Decode base64
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Upload to storage
        const { error: uploadErr } = await supabase.storage
          .from("city-images")
          .upload(fileName, bytes, {
            contentType: mime,
            upsert: true,
          });

        if (uploadErr) {
          console.error(`Upload error for ${city.name}:`, uploadErr);
          results.push({ city: city.name, status: "upload_error" });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("city-images").getPublicUrl(fileName);

        // Update city record
        const { error: updateErr } = await supabase
          .from("cities")
          .update({ image_url: urlData.publicUrl })
          .eq("id", city.id);

        if (updateErr) {
          console.error(`Update error for ${city.name}:`, updateErr);
          results.push({ city: city.name, status: "db_update_error" });
          continue;
        }

        console.log(`✅ Done: ${city.name}`);
        results.push({ city: city.name, status: "success" });

        // Rate limit spacing
        await new Promise((r) => setTimeout(r, 2000));
      } catch (cityErr) {
        console.error(`Error processing ${city.name}:`, cityErr);
        results.push({ city: city.name, status: "error" });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;

    return new Response(
      JSON.stringify({ processed: results.length, success: successCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
