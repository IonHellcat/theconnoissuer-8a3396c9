import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildItinerary } from "@/lib/recommendations";
import type { LoungeWithCoords, VenuePreference } from "@/lib/recommendations";
import { SetupScreen } from "@/components/for-you/IntentScreen";
import { ItineraryScreen } from "@/components/for-you/ResultsList";
import { GeneratingScreen } from "@/components/for-you/GeneratingScreen";

export interface CityOption {
  id: string;
  name: string;
  country: string;
  loungeCount: number;
}

const ForYouPage = () => {
  const [phase, setPhase] = useState<"setup" | "generating" | "itinerary">("setup");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [stopCount, setStopCount] = useState<number | null>(null);
  const [preference, setPreference] = useState<VenuePreference>("both");
  const [itinerary, setItinerary] = useState<LoungeWithCoords[]>([]);

  // Cities that have at least one scored lounge
  const { data: cityOptions } = useQuery({
    queryKey: ["plan-trip-cities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lounges")
        .select("city_id, cities(id, name, country)")
        .not("connoisseur_score", "is", null);
      if (!data) return [];
      const map = new Map<string, CityOption>();
      data.forEach((row: any) => {
        if (!row.cities) return;
        map.set(row.city_id, { id: row.city_id, name: row.cities.name, country: row.cities.country });
      });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 30 * 60 * 1000,
  });

  // Lounges in selected city
  const { data: cityLounges, isLoading: loungesLoading } = useQuery({
    queryKey: ["plan-trip-lounges", selectedCity?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lounges")
        .select("id, name, slug, latitude, longitude, connoisseur_score, visit_type, type, address, image_url, score_label, score_source, score_summary, rating, city_id")
        .eq("city_id", selectedCity!.id)
        .not("connoisseur_score", "is", null);
      return (data ?? []) as LoungeWithCoords[];
    },
    enabled: !!selectedCity?.id,
    staleTime: 10 * 60 * 1000,
  });

  const handleBuild = useCallback(() => {
    if (!selectedCity || !stopCount || !cityLounges) return;
    setPhase("generating");

    const result = buildItinerary(cityLounges, stopCount, preference);
    // Enforce minimum dramatic delay
    const start = Date.now();
    const minDelay = 2500;
    const check = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= minDelay) {
        setItinerary(result);
        setPhase("itinerary");
      } else {
        setTimeout(check, minDelay - elapsed);
      }
    };
    check();
  }, [selectedCity, stopCount, preference, cityLounges]);

  const handleReset = () => {
    setPhase("setup");
    setSelectedCity(null);
    setStopCount(null);
    setPreference("both");
    setItinerary([]);
  };

  return (
    <>
      <Helmet>
        <title>Plan Your Trip — Cigar Itinerary | The Connoisseur</title>
        <meta name="description" content="Plan your cigar trip with a curated itinerary of top-scored lounges and shops." />
      </Helmet>
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {phase === "setup" && (
            <SetupScreen
              cityOptions={cityOptions ?? []}
              selectedCity={selectedCity}
              stopCount={stopCount}
              preference={preference}
              onSelectCity={setSelectedCity}
              onSetStopCount={setStopCount}
              onSetPreference={setPreference}
              onBuild={handleBuild}
              canBuild={!!selectedCity && !!stopCount && !loungesLoading}
            />
          )}
          {phase === "generating" && <GeneratingScreen />}
          {phase === "itinerary" && selectedCity && (
            <ItineraryScreen
              itinerary={itinerary}
              cityName={selectedCity.name}
              requestedStops={stopCount ?? 0}
              onReset={handleReset}
            />
          )}
        </div>
      </main>
    </>
  );
};

export default ForYouPage;
