import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function GuidesIndexPage() {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("slug, title, meta_description, hero_subtitle, guide_type, country, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Helmet>
        <title>Cigar Lounge Guides — The Connoisseur</title>
        <meta name="description" content="In-depth guides to the world's best cigar lounges, by country and city. Rankings, reviews, and insider tips." />
        <link rel="canonical" href="https://theconnoisseur.app/guides" />
      </Helmet>

      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <header className="mb-10 space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Cigar Lounge Guides</h1>
            <p className="text-muted-foreground max-w-lg">
              In-depth guides to the world's best cigar lounges, by country and city.
            </p>
          </header>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : !guides?.length ? (
            <p className="text-muted-foreground">No guides published yet. Check back soon!</p>
          ) : (
            <div className="grid gap-4">
              {guides.map(g => (
                <Link key={g.slug} to={`/guide/${g.slug}`}>
                  <Card className="bg-card border-border/50 rounded-xl hover:border-primary/40 transition-colors">
                    <CardContent className="p-6 flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-primary border-primary/50 text-xs flex-shrink-0">
                            {g.guide_type === "country" ? "Country Guide" : "City Guide"}
                          </Badge>
                          {g.country && <span className="text-xs text-muted-foreground">{g.country}</span>}
                        </div>
                        <h2 className="font-display text-lg font-bold leading-snug">{g.title}</h2>
                        {g.hero_subtitle && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{g.hero_subtitle}</p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
