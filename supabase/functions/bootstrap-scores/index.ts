import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Score Label Tiers ───
function getScoreLabel(score: number): string | null {
  if (score >= 90) return "Legendary";
  if (score >= 82) return "Exceptional";
  if (score >= 74) return "Outstanding";
  if (score >= 66) return "Excellent";
  if (score >= 55) return "Good";
  return null;
}

// ─── Aspect definitions per venue type ───
const LOUNGE_ASPECTS = ["atmosphere", "service", "cigar_selection", "drinks"];
const SHOP_ASPECTS = ["selection", "staff", "pricing"];

function getAspects(type: string): string[] {
  return type === "shop" ? SHOP_ASPECTS : LOUNGE_ASPECTS;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function buildCountryMedianMap(
  rows: Array<{ review_count: number | null; city_id: string | null }>,
  cityCountryMap: Map<string, string>,
): Map<string, number> {
  const countryGroups = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.city_id) continue;
    const country = cityCountryMap.get(row.city_id);
    if (!country) continue;
    const count = Number(row.review_count ?? 0);
    if (!countryGroups.has(country)) countryGroups.set(country, []);
    countryGroups.get(country)!.push(count);
  }

  const medianMap = new Map<string, number>();
  countryGroups.forEach((counts, country) => {
    const sorted = [...counts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    medianMap.set(country, Math.max(1, Math.round(median)));
  });

  return medianMap;
}

// ─── Deterministic Scoring Formula ───

function computeQualityScore(rating: number, reviewCount: number, globalMean: number): number {
  const C = 25;
  const bayesian = (rating * reviewCount + globalMean * C) / (reviewCount + C);
  const normalized = clampScore(((bayesian - 2.5) / 2.5) * 100) / 100;
  return Math.round(clampScore(Math.pow(normalized, 1.5) * 100));
}

function computeSentimentScore(classifications: Array<{ aspects: Record<string, any> }>, aspects: string[]): number {
  if (classifications.length === 0) return 50;

  // 1. Aspect-level sentiment (positive vs negative mentions across all aspects)
  let totalPositive = 0;
  let totalMentioned = 0;

  for (const c of classifications) {
    for (const aspect of aspects) {
      const val = c.aspects?.[aspect];
      if (val === "positive") {
        totalPositive++;
        totalMentioned++;
      } else if (val === "negative") {
        totalMentioned++;
      }
    }
  }

  const aspectRatio = totalMentioned > 0 ? totalPositive / totalMentioned : null;

  // 2. Overall sentiment (from the overall_sentiment field on each classification)
  const SENTIMENT_MAP: Record<string, number> = {
    strong_positive: 1.0,
    positive: 0.75,
    neutral: 0.5,
    negative: 0.25,
    strong_negative: 0.0,
  };

  let overallSum = 0;
  let overallCount = 0;
  for (const c of classifications) {
    const os = c.aspects?.overall_sentiment;
    if (os && SENTIMENT_MAP[os] !== undefined) {
      overallSum += SENTIMENT_MAP[os];
      overallCount++;
    }
  }

  const overallAvg = overallCount > 0 ? overallSum / overallCount : 0.5;

  // 3. Blend: 60% aspect-level, 40% overall sentiment
  if (aspectRatio === null) {
    return Math.round(overallAvg * 100);
  }

  return Math.round((aspectRatio * 0.6 + overallAvg * 0.4) * 100);
}

function computeVolumeScore(reviewCount: number, countryMedian: number): number {
  if (reviewCount <= 0 || countryMedian <= 0) return 0;
  const flooredMedian = Math.max(50, countryMedian);
  const ratio = reviewCount / flooredMedian;
  return Math.round(clampScore(Math.min(1, Math.log1p(ratio) / Math.log1p(10)) * 100));
}

function computeConsistencyScore(ratings: number[]): number {
  if (ratings.length < 2) return 50;
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratings.length;
  const stdDev = Math.sqrt(variance);
  const score = clampScore((1 - stdDev / 2) * 100);
  return Math.round(score);
}

