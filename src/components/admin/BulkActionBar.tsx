import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Props {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export const BulkActionBar = ({ count, onApprove, onReject, isApproving, isRejecting }: Props) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg px-6 py-3 flex items-center gap-4">
      <span className="text-sm font-medium">{count} selected</span>
      <Button
        size="sm"
        onClick={onApprove}
        disabled={isApproving || isRejecting}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Check className="h-4 w-4 mr-1" />
        Approve Selected
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={onReject}
        disabled={isApproving || isRejecting}
      >
        <X className="h-4 w-4 mr-1" />
        Reject Selected
      </Button>
    </div>
  );
};
