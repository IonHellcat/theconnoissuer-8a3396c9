import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export default function SitemapPage() {
  const { data: cities, isLoading: loadingCities } = useQuery({
    queryKey: ["sitemap-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("slug, name, country, lounge_count")
        .order("lounge_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lounges, isLoading: loadingLounges } = useQuery({
    queryKey: ["sitemap-lounges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("slug, name, city_id, cities!inner(name)")
        .order("name");
      if (error) throw error;
      return data as (typeof data[number] & { cities: { name: string } })[];
    },
  });

  const { data: guides, isLoading: loadingGuides } = useQuery({
    queryKey: ["sitemap-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("slug, title, guide_type")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingCities || loadingLounges || loadingGuides;

  return (
    <>
      <Helmet>
        <title>Sitemap — The Connoisseur</title>
        <meta name="description" content="Browse all pages on The Connoisseur — cities, cigar lounges, and guides worldwide." />
        <link rel="canonical" href="https://theconnoisseur.app/sitemap" />
      </Helmet>

      <Navbar />

      <main className="pt-20 pb-24 md:pb-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-8">Sitemap</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              {/* Main Pages */}
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">Main Pages</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
                  <li><Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Explore Cities</Link></li>
                  <li><Link to="/leaderboard" className="text-muted-foreground hover:text-primary transition-colors">Leaderboard</Link></li>
                  <li><Link to="/for-you" className="text-muted-foreground hover:text-primary transition-colors">Plan Your Trip</Link></li>
                  <li><Link to="/guides" className="text-muted-foreground hover:text-primary transition-colors">Guides</Link></li>
                  <li><Link to="/search" className="text-muted-foreground hover:text-primary transition-colors">Search</Link></li>
                </ul>
              </section>

              {/* Guides */}
              {guides && guides.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-bold mb-4 text-primary">
                    Guides <span className="text-sm font-normal text-muted-foreground">({guides.length})</span>
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {guides.map((g) => (
                      <li key={g.slug}>
                        <Link to={`/guide/${g.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                          {g.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Cities */}
              {cities && cities.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-bold mb-4 text-primary">
                    Cities <span className="text-sm font-normal text-muted-foreground">({cities.length})</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    {cities.map((c) => (
                      <Link key={c.slug} to={`/city/${c.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {c.name}, {c.country} <span className="text-muted-foreground/50">({c.lounge_count})</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Lounges */}
              {lounges && lounges.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-bold mb-4 text-primary">
                    Lounges <span className="text-sm font-normal text-muted-foreground">({lounges.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {lounges.map((l) => (
                      <Link key={l.slug} to={`/lounge/${l.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {l.name} <span className="text-muted-foreground/50">· {l.cities.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
