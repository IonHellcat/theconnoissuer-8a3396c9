import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Send } from "lucide-react";

const REGION_PRESETS: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  Europe: ["United Kingdom", "Spain", "France", "Germany", "Italy", "Netherlands", "Switzerland"],
  Caribbean: ["Cuba", "Dominican Republic", "Jamaica", "Puerto Rico"],
  "Middle East": ["United Arab Emirates", "Lebanon", "Jordan"],
};

const ALL_MAJOR = Object.values(REGION_PRESETS).flat();

interface DiscoveredCities {
  country: string;
  cities: string[];
  error?: string;
}

interface Props {
  onSendToScraper: (cities: { city: string; country: string }[]) => void;
}

export const DiscoverCitiesForm = ({ onSendToScraper }: Props) => {
  const [countriesText, setCountriesText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredCities[]>([]);
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const parseCountries = (text: string) =>
    text.split("\n").map((l) => l.trim()).filter(Boolean);

  const applyPreset = (countries: string[]) => {
    const current = parseCountries(countriesText);
    const merged = [...new Set([...current, ...countries])];
    setCountriesText(merged.join("\n"));
  };

  const handleDiscover = async () => {
    const countries = parseCountries(countriesText);
    if (countries.length === 0) return;

    setIsLoading(true);
    setResults([]);
    setSelectedCities(new Set());

    try {
      // Process in chunks of 5 countries to avoid edge function timeout
      const CHUNK_SIZE = 5;
      const allResults: DiscoveredCities[] = [];

      for (let i = 0; i < countries.length; i += CHUNK_SIZE) {
        const chunk = countries.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase.functions.invoke("discover-cities", {
          body: { countries: chunk },
        });

        if (error) throw error;

        if (data?.success && data.results) {
          allResults.push(...data.results);
          // Show incremental results
          setResults([...allResults]);
          const allKeys = new Set<string>();
          for (const r of allResults) {
            for (const city of r.cities) {
              allKeys.add(`${city}|${r.country}`);
            }
          }
          setSelectedCities(allKeys);
        }
      }

      const totalCities = allResults.reduce(
        (sum: number, r: DiscoveredCities) => sum + r.cities.length, 0
      );
      toast({
        title: "Discovery Complete",
        description: `Found ${totalCities} cities across ${countries.length} countries`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCity = (key: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleCountry = (country: string, cities: string[], checked: boolean) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      cities.forEach((c) => {
        const key = `${c}|${country}`;
        checked ? next.add(key) : next.delete(key);
      });
      return next;
    });
  };

  const handleSend = () => {
    const entries = [...selectedCities].map((key) => {
      const [city, country] = key.split("|");
      return { city, country };
    });
    onSendToScraper(entries);
    toast({ title: "Sent", description: `${entries.length} cities sent to scraper` });
  };

  const countries = parseCountries(countriesText);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Step 1: Discover Cities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Region presets
          </Label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(REGION_PRESETS).map((region) => (
              <Button
                key={region}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(REGION_PRESETS[region])}
                disabled={isLoading}
              >
                {region}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(ALL_MAJOR)}
              disabled={isLoading}
            >
              All Major
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-1 block">
            Countries (one per line)
          </Label>
          <Textarea
            placeholder={"United States\nUnited Kingdom\nSpain"}
            value={countriesText}
            onChange={(e) => setCountriesText(e.target.value)}
            disabled={isLoading}
            rows={3}
          />
          {countries.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {countries.length} country/countries ready
            </p>
          )}
        </div>

        <Button onClick={handleDiscover} disabled={isLoading || countries.length === 0}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Discover Cities
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-4 mt-4">
            {results.map((r) => (
              <div key={r.country} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={r.cities.every((c) => selectedCities.has(`${c}|${r.country}`))}
                      onCheckedChange={(checked) => toggleCountry(r.country, r.cities, !!checked)}
                    />
                    <h3 className="font-display font-semibold text-primary">{r.country}</h3>
                    <Badge variant="secondary">{r.cities.length}</Badge>
                  </div>
                </div>
                {r.error ? (
                  <p className="text-sm text-destructive">{r.error}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {r.cities.map((city) => {
                      const key = `${city}|${r.country}`;
                      const isSelected = selectedCities.has(key);
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md cursor-pointer border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCity(key)}
                            className="h-3 w-3"
                          />
                          {city}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <Button
              onClick={handleSend}
              disabled={selectedCities.size === 0}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Send {selectedCities.size} Cities to Scraper
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