function computeConnoisseurScore(
  rating: number,
  reviewCount: number,
  classifications: Array<{ aspects: Record<string, any> }>,
  aspects: string[],
  ratings: number[],
  globalMean: number,
  countryMedian: number,
): { score: number; quality: number; sentiment: number; volume: number; consistency: number } {
  const quality = computeQualityScore(rating, reviewCount, globalMean);
  const sentiment = computeSentimentScore(classifications, aspects);
  const volume = computeVolumeScore(reviewCount, countryMedian);
  const consistency = computeConsistencyScore(ratings);

  const score = Math.round(quality * 0.35 + sentiment * 0.3 + volume * 0.25 + consistency * 0.1);

  return { score, quality, sentiment, volume, consistency };
}

function computeConfidence(reviewCount: number): string {
  if (reviewCount >= 10) return "high";
  if (reviewCount >= 5) return "medium";
  return "low";
}

// ─── Build pillar_scores from classifications ───
function buildPillarScores(
  classifications: Array<{ aspects: Record<string, any> }>,
  aspects: string[],
): Record<string, { sentiment: string; positive: number; negative: number; total: number }> {
  const result: Record<string, { sentiment: string; positive: number; negative: number; total: number }> = {};

  for (const aspect of aspects) {
    let pos = 0,
      neg = 0,
      total = 0;
    for (const c of classifications) {
      const val = c.aspects?.[aspect];
      if (val === "positive") {
        pos++;
        total++;
      } else if (val === "negative") {
        neg++;
        total++;
      }
    }

    let sentiment = "not_mentioned";
    if (total > 0) {
      const ratio = pos / total;
      if (ratio >= 0.8) sentiment = "strength";
      else if (ratio >= 0.6) sentiment = "positive";
      else if (ratio >= 0.4) sentiment = "mixed";
      else sentiment = "weakness";
    }

    result[aspect] = { sentiment, positive: pos, negative: neg, total };
  }

  return result;
}

// ─── Shared helpers for scoring context ───
async function buildScoringContext(serviceClient: any) {
  // Global mean rating
  const { data: allRatings } = await serviceClient.from("lounges").select("rating").not("rating", "is", null);
  const globalMean =
    allRatings && allRatings.length > 0
      ? allRatings.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / allRatings.length
      : 4.1;

  // Build city → country lookup
  const { data: allCities } = await serviceClient.from("cities").select("id, country");
  const cityCountryMap = new Map<string, string>();
  for (const city of allCities || []) {
    cityCountryMap.set(city.id, city.country);
  }

  // Build country → median review count
  const { data: allLoungeStats } = await serviceClient.from("lounges").select("review_count, city_id");
  const countryMedianMap = buildCountryMedianMap(allLoungeStats || [], cityCountryMap);

  // Global fallback median
  const allCounts = (allLoungeStats || [])
    .map((r: any) => Number(r.review_count ?? 0))
    .sort((a: number, b: number) => a - b);
  const globalMedian = allCounts.length > 0 ? allCounts[Math.floor(allCounts.length / 2)] : 100;

  return { globalMean, cityCountryMap, countryMedianMap, globalMedian };
}

function getCountryMedian(
  cityId: string,
  cityCountryMap: Map<string, string>,
  countryMedianMap: Map<string, number>,
  globalMedian: number,
): number {
  const country = cityCountryMap.get(cityId) || "";
  return countryMedianMap.get(country) || globalMedian;
}

// ─── Auth ───
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const userId = user.id;
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");

  return userId;
}

// ─── AI Classification ───
async function classifyReviewsBatch(
  reviews: Array<{ id: string; review_text: string; rating: number | null }>,
  venueType: string,
): Promise<Array<{ review_id: string; aspects: Record<string, string> }>> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const aspects = getAspects(venueType);
  const aspectList = aspects.join(", ");

  const reviewBlock = reviews
    .map((r, i) => `Review ${i + 1} (ID: ${r.id}, ${r.rating ?? "?"}★): ${r.review_text}`)
    .join("\n\n");

  const prompt = `Classify each review's sentiment for these aspects: ${aspectList}.

For each aspect in each review, classify as:
- "positive" — reviewer explicitly praises or is satisfied with this aspect
- "negative" — reviewer explicitly complains or is dissatisfied with this aspect  
- "not_mentioned" — reviewer does not mention this aspect

Also classify "overall_sentiment" as "positive", "negative", or "neutral" for each review.

RULES:
- Only classify based on what is EXPLICITLY mentioned
- Generic praise like "great place" = overall_sentiment positive, but individual aspects should be "not_mentioned" unless specifically discussed
- Be conservative: if uncertain, use "not_mentioned"

Reviews:
${reviewBlock}

Return a JSON array where each element has:
- "review_id": the ID from the review
- "aspects": object with keys ${aspectList}, overall_sentiment — each valued "positive", "negative", or "not_mentioned"`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: "You are a review sentiment classifier. Return ONLY valid JSON, no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) throw new Error("RATE_LIMITED");
    if (aiResponse.status === 402) throw new Error("CREDITS_EXHAUSTED");
    const t = await aiResponse.text();
    console.error("AI error:", aiResponse.status, t);
    throw new Error("AI classification failed");
  }

  const aiData = await aiResponse.json();
  let raw = aiData.choices?.[0]?.message?.content?.trim() || "[]";
  raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch {
    console.error("Failed to parse classification:", raw);
    throw new Error("AI_PARSE_FAILED");
  }
}

