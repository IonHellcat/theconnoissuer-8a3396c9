import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const FetchCityImagesButton = () => {
  const { toast } = useToast();
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const runFetch = async (mode: "missing" | "all") => {
    setFetching(true);
    setProgress({ done: 0, total: 0 });

    let totalProcessed = 0;
    let allResults: { city: string; status: string }[] = [];
    let remaining = 1; // start truthy

    try {
      while (remaining > 0) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-city-images`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, limit: 5 }),
          }
        );

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        totalProcessed += data.processed || 0;
        remaining = data.remaining || 0;
        allResults = [...allResults, ...(data.results || [])];

        setProgress({ done: totalProcessed, total: totalProcessed + remaining });

        if (data.processed === 0) break;
      }

      const succeeded = allResults.filter((r) => r.status === "success").length;
      const failed = allResults.filter((r) => r.status !== "success").length;

      toast({
        title: "City images fetched",
        description: `${succeeded} succeeded, ${failed} failed out of ${totalProcessed} processed.`,
      });
    } catch (err: any) {
      toast({
        title: "Fetch failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  if (fetching) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {progress.total > 0
          ? `Fetching ${progress.done}/${progress.total}...`
          : "Starting..."}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <ImageIcon className="h-4 w-4 mr-2" />
          Fetch City Images
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => runFetch("missing")}>
          Missing only
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runFetch("all")}>
          All cities (re-fetch)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
