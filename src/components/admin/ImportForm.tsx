import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Globe } from "lucide-react";

export const ImportForm = ({ onComplete }: { onComplete: () => void }) => {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const { toast } = useToast();

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !country.trim()) return;

    setIsLoading(true);
    setResultCount(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-lounges", {
        body: { city: city.trim(), country: country.trim() },
      });

      if (error) throw error;

      if (data?.success) {
        setResultCount(data.count);
        toast({
          title: "Scrape Complete",
          description: `Found ${data.count} new lounge(s) in ${city}`,
        });
        if (data.count > 0) onComplete();
      } else {
        throw new Error(data?.error || "Scrape failed");
      }
    } catch (err) {
      console.error("Scrape error:", err);
      toast({
        title: "Scrape Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-display">Import Lounges</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScrape} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="City name"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Input
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !city.trim() || !country.trim()}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scraping...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" />Scrape Directories</>
            )}
          </Button>
          <Button type="button" variant="outline" disabled className="opacity-50">
            <Globe className="mr-2 h-4 w-4" />
            Google Places
            <span className="ml-2 text-xs text-muted-foreground">Coming Soon</span>
          </Button>
        </form>
        {resultCount !== null && (
          <p className="mt-3 text-sm text-muted-foreground">
            {resultCount === 0
              ? "No new lounges found (all already exist or none matched)."
              : `${resultCount} new lounge(s) added to pending review.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
