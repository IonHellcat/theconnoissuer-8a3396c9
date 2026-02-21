import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface FirecrawlSearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

interface PendingLounge {
  name: string;
  slug: string;
  city_name: string;
  country: string;
  source: string;
  status: string;
  type: string;
  address?: string | null;
  description?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  raw_data?: Record<string, unknown> | null;
}

async function firecrawlSearch(
  apiKey: string,
  query: string,
  limit = 10
): Promise<FirecrawlSearchResult[]> {
  console.log(`Firecrawl search: "${query}"`);
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Firecrawl search error:", data);
    return [];
  }

  return data.data || [];
}

function extractLoungeInfo(
  result: FirecrawlSearchResult,
  city: string,
  country: string
): PendingLounge | null {
  const title = result.title?.trim();
  if (!title) return null;

  // Clean up name - remove common suffixes like " - Yelp", " | TripAdvisor"
  let name = title
    .replace(/\s*[-|–—]\s*(Yelp|TripAdvisor|Google|Facebook|Instagram|Twitter|X).*$/i, "")
    .replace(/\s*[-|–—]\s*Reviews.*$/i, "")
    .trim();

  if (!name || name.length < 3 || name.length > 120) return null;

  // Skip results that are clearly not businesses
  const skipPatterns = [
    /best\s+\d+/i,
    /top\s+\d+/i,
    /^the\s+\d+\s+best/i,
    /tripadvisor/i,
    /yelp/i,
    /reddit/i,
    /forum/i,
    /blog/i,
  ];
  if (skipPatterns.some((p) => p.test(name))) return null;

  // Try to extract address from markdown content
  let address: string | null = null;
  let phone: string | null = null;
  const markdown = result.markdown || "";

  // Simple address extraction
  const addressMatch = markdown.match(
    /(?:address|location|located at)[:\s]+([^\n]+)/i
  );
  if (addressMatch) {
    address = addressMatch[1].trim().substring(0, 200);
  }

  // Simple phone extraction
  const phoneMatch = markdown.match(
    /(?:phone|tel|call)[:\s]*([\d\s()+-]{7,20})/i
  );
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
  }

  return {
    name,
    slug: slugify(name),
    city_name: city,
    country,
    source: "firecrawl",
    status: "pending",
    type: "lounge",
    address,
    description: result.description?.substring(0, 500) || null,
    phone,
    website: result.url || null,
    raw_data: { title: result.title, url: result.url, description: result.description },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await serviceClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { city, country, auto_approve } = await req.json();
    if (!city || typeof city !== "string" || city.length < 2 || city.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "city is required (2-100 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!country || typeof country !== "string" || country.length < 2 || country.length > 60) {
      return new Response(
        JSON.stringify({ success: false, error: "country is required (2-60 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (auto_approve !== undefined && typeof auto_approve !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, error: "auto_approve must be a boolean" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraping lounges for ${city}, ${country}`);

    // Run multiple searches in parallel
    const [loungeResults, shopResults, tobaccoResults] = await Promise.all([
      firecrawlSearch(firecrawlKey, `cigar lounge ${city} ${country}`, 10),
      firecrawlSearch(firecrawlKey, `cigar shop ${city} ${country}`, 10),
      firecrawlSearch(firecrawlKey, `tobacco shop cigars ${city} ${country}`, 5),
    ]);

    const allResults = [...loungeResults, ...shopResults, ...tobaccoResults];
    console.log(`Total search results: ${allResults.length}`);

    // Extract lounge info from results
    const lounges: PendingLounge[] = [];
    const seenNames = new Set<string>();

    for (const result of allResults) {
      const lounge = extractLoungeInfo(result, city, country);
      if (!lounge) continue;

      const key = lounge.name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      lounges.push(lounge);
    }

    console.log(`Extracted ${lounges.length} unique lounges`);

    if (lounges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No lounges found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate against existing pending + approved lounges
    const { data: existing } = await serviceClient
      .from("pending_lounges")
      .select("name, city_name")
      .eq("city_name", city)
      .in("status", ["pending", "approved"]);

    const existingNames = new Set(
      (existing || []).map((e: { name: string }) => e.name.toLowerCase())
    );

    // Also check approved lounges table
    const { data: approvedLounges } = await serviceClient
      .from("lounges")
      .select("name, city_id, cities!inner(name)")
      .eq("cities.name", city);

    if (approvedLounges) {
      for (const l of approvedLounges) {
        existingNames.add((l as { name: string }).name.toLowerCase());
      }
    }

    const newLounges = lounges.filter(
      (l) => !existingNames.has(l.name.toLowerCase())
    );

    console.log(`New lounges after dedup: ${newLounges.length}`);

    if (newLounges.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          message: "All found lounges already exist",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (auto_approve) {
      // Auto-approve: insert directly into lounges table
      for (const lounge of newLounges) {
        // Find or create city
        let { data: cityRow } = await serviceClient
          .from("cities")
          .select("id")
          .eq("name", lounge.city_name)
          .maybeSingle();

        if (!cityRow) {
          const citySlug = lounge.city_name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
          const { data: newCity, error: cityErr } = await serviceClient
            .from("cities")
            .insert({ name: lounge.city_name, country: lounge.country, slug: citySlug })
            .select("id")
            .single();
          if (cityErr) {
            console.error("City create error:", cityErr);
            continue;
          }
          cityRow = newCity;
        }

        const { error: lErr } = await serviceClient.from("lounges").insert({
          name: lounge.name, slug: lounge.slug, city_id: cityRow!.id, type: lounge.type,
          address: lounge.address, description: lounge.description, phone: lounge.phone,
          website: lounge.website, rating: lounge.rating || 0, review_count: 0, price_tier: 2,
        });
        if (lErr) {
          console.error("Lounge insert error:", lErr);
          continue;
        }

        // Update city lounge count
        const { count: loungeCount } = await serviceClient
          .from("lounges")
          .select("id", { count: "exact", head: true })
          .eq("city_id", cityRow!.id);
        await serviceClient.from("cities").update({ lounge_count: loungeCount || 0 }).eq("id", cityRow!.id);
      }

      console.log(`Auto-approved ${newLounges.length} lounges`);
    } else {
      // Standard: insert into pending_lounges
      const { error: insertError } = await serviceClient
        .from("pending_lounges")
        .insert(newLounges);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: newLounges.length,
        auto_approved: !!auto_approve,
        results: newLounges.map((l) => ({ name: l.name, address: l.address })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
