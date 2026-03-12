import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Pencil, MapPin, Phone, Globe, Star, AlertTriangle, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type PendingLounge = Tables<"pending_lounges">;

interface Props {
  lounge: PendingLounge;
  onApprove: (lounge: PendingLounge) => void;
  onReject: (lounge: PendingLounge) => void;
  onEdit: (lounge: PendingLounge) => void;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  isPossibleDuplicate?: boolean;
}

export const PendingLoungeCard = ({ lounge, onApprove, onReject, onEdit, selected, onSelectChange, isPossibleDuplicate }: Props) => {
  const statusColor = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  }[lounge.status] || "bg-muted text-muted-foreground";

  return (
    <Card className={`border-border transition-colors ${selected ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {lounge.status === "pending" && onSelectChange && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange(!!checked)}
                className="mt-1 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-base font-semibold truncate">{lounge.name}</h3>
                <Badge variant="outline" className={statusColor}>
                  {lounge.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {lounge.source}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {lounge.type}
                </Badge>
                {isPossibleDuplicate && (
                  <Badge variant="outline" className="bg-orange-500/20 text-orange-400 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />Possible Duplicate
                  </Badge>
                )}
              </div>
              {lounge.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {lounge.address}
                </p>
              )}
              {lounge.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {lounge.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {lounge.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lounge.phone}</span>
                )}
                {lounge.website && (
                  <a href={lounge.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                    <Globe className="h-3 w-3" />Website
                  </a>
                )}
                {lounge.rating && lounge.rating > 0 && (
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" />{lounge.rating}</span>
                )}
              </div>
            </div>
          </div>
          {lounge.status === "pending" && (
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => onEdit(lounge)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => onApprove(lounge)} title="Approve">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => onReject(lounge)} title="Reject">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