// ─── AI Summary ───
async function generateSummary(
  loungeName: string,
  pillarScores: Record<string, any>,
  topReviews: string[],
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const strengths = Object.entries(pillarScores)
    .filter(([_, v]) => v.sentiment === "strength" || v.sentiment === "positive")
    .map(([k]) => k.replace(/_/g, " "));
  const weaknesses = Object.entries(pillarScores)
    .filter(([_, v]) => v.sentiment === "weakness")
    .map(([k]) => k.replace(/_/g, " "));

  const snippets = topReviews.slice(0, 3).join("\n");

  const prompt = `Write ONE concise sentence summarizing "${loungeName}" as a cigar venue.
${strengths.length > 0 ? `Strengths: ${strengths.join(", ")}` : ""}
${weaknesses.length > 0 ? `Weaknesses: ${weaknesses.join(", ")}` : ""}
Top review snippets:
${snippets}

Rules:
- One sentence only, no more than 25 words
- Mention the key strength, and if there's a notable weakness, mention it briefly
- Be honest, not promotional
- Do not start with the venue name`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: "You write concise, honest one-sentence venue summaries. Return ONLY the sentence, nothing else.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const t = await aiResponse.text();
    console.error("Summary AI error:", aiResponse.status, t);
    return "";
  }

  const aiData = await aiResponse.json();
  return (aiData.choices?.[0]?.message?.content?.trim() || "").replace(/^["']|["']$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await verifyAdmin(req);

    const body = await req.json();
    const { action } = body;

    const validActions = [
      "fetch-reviews",
      "classify",
      "compute-scores",
      "summarize",
      "mark-no-reviews",
      "save",
      "bulk-pipeline",
      "bulk-pipeline-chunk",
      "bulk-full-pipeline-chunk",
      "reset-all",
      "recalculate-scores-chunk",
    ];
    if (!action || !validActions.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ═══ FETCH REVIEWS ═══
    if (action === "fetch-reviews") {
      const { lounge_id, google_place_id } = body;
      if (lounge_id && (typeof lounge_id !== "string" || lounge_id.length > 100)) {
        return new Response(JSON.stringify({ error: "Invalid lounge_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!google_place_id) {
        return new Response(JSON.stringify({ reviews: [], message: "No google_place_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
      if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");

      const url = `https://places.googleapis.com/v1/places/${google_place_id}?fields=reviews&key=${GOOGLE_PLACES_API_KEY}`;
      console.log("Fetching reviews for:", google_place_id);

      const gResponse = await fetch(url);
      if (!gResponse.ok) {
        const errText = await gResponse.text();
        console.error("Google API error:", gResponse.status, errText);
        return new Response(JSON.stringify({ error: `Google API error: ${gResponse.status}`, reviews: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const gData = await gResponse.json();
      const rawReviews = gData.reviews || [];
      const textReviews = rawReviews.filter((r: any) => r.text?.text || r.originalText?.text);

      if (textReviews.length === 0) {
        return new Response(JSON.stringify({ reviews: [], message: "No text reviews found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reviewRows = textReviews.map((r: any) => ({
        lounge_id,
        google_place_id,
        author_name: r.authorAttribution?.displayName || "Anonymous",
        rating: r.rating || null,
        review_text: r.text?.text || r.originalText?.text || "",
        relative_time: r.relativePublishTimeDescription || "",
      }));

      // Clear old reviews and classifications
      await serviceClient.from("review_classifications").delete().eq("lounge_id", lounge_id);
      await serviceClient.from("google_reviews").delete().eq("lounge_id", lounge_id);

      const { error: insertError } = await serviceClient.from("google_reviews").insert(reviewRows);
      if (insertError) console.error("Error inserting reviews:", insertError);

      return new Response(
        JSON.stringify({
          reviews: reviewRows.map((r: any) => ({
            author_name: r.author_name,
            rating: r.rating,
            review_text: r.review_text,
            relative_time: r.relative_time,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ═══ CLASSIFY ═══
    if (action === "classify") {
      const { lounge_id, venue_type } = body;
      if (!lounge_id)
        return new Response(JSON.stringify({ error: "lounge_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      // Get reviews that haven't been classified yet
      const { data: reviews, error: revErr } = await serviceClient
        .from("google_reviews")
        .select("id, review_text, rating")
        .eq("lounge_id", lounge_id);

      if (revErr) throw revErr;
      if (!reviews || reviews.length === 0) {
        return new Response(JSON.stringify({ classified: 0, message: "No reviews to classify" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check which are already classified
      const { data: existing } = await serviceClient
        .from("review_classifications")
        .select("review_id")
        .eq("lounge_id", lounge_id);

      const existingIds = new Set((existing || []).map((e: any) => e.review_id));
      const unclassified = reviews.filter((r: any) => !existingIds.has(r.id));

      if (unclassified.length === 0) {
        return new Response(JSON.stringify({ classified: 0, message: "All reviews already classified" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process in batches of 15
      const BATCH = 15;
      let classifiedCount = 0;

      for (let i = 0; i < unclassified.length; i += BATCH) {
        const batch = unclassified.slice(i, i + BATCH);
        try {
          const results = await classifyReviewsBatch(batch, venue_type || "lounge");

          const rows = results.map((r: any) => ({
            review_id: r.review_id,
            lounge_id,
            venue_type: venue_type || "lounge",
            aspects: r.aspects,
          }));

          if (rows.length > 0) {
            const { error: insErr } = await serviceClient
              .from("review_classifications")
              .upsert(rows, { onConflict: "review_id" });
            if (insErr) console.error("Classification insert error:", insErr);
            else classifiedCount += rows.length;
          }
        } catch (e: any) {
          console.error("Classification batch error:", e.message);
          if (e.message === "RATE_LIMITED") {
            return new Response(JSON.stringify({ error: "Rate limited" }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (e.message === "CREDITS_EXHAUSTED") {
            return new Response(JSON.stringify({ error: "Credits exhausted" }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        if (i + BATCH < unclassified.length) await new Promise((r) => setTimeout(r, 500));
      }

      return new Response(JSON.stringify({ classified: classifiedCount, total_reviews: reviews.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ COMPUTE SCORES ═══
    if (action === "compute-scores") {
      const { lounge_id } = body;
      if (!lounge_id)
        return new Response(JSON.stringify({ error: "lounge_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      // Get lounge data
      const { data: lounge, error: lErr } = await serviceClient
        .from("lounges")
        .select("id, type, rating, review_count, city_id")
        .eq("id", lounge_id)
        .single();
      if (lErr || !lounge) throw lErr || new Error("Lounge not found");

      // Get classifications
      const { data: classifications, error: cErr } = await serviceClient
        .from("review_classifications")
        .select("aspects")
        .eq("lounge_id", lounge_id);
      if (cErr) throw cErr;

      if (!classifications || classifications.length === 0) {
        return new Response(JSON.stringify({ error: "No classifications found. Run classify first." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get ratings for consistency calc
      const { data: reviews } = await serviceClient.from("google_reviews").select("rating").eq("lounge_id", lounge_id);

      // Build scoring context
      const { globalMean, cityCountryMap, countryMedianMap, globalMedian } = await buildScoringContext(serviceClient);

      const ratings = (reviews || []).map((r: any) => r.rating).filter((r: number | null): r is number => r !== null);
      const aspects = getAspects(lounge.type);
      const countryMedian = getCountryMedian(lounge.city_id, cityCountryMap, countryMedianMap, globalMedian);

      const { score, quality, sentiment, volume, consistency } = computeConnoisseurScore(
        Number(lounge.rating),
        lounge.review_count,
        classifications,
        aspects,
        ratings,
        globalMean,
        countryMedian,
      );

      const pillarScores = buildPillarScores(classifications, aspects);
      const confidence = computeConfidence(classifications.length);
      const scoreLabel = getScoreLabel(score);

      // Update lounge
      const { error: updateErr } = await serviceClient
        .from("lounges")
        .update({
          connoisseur_score: score,
          score_label: scoreLabel,
          score_source: "estimated",
          pillar_scores: pillarScores,
          confidence,
          review_data_count: classifications.length,
          scored_at: new Date().toISOString(),
        })
        .eq("id", lounge_id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({
          connoisseur_score: score,
          score_label: scoreLabel,
          pillar_scores: pillarScores,
          confidence,
          components: { quality, sentiment, volume, consistency },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ═══ SUMMARIZE ═══
    if (action === "summarize") {
      const { lounge_id } = body;
      if (!lounge_id)
        return new Response(JSON.stringify({ error: "lounge_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      const { data: lounge } = await serviceClient
        .from("lounges")
        .select("name, pillar_scores")
        .eq("id", lounge_id)
        .single();

      if (!lounge) throw new Error("Lounge not found");

      const { data: reviews } = await serviceClient
        .from("google_reviews")
        .select("review_text")
        .eq("lounge_id", lounge_id)
        .limit(5);

      const topSnippets = (reviews || []).map((r: any) => r.review_text?.slice(0, 200) || "");
      const summary = await generateSummary(lounge.name, lounge.pillar_scores || {}, topSnippets);

      const { error } = await serviceClient.from("lounges").update({ score_summary: summary }).eq("id", lounge_id);

      if (error) throw error;

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ MARK NO REVIEWS ═══
    if (action === "mark-no-reviews") {
      const { lounge_id } = body;
      if (!lounge_id || typeof lounge_id !== "string" || lounge_id.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid lounge_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await serviceClient.from("lounges").update({ score_source: "no_reviews" }).eq("id", lounge_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ SAVE (manual override) ═══
    if (action === "save") {
      const { lounge_id, connoisseur_score, score_label, pillar_scores, score_summary } = body;
      if (!lounge_id || typeof lounge_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid lounge_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedScore =
        typeof connoisseur_score === "number" ? Math.max(0, Math.min(100, Math.round(connoisseur_score))) : null;

      const { error } = await serviceClient
        .from("lounges")
        .update({
          connoisseur_score: normalizedScore,
          score_label,
          score_source: "estimated",
          score_summary,
          pillar_scores,
          scored_at: new Date().toISOString(),
        })
        .eq("id", lounge_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ BULK PIPELINE (chunk) ═══
    if (action === "bulk-pipeline" || action === "bulk-pipeline-chunk") {
      const offsetInput = Number(body.offset ?? 0);
      const limitInput = Number(body.limit ?? 10);
      const offset = Math.max(0, Math.floor(offsetInput));
      const limit = Math.min(30, Math.max(1, Math.floor(limitInput)));

      const { count: totalCount, error: totalError } = await serviceClient
        .from("lounges")
        .select("id", { count: "exact", head: true })
        .not("google_place_id", "is", null);
      if (totalError) throw totalError;

      const total = totalCount ?? 0;
      if (total === 0 || offset >= total) {
        return new Response(JSON.stringify({ processed: 0, total, next_offset: offset, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: lounges, error: loungeError } = await serviceClient
        .from("lounges")
        .select("id, name, type, rating, review_count, google_place_id, city_id")
        .not("google_place_id", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
      if (loungeError) throw loungeError;
      if (!lounges || lounges.length === 0) {
        return new Response(JSON.stringify({ processed: 0, total, next_offset: offset, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build scoring context
      const { globalMean, cityCountryMap, countryMedianMap, globalMedian } = await buildScoringContext(serviceClient);

      console.log(`Bulk pipeline chunk: ${lounges.length} lounges at offset ${offset}`);

      let scored = 0,
        skipped = 0,
        errors = 0;

      for (const lounge of lounges) {
        try {
          // 1. Check if reviews exist
          const { data: reviews } = await serviceClient
            .from("google_reviews")
            .select("id, review_text, rating")
            .eq("lounge_id", lounge.id);

          if (!reviews || reviews.length === 0) {
            skipped++;
            continue;
          }

          // 2. Classify (skip already-classified)
          const { data: existingC } = await serviceClient
            .from("review_classifications")
            .select("review_id")
            .eq("lounge_id", lounge.id);
          const existingIds = new Set((existingC || []).map((e: any) => e.review_id));
          const unclassified = reviews.filter((r: any) => !existingIds.has(r.id));

          if (unclassified.length > 0) {
            try {
              const results = await classifyReviewsBatch(unclassified, lounge.type);
              const rows = results.map((r: any) => ({
                review_id: r.review_id,
                lounge_id: lounge.id,
                venue_type: lounge.type,
                aspects: r.aspects,
              }));
              if (rows.length > 0) {
                await serviceClient.from("review_classifications").upsert(rows, { onConflict: "review_id" });
              }
            } catch (e: any) {
              if (e.message === "RATE_LIMITED" || e.message === "CREDITS_EXHAUSTED") throw e;
              console.error(`Classify error for ${lounge.name}:`, e.message);
              errors++;
              continue;
            }
          }

          // 3. Compute score
          const { data: allC } = await serviceClient
            .from("review_classifications")
            .select("aspects")
            .eq("lounge_id", lounge.id);

          if (!allC || allC.length === 0) {
            skipped++;
            continue;
          }

          const ratings = reviews.map((r: any) => r.rating).filter((r: number | null): r is number => r !== null);
          const aspects = getAspects(lounge.type);
          const countryMedian = getCountryMedian(lounge.city_id, cityCountryMap, countryMedianMap, globalMedian);

          const { score } = computeConnoisseurScore(
            Number(lounge.rating),
            lounge.review_count,
            allC,
            aspects,
            ratings,
            globalMean,
            countryMedian,
          );
          const pillarScores = buildPillarScores(allC, aspects);
          const confidence = computeConfidence(allC.length);
          const scoreLabel = getScoreLabel(score);

          // 4. Generate summary
          const topSnippets = reviews.slice(0, 3).map((r: any) => r.review_text?.slice(0, 200) || "");
          let summary = "";
          try {
            summary = await generateSummary(lounge.name, pillarScores, topSnippets);
          } catch {
            /* non-fatal */
          }

          // 5. Save
          await serviceClient
            .from("lounges")
            .update({
              connoisseur_score: score,
              score_label: scoreLabel,
              score_source: "estimated",
              pillar_scores: pillarScores,
              score_summary: summary || null,
              confidence,
              review_data_count: allC.length,
              scored_at: new Date().toISOString(),
            })
            .eq("id", lounge.id);

          scored++;
        } catch (e: any) {
          if (e.message === "RATE_LIMITED") {
            return new Response(
              JSON.stringify({ error: "Rate limited", scored, skipped, errors, next_offset: offset, done: false }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          if (e.message === "CREDITS_EXHAUSTED") {
            return new Response(
              JSON.stringify({ error: "Credits exhausted", scored, skipped, errors, next_offset: offset, done: false }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          console.error(`Error for ${lounge.name}:`, e.message);
          errors++;
        }

        // Brief delay between venues
        await new Promise((r) => setTimeout(r, 300));
      }

      const nextOffset = offset + lounges.length;
      return new Response(
        JSON.stringify({ scored, skipped, errors, total, next_offset: nextOffset, done: nextOffset >= total }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ═══ BULK FULL PIPELINE (fetch + classify + compute + summarize + save) ═══
    if (action === "bulk-full-pipeline-chunk") {
      const limitInput = Number(body.limit ?? 10);
      const limit = Math.min(20, Math.max(1, Math.floor(limitInput)));
      const concurrency = Math.min(Number(body.concurrency ?? 3), 5);

      const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
      if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");

      // Count total unscored venues with google_place_id
      const { count: totalCount } = await serviceClient
        .from("lounges")
        .select("id", { count: "exact", head: true })
        .eq("score_source", "none")
        .not("google_place_id", "is", null);

      const total = totalCount ?? 0;
      if (total === 0) {
        return new Response(JSON.stringify({ scored: 0, no_reviews: 0, errors: 0, remaining: 0, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Always fetch the NEXT batch of unscored venues (no offset needed — scored ones drop out)
      const { data: lounges } = await serviceClient
        .from("lounges")
        .select("id, name, type, rating, review_count, google_place_id, city_id")
        .eq("score_source", "none")
        .not("google_place_id", "is", null)
        .order("review_count", { ascending: false })
        .limit(limit);

      if (!lounges || lounges.length === 0) {
        return new Response(JSON.stringify({ scored: 0, no_reviews: 0, errors: 0, remaining: 0, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build scoring context
      const { globalMean, cityCountryMap, countryMedianMap, globalMedian } = await buildScoringContext(serviceClient);

      console.log(
        `Bulk full pipeline: processing ${lounges.length} venues (${total} remaining), concurrency=${concurrency}`,
      );

      let scored = 0,
        no_reviews = 0,
        errors = 0;
      let rateLimited = false;

      // Process a single venue through the full pipeline
      const processVenue = async (lounge: any): Promise<"scored" | "no_reviews" | "error" | "rate_limited"> => {
        try {
          // 1. Fetch reviews from Google
          const url = `https://places.googleapis.com/v1/places/${lounge.google_place_id}?fields=reviews&key=${GOOGLE_PLACES_API_KEY}`;
          const gResponse = await fetch(url);
          if (!gResponse.ok) {
            console.error(`Google API error for ${lounge.name}:`, gResponse.status);
            return "error";
          }

          const gData = await gResponse.json();
          const rawReviews = gData.reviews || [];
          const textReviews = rawReviews.filter((r: any) => r.text?.text || r.originalText?.text);

          if (textReviews.length === 0) {
            await serviceClient.from("lounges").update({ score_source: "no_reviews" }).eq("id", lounge.id);
            return "no_reviews";
          }

          // Clear old data in parallel
          await Promise.all([
            serviceClient.from("review_classifications").delete().eq("lounge_id", lounge.id),
            serviceClient.from("google_reviews").delete().eq("lounge_id", lounge.id),
          ]);

          const reviewRows = textReviews.map((r: any) => ({
            lounge_id: lounge.id,
            google_place_id: lounge.google_place_id,
            author_name: r.authorAttribution?.displayName || "Anonymous",
            rating: r.rating || null,
            review_text: r.text?.text || r.originalText?.text || "",
            relative_time: r.relativePublishTimeDescription || "",
          }));

          // Insert and get back IDs in one call
          const { data: savedReviews, error: insertErr } = await serviceClient
            .from("google_reviews")
            .insert(reviewRows)
            .select("id, review_text, rating");

          if (insertErr || !savedReviews || savedReviews.length === 0) {
            console.error(`Insert error for ${lounge.name}:`, insertErr?.message);
            return "error";
          }

          // 2. Classify sentiments
          try {
            const classResults = await classifyReviewsBatch(savedReviews, lounge.type);
            const classRows = classResults.map((r: any) => ({
              review_id: r.review_id,
              lounge_id: lounge.id,
              venue_type: lounge.type,
              aspects: r.aspects,
            }));
            if (classRows.length > 0) {
              await serviceClient.from("review_classifications").upsert(classRows, { onConflict: "review_id" });
            }
          } catch (e: any) {
            if (e.message === "RATE_LIMITED" || e.message === "CREDITS_EXHAUSTED") return "rate_limited";
            console.error(`Classify error for ${lounge.name}:`, e.message);
            return "error";
          }

          // 3. Compute score
          const { data: allC } = await serviceClient
            .from("review_classifications")
            .select("aspects")
            .eq("lounge_id", lounge.id);

          if (!allC || allC.length === 0) return "error";

          const ratings = savedReviews.map((r: any) => r.rating).filter((r: number | null): r is number => r !== null);
          const aspects = getAspects(lounge.type);
          const countryMedian = getCountryMedian(lounge.city_id, cityCountryMap, countryMedianMap, globalMedian);

          const { score } = computeConnoisseurScore(
            Number(lounge.rating),
            lounge.review_count,
            allC,
            aspects,
            ratings,
            globalMean,
            countryMedian,
          );
          const pillarScores = buildPillarScores(allC, aspects);
          const confidence = computeConfidence(allC.length);
          const scoreLabel = getScoreLabel(score);

          // 4. Generate summary
          const topSnippets = savedReviews.slice(0, 3).map((r: any) => r.review_text?.slice(0, 200) || "");
          let summary = "";
          try {
            summary = await generateSummary(lounge.name, pillarScores, topSnippets);
          } catch {
            /* non-fatal */
          }

          // 5. Save
          await serviceClient
            .from("lounges")
            .update({
              connoisseur_score: score,
              score_label: scoreLabel,
              score_source: "estimated",
              pillar_scores: pillarScores,
              score_summary: summary || null,
              confidence,
              review_data_count: allC.length,
              scored_at: new Date().toISOString(),
            })
            .eq("id", lounge.id);

          console.log(`✓ ${lounge.name}: score ${score} (${scoreLabel || "unranked"})`);
          return "scored";
        } catch (e: any) {
          console.error(`Error for ${lounge.name}:`, e.message);
          return "error";
        }
      };

      // Process venues with controlled concurrency
      for (let i = 0; i < lounges.length && !rateLimited; i += concurrency) {
        const batch = lounges.slice(i, i + concurrency);
        const results = await Promise.all(batch.map(processVenue));
        for (const r of results) {
          if (r === "scored") scored++;
          else if (r === "no_reviews") no_reviews++;
          else if (r === "rate_limited") {
            rateLimited = true;
            errors++;
          } else errors++;
        }
      }

      if (rateLimited) {
        return new Response(
          JSON.stringify({
            error: "Rate limited",
            scored,
            no_reviews,
            errors,
            remaining: total - scored - no_reviews - errors,
            done: false,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const remaining = total - scored - no_reviews - errors;
      return new Response(
        JSON.stringify({
          scored,
          no_reviews,
          errors,
          remaining: Math.max(0, remaining),
          done: remaining <= 0,
          total,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ═══ RECALCULATE SCORES CHUNK (no API, no AI — pure math) ═══
    if (action === "recalculate-scores-chunk") {
      const { offset = 0, limit = 50 } = body;

      // Count total estimated+verified lounges with classifications
      const { count: total } = await serviceClient
        .from("lounges")
        .select("id", { count: "exact", head: true })
        .in("score_source", ["estimated", "verified"]);

      // Fetch chunk
      const { data: lounges, error: lErr } = await serviceClient
        .from("lounges")
        .select("id, type, rating, review_count, city_id")
        .in("score_source", ["estimated", "verified"])
        .order("name")
        .range(offset, offset + limit - 1);

      if (lErr) throw lErr;
      if (!lounges || lounges.length === 0) {
        return new Response(JSON.stringify({ done: true, processed: 0, total: total || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build scoring context
      const { globalMean, cityCountryMap, countryMedianMap, globalMedian } = await buildScoringContext(serviceClient);

      let recalculated = 0,
        skipped = 0;

      for (const lounge of lounges) {
        // Get existing classifications
        const { data: classifications } = await serviceClient
          .from("review_classifications")
          .select("aspects")
          .eq("lounge_id", lounge.id);

        if (!classifications || classifications.length === 0) {
          skipped++;
          continue;
        }

        // Get ratings for consistency
        const { data: reviews } = await serviceClient
          .from("google_reviews")
          .select("rating")
          .eq("lounge_id", lounge.id);

        const ratings = (reviews || []).map((r: any) => r.rating).filter((r: number | null): r is number => r !== null);
        const aspects = getAspects(lounge.type);
        const countryMedian = getCountryMedian(lounge.city_id, cityCountryMap, countryMedianMap, globalMedian);

        const { score } = computeConnoisseurScore(
          Number(lounge.rating),
          lounge.review_count,
          classifications,
          aspects,
          ratings,
          globalMean,
          countryMedian,
        );

        const pillarScores = buildPillarScores(classifications, aspects);
        const confidence = computeConfidence(classifications.length);
        const scoreLabel = getScoreLabel(score);

        await serviceClient
          .from("lounges")
          .update({
            connoisseur_score: score,
            score_label: scoreLabel,
            pillar_scores: pillarScores,
            confidence,
            scored_at: new Date().toISOString(),
          })
          .eq("id", lounge.id);

        recalculated++;
      }

      const nextOffset = offset + lounges.length;
      return new Response(
        JSON.stringify({
          recalculated,
          skipped,
          total: total || 0,
          next_offset: nextOffset,
          done: nextOffset >= (total || 0),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Reset All Scores ───
    if (action === "reset-all") {
      // Clear all review classifications
      await serviceClient.from("review_classifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Reset all lounge score columns
      const { error: resetError } = await serviceClient
        .from("lounges")
        .update({
          connoisseur_score: null,
          pillar_scores: null,
          score_label: null,
          score_source: "none",
          score_summary: null,
          confidence: null,
          review_data_count: 0,
          scored_at: null,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (resetError) throw resetError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bootstrap-scores error:", e);
    const status =
      e instanceof Error && e.message === "Unauthorized"
        ? 401
        : e instanceof Error && e.message === "Forbidden"
          ? 403
          : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
