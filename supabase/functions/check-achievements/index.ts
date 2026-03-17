import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all achievements
    const { data: achievements } = await supabase.from("achievements").select("*");
    if (!achievements) return new Response(JSON.stringify({ new_achievements: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get already earned
    const { data: earned } = await supabase.from("user_achievements").select("achievement_key").eq("user_id", user_id);
    const earnedKeys = new Set((earned || []).map((e: any) => e.achievement_key));

    // Get user stats
    const { count: visitCount } = await supabase.from("visits").select("*", { count: "exact", head: true }).eq("user_id", user_id);

    const { data: visitCities } = await supabase.from("visits").select("lounges!inner(cities!inner(name))").eq("user_id", user_id);
    const citySet = new Set<string>();
    const countrySet = new Set<string>();
    // Need country too
    const { data: visitDetails } = await supabase.from("visits").select("lounges!inner(cities!inner(name, country))").eq("user_id", user_id);
    (visitDetails || []).forEach((v: any) => {
      if (v.lounges?.cities?.name) citySet.add(v.lounges.cities.name);
      if (v.lounges?.cities?.country) countrySet.add(v.lounges.cities.country);
    });

    const { count: reviewCount } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user_id);

    // Check for first_review (trendsetter) - user was first to review a lounge
    let isFirstReviewer = false;
    const { data: userReviews } = await supabase.from("reviews").select("lounge_id, created_at").eq("user_id", user_id).order("created_at", { ascending: true });
    if (userReviews) {
      for (const review of userReviews) {
        const { count } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("lounge_id", review.lounge_id).lt("created_at", review.created_at);
        if (count === 0) { isFirstReviewer = true; break; }
      }
    }

    // Check repeat visits
    let maxRepeatVisits = 0;
    const { data: visitCounts } = await supabase.rpc("recommend_lounges", { user_lat: 0, user_lng: 0, visit_style: "quick" }).limit(0); // dummy, we need raw SQL
    // Instead, get visits grouped by lounge
    const { data: allVisits } = await supabase.from("visits").select("lounge_id").eq("user_id", user_id);
    if (allVisits) {
      const loungeVisitMap: Record<string, number> = {};
      allVisits.forEach((v: any) => {
        loungeVisitMap[v.lounge_id] = (loungeVisitMap[v.lounge_id] || 0) + 1;
      });
      maxRepeatVisits = Math.max(0, ...Object.values(loungeVisitMap));
    }

    const stats: Record<string, number> = {
      visit_count: visitCount || 0,
      city_count: citySet.size,
      country_count: countrySet.size,
      review_count: reviewCount || 0,
      first_review: isFirstReviewer ? 1 : 0,
      repeat_visit: maxRepeatVisits,
    };

    const newAchievements: string[] = [];

    for (const achievement of achievements) {
      if (earnedKeys.has(achievement.key)) continue;
      const userValue = stats[achievement.condition_type] || 0;
      if (userValue >= achievement.condition_value) {
        const { error } = await supabase.from("user_achievements").insert({
          user_id,
          achievement_key: achievement.key,
        });
        if (!error) newAchievements.push(achievement.key);
      }
    }

    return new Response(JSON.stringify({ new_achievements: newAchievements }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
