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

/** Compute rating distribution stats and outlier flags */
function computeRatingStats(reviews: Array<{ rating: number | null }>): string {
  const ratings = reviews.map(r => r.rating).filter((r): r is number => r !== null && r !== undefined);
  if (ratings.length === 0) return "";

  // Count per star
  const counts: Record<number, number> = {};
  for (const r of ratings) {
    counts[r] = (counts[r] || 0) + 1;
  }

  // Median
  const sorted = [...ratings].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Distribution string
  const distParts = [5, 4, 3, 2, 1]
    .filter(s => counts[s])
    .map(s => `${s}★×${counts[s]}`);

  let result = `\nRATING DISTRIBUTION: ${distParts.join(", ")}. Median: ${median}★.`;

  // Flag outliers
  const outliers = ratings.filter(r => r <= median - 2);
  if (outliers.length > 0 && outliers.length < ratings.length / 2) {
    result += ` NOTE: ${outliers.length} review(s) rated ${outliers.join("★, ")}★ — these are statistical outliers (2+ stars below the median). Do NOT let these outlier(s) dominate pillar scores. Weight the majority consensus heavily.`;
  }

  return result;
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    throw new Error("Forbidden");
  }

  return user.id;
}

function buildAnalysisPrompt(
  lounge_name: string,
  lounge_type: string,
  city: string,
  country: string,
  reviews: Array<{ rating: number | null; review_text: string }>,
  weights: Record<string, number>
): string {
  const isShop = lounge_type === "shop";
  const isBoth = lounge_type === "both";
  const pillarKeys = isShop
    ? "selection, storage, staff_knowledge, pricing, experience"
    : "cigar_selection, ambiance, service, drinks, value";

  const reviewTexts = reviews
    .map((r, i) => `Review ${i + 1} (${r.rating || "?"}★): ${r.review_text}`)
    .join("\n\n");

  const venueLabel = isShop ? "cigar shop/tobacconist" : isBoth ? "cigar lounge & shop" : "cigar lounge";

  const ratingStats = computeRatingStats(reviews);

  return `You are a strict, calibrated cigar venue analyst. Analyze the Google reviews below for "${lounge_name}" (${venueLabel}) in ${city}, ${country}.
${ratingStats}

═══════════════════════════════════════════════════════
MOST IMPORTANT RULE — FAIRNESS & OUTLIER HANDLING:
A single negative review among mostly positive ones is an OUTLIER, not the truth.
Score based on the CONSENSUS of the MAJORITY of reviewers.

EXAMPLE: If 4 reviews give 4-5★ praising the ambiance and 1 review gives 1★ complaining about it,
the consensus is clearly positive. Score ambiance 3.5-4.0, NOT 2.0-2.5.

EXAMPLE: If 3 reviews mention great service and 1 says service was slow on a busy night,
score service 3.5-4.0. One bad night is not representative.

NEVER let a single outlier review tank a pillar score below what the majority suggests.
═══════════════════════════════════════════════════════

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
1. FAIRNESS (REPEATED): Do NOT let a single negative review tank a pillar score. Weight the consensus of the majority. One bad experience among many positive ones is an outlier.
2. If NO reviews mention a pillar AT ALL → return null (not a guess)
3. If only 1 vague mention → return null (insufficient data)
4. Generic praise like "great place" does NOT justify high scores across all pillars
5. A single enthusiastic review should not override multiple moderate ones
6. Consider review recency and specificity — vague complaints carry less weight than detailed criticism
7. The summary must be honest and balanced, not promotional — but also not unfairly harsh based on one outlier

Reviews:
${reviewTexts}

Return ONLY a JSON object with keys: ${pillarKeys}, summary
The summary should be one honest sentence — mention both strengths AND weaknesses if present.
Example: {"cigar_selection": 3.5, "ambiance": 4.0, "service": null, "drinks": 3.0, "value": 3.5, "summary": "A sentence here"}`;
}

async function analyzeWithAI(prompt: string): Promise<Record<string, any>> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
      throw new Error("RATE_LIMITED");
    }
    if (aiResponse.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    const t = await aiResponse.text();
    console.error("AI error:", aiResponse.status, t);
    throw new Error("AI analysis failed");
  }

  const aiData = await aiResponse.json();
  let raw = aiData.choices?.[0]?.message?.content?.trim() || "{}";
  raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  try {
    return JSON.parse(raw);
  } catch {
    console.error("Failed to parse AI response:", raw);
    throw new Error("AI_PARSE_FAILED");
  }
}

