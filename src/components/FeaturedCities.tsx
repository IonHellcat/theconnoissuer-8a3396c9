import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";

const FEATURED_SLUGS = ["dubai", "london", "new-york", "havana"];

interface CityRow {
  id: string;
  name: string;
  country: string;
  slug: string;
  image_url: string | null;
  lounge_count: number;
}

const CityCard = ({ city, index }: { city: CityRow; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.3) }}
    className="min-w-[70vw] snap-center md:min-w-0"
  >
    <Link
      to={`/city/${city.slug}`}
      className="group block relative rounded-xl overflow-hidden aspect-[4/3] bg-secondary"
    >
      <OptimizedImage
        src={city.image_url || "/placeholder.svg"}
        alt={`${city.name} cigar lounges`}
        width={640}
        height={480}
        sizes="(max-width: 768px) 70vw, 25vw"
        widths={[320, 640, 960]}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="absolute top-2 left-2 z-10">
        <span className="text-[10px] sm:text-xs font-medium font-body px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
          Featured
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">{city.name}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-body">{city.country}</p>
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 text-primary">
          <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          <span className="text-xs font-medium font-body">
            {city.lounge_count} {city.lounge_count === 1 ? "lounge" : "lounges"}
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

const FeaturedCities = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: cities } = useQuery({
    queryKey: ["featured-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .in("slug", FEATURED_SLUGS);
      if (error) throw error;
      return FEATURED_SLUGS
        .map((slug) => data.find((c) => c.slug === slug))
        .filter(Boolean) as typeof data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !cities) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild?.clientWidth ?? 1;
    const gap = 16; // gap-4
    const idx = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(idx, cities.length - 1));
  }, [cities]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const isLoading = !cities;

  return (
    <div className="mb-10 sm:mb-14">
      <div className="text-center mb-6 sm:mb-8">
        <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
          Featured Destinations
        </h3>
      </div>

      {isLoading ? (
        <div className="flex overflow-hidden gap-4 md:grid md:grid-cols-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="min-w-[70vw] md:min-w-0 aspect-[4/3] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : cities.length === 0 ? null : (
        <>
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4 scrollbar-hide md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:snap-none md:pb-0"
          >
            {cities.map((city, index) => (
              <CityCard key={city.id} city={city} index={index} />
            ))}
          </div>

          {/* Scroll indicator dots — mobile only */}
          <div className="flex justify-center gap-1.5 mt-2 md:hidden">
            {cities.map((city, i) => (
              <div
                key={city.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activeIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedCities;
