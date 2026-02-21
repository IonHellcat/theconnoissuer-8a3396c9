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

    // Service role client for writing data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "fetch-reviews") {
      const { lounge_id, google_place_id } = body;
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

      if (!reviews || reviews.length === 0) {
        return new Response(
          JSON.stringify({ error: "No reviews to analyze" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isShop = lounge_type === "shop";
      const weights = isShop ? SHOP_WEIGHTS : LOUNGE_WEIGHTS;
      const pillarList = isShop
        ? "Selection (inventory breadth, Cuban availability, budget-to-premium range), Storage Quality (humidor conditions, temperature, humidity control), Staff Knowledge (recommendations, honesty, expertise), Pricing (market competitiveness, deals, loyalty programs), Shop Experience (layout, browsability, sampling availability)"
        : "Cigar Selection (range, quality, rare finds, storage condition), Ambiance (design, comfort, mood, cleanliness, seating quality), Service (staff knowledge, attentiveness, recommendations quality), Drinks & Pairings (spirits, coffee, cocktails, pairing expertise), Value (price fairness for cigars, drinks, and overall experience)";

      const pillarKeys = isShop
        ? "selection, storage, staff_knowledge, pricing, experience"
        : "cigar_selection, ambiance, service, drinks, value";

      const reviewTexts = reviews
        .map((r: any, i: number) => `Review ${i + 1} (${r.rating || "?"}★): ${r.review_text}`)
        .join("\n\n");

      const prompt = `You are a cigar lounge analyst. Based on the following Google reviews for a ${isShop ? "cigar shop" : "cigar lounge"} called "${lounge_name}" in ${city}, ${country}, analyze and rate each of these pillars from 1.0 to 5.0 (use half-point increments):

${pillarList}

If a review doesn't mention a particular pillar, skip it for that review — don't guess.
If NO reviews mention a pillar at all, return null for that pillar.
If a lounge has very few reviews or the reviews are too vague to assess a pillar reliably, return null for that pillar rather than guessing. Accuracy matters more than completeness.

Reviews:
${reviewTexts}

Return ONLY a JSON object with keys: ${pillarKeys}, summary
The summary should be one sentence capturing the overall impression.
Example: {"cigar_selection": 4.5, "ambiance": 4.0, "service": null, "drinks": 3.5, "value": 4.0, "summary": "A sentence here"}`;

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
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response", raw }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    if (action === "save") {
      const { lounge_id, connoisseur_score, score_label, pillar_scores, score_summary } = body;

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