function processAnalysisResult(parsed: Record<string, any>, weights: Record<string, number>) {
  const summary = parsed.summary || null;
  delete parsed.summary;

  const pillarScores: Record<string, number | null> = {};
  for (const key of Object.keys(weights)) {
    pillarScores[key] = parsed[key] !== undefined ? parsed[key] : null;
  }

  const compositeScore = calculateCompositeScore(pillarScores, weights);
  const finalScore = compositeScore === 0 ? null : compositeScore;
  const finalLabel = finalScore === null ? null : getScoreLabel(compositeScore);

  return { pillar_scores: pillarScores, connoisseur_score: finalScore, score_label: finalLabel, score_summary: summary };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    await verifyAdmin(req);

    const body = await req.json();
    const { action } = body;

    const validActions = ["fetch-reviews", "analyze", "mark-no-reviews", "save", "bulk-rescore"];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      const textReviews = rawReviews.filter((r: any) => r.text?.text || r.originalText?.text);

      if (textReviews.length === 0) {
        return new Response(
          JSON.stringify({ reviews: [], message: "No text reviews found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reviewRows = textReviews.map((r: any) => ({
        lounge_id,
        google_place_id,
        author_name: r.authorAttribution?.displayName || "Anonymous",
        rating: r.rating || null,
        review_text: r.text?.text || r.originalText?.text || "",
        relative_time: r.relativePublishTimeDescription || "",
      }));

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
      const weights = isShop ? SHOP_WEIGHTS : LOUNGE_WEIGHTS;

      const prompt = buildAnalysisPrompt(lounge_name, lounge_type, city, country, reviews, weights);

      try {
        const parsed = await analyzeWithAI(prompt);
        const result = processAnalysisResult(parsed, weights);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        if (e.message === "RATE_LIMITED") {
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (e.message === "CREDITS_EXHAUSTED") {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (e.message === "AI_PARSE_FAILED") {
          return new Response(
            JSON.stringify({ error: "ai_refused", message: "AI could not analyze this venue." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw e;
      }
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

    if (action === "bulk-rescore") {
      // Fetch all estimated lounges with a google_place_id
      const { data: lounges, error: loungeError } = await serviceClient
        .from("lounges")
        .select("id, name, type, google_place_id, city:cities(name, country)")
        .eq("score_source", "estimated")
        .not("google_place_id", "is", null);

      if (loungeError) throw loungeError;
      if (!lounges || lounges.length === 0) {
        return new Response(
          JSON.stringify({ rescored: 0, skipped: 0, errors: 0, message: "No estimated lounges to rescore." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Bulk rescore: ${lounges.length} lounges to process`);

      let rescored = 0;
      let skipped = 0;
      let errors = 0;
      const BATCH_SIZE = 3;

      for (let i = 0; i < lounges.length; i += BATCH_SIZE) {
        const batch = lounges.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (lounge: any) => {
          try {
            // Load cached reviews
            const { data: reviews, error: revError } = await serviceClient
              .from("google_reviews")
              .select("author_name, rating, review_text, relative_time")
              .eq("lounge_id", lounge.id);

            if (revError) throw revError;
            if (!reviews || reviews.length === 0) {
              skipped++;
              return;
            }

            const isShop = lounge.type === "shop";
            const weights = isShop ? SHOP_WEIGHTS : LOUNGE_WEIGHTS;
            const city = lounge.city?.name || "Unknown";
            const country = lounge.city?.country || "Unknown";

            const prompt = buildAnalysisPrompt(lounge.name, lounge.type, city, country, reviews, weights);
            const parsed = await analyzeWithAI(prompt);
            const result = processAnalysisResult(parsed, weights);

            // Auto-save
            const { error: saveError } = await serviceClient
              .from("lounges")
              .update({
                connoisseur_score: result.connoisseur_score,
                score_label: result.score_label,
                score_source: "estimated",
                score_summary: result.score_summary,
                pillar_scores: result.pillar_scores,
              })
              .eq("id", lounge.id);

            if (saveError) {
              console.error(`Save error for ${lounge.name}:`, saveError);
              errors++;
            } else {
              console.log(`Rescored ${lounge.name}: ${result.connoisseur_score} (${result.score_label})`);
              rescored++;
            }
          } catch (e: any) {
            console.error(`Error processing ${lounge.name}:`, e.message);
            if (e.message === "RATE_LIMITED") {
              // Wait longer and retry once
              await new Promise(r => setTimeout(r, 5000));
              errors++;
            } else {
              errors++;
            }
          }
        });

        await Promise.all(batchPromises);

        // Delay between batches
        if (i + BATCH_SIZE < lounges.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      console.log(`Bulk rescore complete: ${rescored} rescored, ${skipped} skipped, ${errors} errors`);

      return new Response(
        JSON.stringify({ rescored, skipped, errors, total: lounges.length }),
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
