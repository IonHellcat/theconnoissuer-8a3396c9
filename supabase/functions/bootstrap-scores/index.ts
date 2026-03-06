import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOUNGE_WEIGHTS: Record<string, number> = {
  cigar_selection: 0.25,
  ambiance: 0.30,
  service: 0.20,
  drinks: 0.15,
  value: 0.10,
};

const SHOP_WEIGHTS: Record<string, number> = {
  selection: 0.25,
  storage: 0.30,
  staff_knowledge: 0.20,
  pricing: 0.15,
  experience: 0.10,
};

function getScoreLabel(score: number): string | null {
  if (score >= 93) return "Legendary";
  if (score >= 88) return "Exceptional";
  if (score >= 82) return "Outstanding";
  if (score >= 75) return "Excellent";
  if (score >= 65) return "Good";
  return null;
}

function calculateCompositeScore(
  pillarScores: Record<string, number | null>,
  weights: Record<string, number>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [pillar, weight] of Object.entries(weights)) {
    const score = pillarScores[pillar];
    if (score !== null && score !== undefined) {
      totalWeight += weight;
      weightedSum += (score / 5) * 100 * weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    throw new Error("Unauthorized");
  }

  const userId = claimsData.claims.sub;
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    throw new Error("Forbidden");
  }

  return userId;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    await verifyAdmin(req);

    const body = await req.json();
    const { action } = body;

    // Input validation
    const validActions = ["fetch-reviews", "analyze", "mark-no-reviews", "save"];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for writing data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "fetch-reviews") {
      const { lounge_id, google_place_id } = body;
      if (lounge_id && (typeof lounge_id !== "string" || lounge_id.length > 100)) {
        return new Response(
          JSON.stringify({ error: "Invalid lounge_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!google_place_id) {
        return new Response(
          JSON.stringify({ reviews: [], message: "No google_place_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
      if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");

      const url = `https://places.googleapis.com/v1/places/${google_place_id}?fields=reviews&key=${GOOGLE_PLACES_API_KEY}`;
      console.log("Fetching reviews for:", google_place_id);

      const gResponse = await fetch(url);
      if (!gResponse.ok) {
        const errText = await gResponse.text();
        console.error("Google API error:", gResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Google API error: ${gResponse.status}`, reviews: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const gData = await gResponse.json();
      const rawReviews = gData.reviews || [];

      // Filter to reviews with text
      const textReviews = rawReviews.filter((r: any) => r.text?.text || r.originalText?.text);

      if (textReviews.length === 0) {
        return new Response(
          JSON.stringify({ reviews: [], message: "No text reviews found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store in google_reviews table
      const reviewRows = textReviews.map((r: any) => ({
        lounge_id,
        google_place_id,
        author_name: r.authorAttribution?.displayName || "Anonymous",
        rating: r.rating || null,
        review_text: r.text?.text || r.originalText?.text || "",
        relative_time: r.relativePublishTimeDescription || "",
      }));

      // Delete existing reviews for this lounge first to avoid duplicates
      await serviceClient
        .from("google_reviews")
        .delete()
        .eq("lounge_id", lounge_id);

      const { error: insertError } = await serviceClient
        .from("google_reviews")
        .insert(reviewRows);

      if (insertError) {
        console.error("Error inserting reviews:", insertError);
      }

      return new Response(
        JSON.stringify({
          reviews: reviewRows.map((r: any) => ({
            author_name: r.author_name,
            rating: r.rating,
            review_text: r.review_text,
            relative_time: r.relative_time,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analyze") {
      const { lounge_name, lounge_type, city, country, reviews } = body;

      if (typeof lounge_name !== "string" || lounge_name.length > 200) {
        return new Response(
          JSON.stringify({ error: "Invalid lounge_name (max 200 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (lounge_type && !["lounge", "shop", "both"].includes(lounge_type)) {
        return new Response(
          JSON.stringify({ error: "Invalid lounge_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof city !== "string" || city.length > 100 || typeof country !== "string" || country.length > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid city/country (max 100 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
        return new Response(
          JSON.stringify({ error: "No reviews to analyze" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isShop = lounge_type === "shop";
      const isBoth = lounge_type === "both";
      const weights = isShop ? SHOP_WEIGHTS : LOUNGE_WEIGHTS;
      
      const pillarKeys = isShop
        ? "selection, storage, staff_knowledge, pricing, experience"
        : "cigar_selection, ambiance, service, drinks, value";

      const reviewTexts = reviews
        .map((r: any, i: number) => `Review ${i + 1} (${r.rating || "?"}★): ${r.review_text}`)
        .join("\n\n");

      const venueLabel = isShop ? "cigar shop/tobacconist" : isBoth ? "cigar lounge & shop" : "cigar lounge";

      const prompt = `You are a strict, calibrated cigar venue analyst. Analyze the Google reviews below for "${lounge_name}" (${venueLabel}) in ${city}, ${country}.

CRITICAL SCORING GUIDELINES — read carefully:

VENUE TYPE: This is classified as a "${lounge_type}". ${isShop 
  ? "Score ONLY on shop-specific pillars. Do NOT evaluate lounge amenities like seating, drinks, or ambiance." 
  : isBoth 
    ? "This venue is both a lounge and a shop. Score on lounge pillars but consider retail quality in the selection pillar."
    : "Score ONLY on lounge-specific pillars. If this seems to actually be a retail shop, still score the lounge pillars but note this in the summary."}

CALIBRATION — most venues should score between 3.0 and 4.0:
- 5.0 = World-class, best-in-category globally. Reserve for truly extraordinary mentions.
- 4.5 = Among the best in the country. Multiple reviewers rave about this specific aspect.
- 4.0 = Clearly above average. Positive mentions from several reviewers.
- 3.5 = Solid, good. Generally positive but nothing remarkable.
- 3.0 = Average, acceptable. No complaints but no praise either.
- 2.5 = Below average. Some complaints or mediocre mentions.
- 2.0 = Poor. Multiple complaints about this aspect.
- 1.0-1.5 = Terrible. Consistent negative feedback.

IMPORTANT: Do NOT inflate scores. A Google rating of 4.0-4.5 does NOT automatically mean pillar scores should be 4.0+. Google ratings are inflated — a 4.2 Google-rated venue is typically average (3.0-3.5 on our scale). Be skeptical and conservative.

${isShop ? `SHOP PILLARS (rate 1.0-5.0, half-point increments):
- selection: Inventory breadth, brand variety, premium/rare cigar availability, range from budget to high-end
- storage: Humidor conditions, temperature/humidity control, cigar freshness as mentioned by reviewers
- staff_knowledge: Quality of recommendations, product expertise, honesty, helpfulness
- pricing: Competitiveness vs market, perceived value, deals/loyalty programs
- experience: Store layout, browsability, atmosphere, sampling availability, overall shopping experience` 
: `LOUNGE PILLARS (rate 1.0-5.0, half-point increments):
- cigar_selection: Range of cigars available, quality, rare finds, humidor condition, brand variety
- ambiance: Interior design, comfort, mood/atmosphere, cleanliness, seating quality, noise level, ventilation
- service: Staff attentiveness, knowledge, friendliness, speed, quality of recommendations
- drinks: Spirits/whiskey selection, coffee quality, cocktails, pairing expertise, bar quality
- value: Price fairness for cigars AND drinks, overall value proposition, price-to-quality ratio`}

RULES:
1. If NO reviews mention a pillar AT ALL → return null (not a guess)
2. If only 1 vague mention → return null (insufficient data)
3. Generic praise like "great place" does NOT justify high scores across all pillars
4. A single enthusiastic review should not override multiple moderate ones
5. Weight negative feedback heavily — one bad experience matters more than generic praise
6. The summary must be honest and balanced, not promotional

Reviews:
${reviewTexts}

Return ONLY a JSON object with keys: ${pillarKeys}, summary
The summary should be one honest sentence — mention both strengths AND weaknesses if present.
Example: {"cigar_selection": 3.5, "ambiance": 4.0, "service": null, "drinks": 3.0, "value": 3.5, "summary": "A sentence here"}`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      console.log("Sending AI analysis request for:", lounge_name);

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a cigar lounge expert analyst. Return ONLY valid JSON, no markdown fences, no explanation.",
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
        throw new Error("AI analysis failed");
      }

      const aiData = await aiResponse.json();
      let raw = aiData.choices?.[0]?.message?.content?.trim() || "{}";
      raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

      console.log("AI response:", raw);

      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error("Failed to parse AI response:", raw);
        // AI refused or returned non-JSON — treat as unscoreable
        return new Response(
          JSON.stringify({
            error: "ai_refused",
            message: "AI could not analyze this venue. It may need manual scoring.",
            raw,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const summary = parsed.summary || null;
      delete parsed.summary;

      // Build pillar scores (only known keys)
      const pillarScores: Record<string, number | null> = {};
      for (const key of Object.keys(weights)) {
        pillarScores[key] = parsed[key] !== undefined ? parsed[key] : null;
      }

      const compositeScore = calculateCompositeScore(pillarScores, weights);
      const finalScore = compositeScore === 0 ? null : compositeScore;
      const finalLabel = finalScore === null ? null : getScoreLabel(compositeScore);

      return new Response(
        JSON.stringify({
          pillar_scores: pillarScores,
          connoisseur_score: finalScore,
          score_label: finalLabel,
          score_summary: summary,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "mark-no-reviews") {
      const { lounge_id } = body;
      if (!lounge_id || typeof lounge_id !== "string" || lounge_id.length > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid lounge_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await serviceClient
        .from("lounges")
        .update({ score_source: "no_reviews" })
        .eq("id", lounge_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save") {
      const { lounge_id, connoisseur_score, score_label, pillar_scores, score_summary } = body;
      if (!lounge_id || typeof lounge_id !== "string" || lounge_id.length > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid lounge_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (connoisseur_score !== null && connoisseur_score !== undefined && (typeof connoisseur_score !== "number" || connoisseur_score < 0 || connoisseur_score > 100)) {
        return new Response(
          JSON.stringify({ error: "Invalid connoisseur_score (0-100)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await serviceClient
        .from("lounges")
        .update({
          connoisseur_score,
          score_label,
          score_source: "estimated",
          score_summary,
          pillar_scores,
        })
        .eq("id", lounge_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bootstrap-scores error:", e);
    const status = e instanceof Error && e.message === "Unauthorized" ? 401
      : e instanceof Error && e.message === "Forbidden" ? 403
      : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
