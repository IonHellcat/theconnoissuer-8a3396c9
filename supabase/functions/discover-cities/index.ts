import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { data: roleData } = await supabase
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

    const { countries } = await req.json();
    if (!countries || !Array.isArray(countries) || countries.length === 0) {
      return new Response(
        JSON.stringify({ error: "countries array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    async function discoverForCountry(country: string): Promise<{ country: string; cities: string[]; error?: string }> {
      try {
        console.log(`Discovering cities for: ${country}`);

        const queries = [
          `best cities for cigars in ${country}`,
          `top cigar lounge cities ${country}`,
        ];

        let combinedContent = "";

        for (const query of queries) {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 5 }),
          });

          const searchData = await searchRes.json();
          if (searchData.success && searchData.data) {
            for (const result of searchData.data) {
              combinedContent += `\n${result.title || ""}\n${result.description || ""}\n${result.markdown || ""}\n`;
            }
          }
        }

        if (!combinedContent.trim()) {
          return { country, cities: [], error: "No search results found" };
        }

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  "You extract city names from text. Return ONLY a JSON array of city name strings. No markdown, no explanation. Example: [\"Miami\", \"New York\", \"Las Vegas\"]",
              },
              {
                role: "user",
                content: `Extract all city names mentioned as having cigar lounges, cigar bars, cigar shops, or a cigar scene in ${country}. Here is the search content:\n\n${combinedContent.slice(0, 8000)}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_cities",
                  description: "Extract city names that have cigar lounges or shops",
                  parameters: {
                    type: "object",
                    properties: {
                      cities: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of city names",
                      },
                    },
                    required: ["cities"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "extract_cities" } },
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error(`AI error for ${country}:`, errText);
          return { country, cities: [], error: "AI extraction failed" };
        }

        const aiData = await aiRes.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        let cities: string[] = [];

        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          cities = parsed.cities || [];
        }

        cities = [...new Set(cities.map((c: string) => c.trim()).filter(Boolean))];
        console.log(`Found ${cities.length} cities for ${country}:`, cities);
        return { country, cities };
      } catch (err) {
        console.error(`Error for ${country}:`, err);
        return {
          country,
          cities: [],
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }

    // Process in parallel batches of 3 to avoid timeout
    const BATCH_SIZE = 3;
    const results: { country: string; cities: string[]; error?: string }[] = [];

    for (let i = 0; i < countries.length; i += BATCH_SIZE) {
      const batch = countries.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(discoverForCountry));
      results.push(...batchResults);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("discover-cities error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
