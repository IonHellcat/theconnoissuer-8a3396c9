import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_PREFIX = "https://places.googleapis.com/";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url || !url.startsWith(ALLOWED_PREFIX)) {
      return new Response(JSON.stringify({ error: "Invalid or disallowed URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Append API key if not already present
    const proxyUrl = url.includes("key=") ? url : `${url}${url.includes("?") ? "&" : "?"}key=${apiKey}`;

    const upstream = await fetch(proxyUrl, { redirect: "follow" });

    if (!upstream.ok) {
      return new Response(null, {
        status: upstream.status,
        headers: { ...corsHeaders },
      });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err: any) {
    console.error("image-proxy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
