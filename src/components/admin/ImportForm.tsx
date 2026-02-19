import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Globe } from "lucide-react";

interface ScrapeResult {
  city: string;
  country: string;
  count: number;
  error?: string;
}

type Source = "firecrawl" | "google_places";

interface Props {
  onComplete: () => void;
  initialCities?: { city: string; country: string }[];
}

export const ImportForm = ({ onComplete, initialCities }: Props) => {
  const [citiesText, setCitiesText] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [source, setSource] = useState<Source>("google_places");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; cityName: string } | null>(null);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const { toast } = useToast();

  // Pre-populate from discovery step
  useEffect(() => {
    if (initialCities && initialCities.length > 0) {
      const text = initialCities.map((e) => `${e.city}, ${e.country}`).join("\n");
      setCitiesText(text);
    }
  }, [initialCities]);

  const parseCities = (text: string) => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { city: parts[0] || "", country: parts.slice(1).join(",").trim() || "" };
      })
      .filter((e) => e.city && e.country);
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries = parseCities(citiesText);
    if (entries.length === 0) return;

    const fnName = source === "google_places" ? "search-places" : "scrape-lounges";

    setIsLoading(true);
    setResults([]);
    const scrapeResults: ScrapeResult[] = [];
    let totalFound = 0;

    for (let i = 0; i < entries.length; i++) {
      const { city, country } = entries[i];
      setProgress({ current: i + 1, total: entries.length, cityName: city });

      try {
        const { data, error } = await supabase.functions.invoke(fnName, {
          body: { city, country, auto_approve: autoApprove },
        });

        if (error) throw error;

        if (data?.success) {
          scrapeResults.push({ city, country, count: data.count });
          totalFound += data.count;
        } else {
          scrapeResults.push({ city, country, count: 0, error: data?.error || "Failed" });
        }
      } catch (err) {
        scrapeResults.push({
          city,
          country,
          count: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    setResults(scrapeResults);
    setProgress(null);
    setIsLoading(false);

    toast({
      title: "Batch Scrape Complete",
      description: `Found ${totalFound} new lounge(s) across ${entries.length} cities`,
    });

    if (totalFound > 0) onComplete();
  };

  const entries = parseCities(citiesText);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-display">Step 2: Import Lounges</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScrape} className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">
              Enter cities (one per line, format: City, Country)
            </Label>
            <Textarea
              placeholder={"Miami, United States\nNew York, United States\nLondon, United Kingdom"}
              value={citiesText}
              onChange={(e) => setCitiesText(e.target.value)}
              disabled={isLoading}
              rows={4}
            />
            {entries.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {entries.length} city/cities ready to scrape
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="auto-approve"
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
              disabled={isLoading}
            />
            <Label htmlFor="auto-approve" className="text-sm cursor-pointer">
              Auto-approve results (skip pending review)
            </Label>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant={source === "firecrawl" ? "default" : "outline"}
              disabled={isLoading || entries.length === 0}
              onClick={() => setSource("firecrawl")}
            >
              {isLoading && source === "firecrawl" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scraping...</>
              ) : (
                <><Search className="mr-2 h-4 w-4" />Firecrawl</>
              )}
            </Button>
            <Button
              type="submit"
              variant={source === "google_places" ? "default" : "outline"}
              disabled={isLoading || entries.length === 0}
              onClick={() => setSource("google_places")}
            >
              {isLoading && source === "google_places" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching...</>
              ) : (
                <><Globe className="mr-2 h-4 w-4" />Google Places</>
              )}
            </Button>
          </div>
        </form>

        {progress && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {source === "google_places" ? "Searching" : "Scraping"} {progress.current}/{progress.total}: <span className="text-foreground font-medium">{progress.cityName}</span>...
            </p>
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium mb-2">Results:</p>
            {results.map((r, i) => (
              <p key={i} className={`text-sm ${r.error ? "text-destructive" : "text-muted-foreground"}`}>
                {r.city}, {r.country}: {r.error ? `Error - ${r.error}` : `${r.count} new lounge(s)`}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
