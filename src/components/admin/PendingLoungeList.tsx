import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingLoungeCard } from "@/components/admin/PendingLoungeCard";
import { Check, X } from "lucide-react";
import type { PendingLounge } from "./adminPendingHelpers";

interface PendingLoungeListProps {
  grouped: Record<string, PendingLounge[]>;
  isPending: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleGroupSelect: (ids: string[], checked: boolean) => void;
  onApprove: (lounge: PendingLounge) => void;
  onReject: (lounge: PendingLounge) => void;
  onEdit: (lounge: PendingLounge) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
  isPossibleDuplicate: (name: string) => boolean;
}

export const PendingLoungeList = ({
  grouped, isPending, selectedIds,
  onToggleSelect, onToggleGroupSelect,
  onApprove, onReject, onEdit,
  onBulkApprove, onBulkReject,
  isPossibleDuplicate,
}: PendingLoungeListProps) => (
  <>
    {Object.entries(grouped).map(([city, items]) => {
      const groupIds = items.map((l) => l.id);
      const allSelected = isPending && groupIds.every((id) => selectedIds.has(id));

      return (
        <div key={city} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {isPending && (
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onToggleGroupSelect(groupIds, !!checked)}
                />
              )}
              <h2 className="text-lg font-display font-semibold text-primary">{city}</h2>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            {isPending && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-400 hover:text-green-300 text-xs"
                  onClick={() => {
                    onToggleGroupSelect(groupIds, true);
                    onBulkApprove(groupIds);
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />Approve All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 text-xs"
                  onClick={() => onBulkReject(groupIds)}
                >
                  <X className="h-3 w-3 mr-1" />Reject All
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {items.map((lounge) => (
              <PendingLoungeCard
                key={lounge.id}
                lounge={lounge}
                selected={selectedIds.has(lounge.id)}
                onSelectChange={(checked) => onToggleSelect(lounge.id, checked)}
                onApprove={(l) => onApprove(l)}
                onReject={(l) => onReject(l)}
                onEdit={(l) => onEdit(l)}
                isPossibleDuplicate={isPossibleDuplicate(lounge.name)}
              />
            ))}
          </div>
        </div>
      );
    })}
  </>
);
