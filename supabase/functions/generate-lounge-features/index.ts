import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATURE_TAGS = [
  "Walk-in Humidor",
  "Outdoor Terrace",
  "Full Bar",
  "Food Menu",
  "Private Rooms",
  "Members Only",
  "Tourist Friendly",
  "Late Night",
  "Live Music",
  "Whiskey Selection",
  "Coffee Service",
  "Wi-Fi",
  "Parking",
  "Waterfront/View",
];

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lounge } = await req.json();
    if (!lounge || typeof lounge !== "object" || !lounge.name || typeof lounge.name !== "string" || lounge.name.length > 200) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid lounge data (name required, max 200 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (lounge.address && (typeof lounge.address !== "string" || lounge.address.length > 300)) {
      return new Response(
        JSON.stringify({ error: "Invalid address (max 300 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (lounge.description && (typeof lounge.description !== "string" || lounge.description.length > 1000)) {
      return new Response(
        JSON.stringify({ error: "Invalid description (max 1000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Based on this cigar lounge — Name: ${lounge.name}, Address: ${lounge.address || "unknown"}, City: ${lounge.city}, Description: ${lounge.description || "none"} — select which of these features likely apply: ${FEATURE_TAGS.join(", ")}. Return ONLY a JSON array of matching tag strings, nothing else.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a knowledgeable cigar lounge expert. You analyze lounge details and determine which feature tags apply. Return ONLY a valid JSON array of strings. No markdown, no explanation.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    let raw = aiData.choices?.[0]?.message?.content?.trim() || "[]";

    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    let features: string[];
    try {
      features = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI response:", raw);
      features = [];
    }

    // Filter to only valid tags
    features = features.filter((f: string) => FEATURE_TAGS.includes(f));

    return new Response(JSON.stringify({ features }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lounge-features error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
