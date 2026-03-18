import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CityCard from "@/components/CityCard";

const ExplorePage = () => {
  const { data: cities, isLoading } = useQuery({
    queryKey: ["all-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Explore Cities — The Connoisseur</title>
        <meta name="description" content="Browse all cities with cigar lounges worldwide. Find your next destination with The Connoisseur." />
        <meta property="og:title" content="Explore Cities — The Connoisseur" />
        <meta property="og:description" content="Browse all cities with cigar lounges worldwide." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://theconnoisseur.app/explore" />
      </Helmet>
      <Navbar />
      <main className="pt-16">
        <section className="container mx-auto px-4 py-12">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">Explore Cities</h1>
          <p className="text-muted-foreground font-body mb-8">Discover cigar lounges around the world</p>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : !cities || cities.length === 0 ? (
            <p className="text-muted-foreground font-body">No cities found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cities.map((city, index) => (
                <CityCard
                  key={city.id}
                  name={city.name}
                  country={city.country}
                  loungeCount={city.lounge_count}
                  imageUrl={city.image_url || "/placeholder.svg"}
                  slug={city.slug}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ExplorePage;
