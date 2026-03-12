import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://theconnoissuer.lovable.app";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: cities } = await supabase
    .from("cities")
    .select("slug, created_at")
    .order("lounge_count", { ascending: false });

  const { data: lounges } = await supabase
    .from("lounges")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/explore</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

  if (cities) {
    for (const city of cities) {
      xml += `
  <url>
    <loc>${BASE_URL}/city/${city.slug}</loc>
    <lastmod>${new Date(city.created_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }
  }

  if (lounges) {
    for (const lounge of lounges) {
      xml += `
  <url>
    <loc>${BASE_URL}/lounge/${lounge.slug}</loc>
    <lastmod>${new Date(lounge.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
