import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { VisitType, VenueType, RecommendedLounge } from "@/lib/recommendations";
import { IntentScreen } from "@/components/for-you/IntentScreen";
import { ResultsList } from "@/components/for-you/ResultsList";
import { useToast } from "@/hooks/use-toast";

type LocationMode = "here" | "travelling" | null;

interface CityOption {
  city_id: string;
  city_name: string;
  lat: number;
  lng: number;
}

const ForYouPage = () => {
  const { toast } = useToast();
  const [locationMode, setLocationMode] = useState<LocationMode>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [venueType, setVenueType] = useState<VenueType>("All");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [geoError, setGeoError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [results, setResults] = useState<RecommendedLounge[] | null>(null);
  const [finding, setFinding] = useState(false);

  // Load city list for travel mode
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lounges")
        .select("city_id, latitude, longitude, cities(name)")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (!data) return;

      const map = new Map<string, { lats: number[]; lngs: number[]; name: string }>();
      data.forEach((l: any) => {
        if (!l.city_id || l.latitude == null || l.longitude == null) return;
        const existing = map.get(l.city_id);
        if (existing) { existing.lats.push(l.latitude); existing.lngs.push(l.longitude); }
        else { map.set(l.city_id, { lats: [l.latitude], lngs: [l.longitude], name: l.cities?.name ?? "" }); }
      });
      const options: CityOption[] = [];
      map.forEach((v, k) => {
        options.push({ city_id: k, city_name: v.name, lat: v.lats.reduce((a, b) => a + b, 0) / v.lats.length, lng: v.lngs.reduce((a, b) => a + b, 0) / v.lngs.length });
      });
      options.sort((a, b) => a.city_name.localeCompare(b.city_name));
      setCityOptions(options);
    })();
  }, []);

  const requestGeo = useCallback(() => {
    setGeoLoading(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocationLabel("Current Location"); setGeoLoading(false); },
      () => { setGeoError(true); setGeoLoading(false); setLocationMode("travelling"); },
    );
  }, []);

  useEffect(() => { if (locationMode === "here") requestGeo(); }, [locationMode, requestGeo]);

  const selectCity = (city: CityOption) => {
    setUserLat(city.lat); setUserLng(city.lng); setLocationLabel(city.city_name);
    setShowCityDropdown(false); setCityQuery(city.city_name);
  };

  const canSubmit = userLat !== null && userLng !== null && visitType !== null;

  const handleFind = async () => {
    if (!canSubmit) return;
    setFinding(true);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-lounges", {
        body: { lat: userLat, lng: userLng, visit_type: visitType, venue_type: venueType },
      });
      if (error) throw error;

      const mapped: RecommendedLounge[] = (data || []).map((r: any) => ({
        ...r,
        city_name: r.city_name ?? "",
        city_slug: r.city_slug ?? "",
        distanceKm: r.distance_km,
        recommendationScore: r.recommendation_score,
      }));
      setResults(mapped);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFinding(false);
    }
  };

  const resetSearch = () => {
    setResults(null); setLocationMode(null); setVisitType(null); setVenueType("All");
    setUserLat(null); setUserLng(null); setLocationLabel(""); setCityQuery(""); setGeoError(false);
  };

  const filteredCities = cityQuery.length > 0
    ? cityOptions.filter((c) => c.city_name.toLowerCase().includes(cityQuery.toLowerCase()))
    : cityOptions;

  return (
    <>
      <Helmet>
        <title>For You — Personalized Picks | The Connoisseur</title>
        <meta name="description" content="Get personalized cigar lounge recommendations based on your location and visit style." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-lg">
          {results === null ? (
            <IntentScreen
              locationMode={locationMode} visitType={visitType} venueType={venueType}
              userLat={userLat} geoLoading={geoLoading} geoError={geoError}
              cityQuery={cityQuery} filteredCities={filteredCities} showCityDropdown={showCityDropdown}
              canSubmit={canSubmit} finding={finding}
              onSetLocationMode={(mode) => {
                if (mode === "here") { setLocationMode("here"); setCityQuery(""); }
                else { setLocationMode("travelling"); setUserLat(null); setUserLng(null); setLocationLabel(""); }
              }}
              onSetVisitType={setVisitType} onSetVenueType={setVenueType}
              onCityQueryChange={(q) => { setCityQuery(q); setShowCityDropdown(true); }}
              onCityFocus={() => setShowCityDropdown(true)}
              onSelectCity={selectCity} onFind={handleFind}
            />
          ) : (
            <ResultsList
              results={results} venueType={venueType} locationLabel={locationLabel}
              locationMode={locationMode} onReset={resetSearch}
            />
          )}
        </div>
      </main>
      {results !== null && <Footer />}
    </>
  );
};

export default ForYouPage;
