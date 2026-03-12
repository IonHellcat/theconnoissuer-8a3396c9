import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

const QueryErrorBanner = ({ message, onRetry }: QueryErrorBannerProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
    <h3 className="font-display text-lg font-semibold text-foreground mb-1">Failed to load data</h3>
    <p className="text-sm text-muted-foreground font-body mb-4 max-w-sm">
      {message || "Something went wrong. Check your connection and try again."}
    </p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    )}
  </div>
);

export default QueryErrorBanner;
