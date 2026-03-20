import { Button } from "@/components/ui/button";
import { FetchCityImagesButton } from "@/components/admin/FetchCityImagesButton";
import { FetchLoungeImagesButton } from "@/components/admin/FetchLoungeImagesButton";
import { Download, RefreshCw, Database } from "lucide-react";

interface AdminToolsBarProps {
  reclassifying: boolean;
  reclassifyProgress: string;
  backfilling: boolean;
  backfillProgress: string;
  exporting: boolean;
  onReclassifyPending: () => void;
  onReclassifyApproved: () => void;
  onBackfillGoogleTypes: () => void;
  onExportLounges: () => void;
  onExportFull: () => void;
}

export const AdminToolsBar = ({
  reclassifying, reclassifyProgress, backfilling, backfillProgress, exporting,
  onReclassifyPending, onReclassifyApproved, onBackfillGoogleTypes, onExportLounges, onExportFull,
}: AdminToolsBarProps) => (
  <div className="flex flex-wrap justify-end gap-2 mb-4">
    <Button variant="outline" onClick={onReclassifyPending} disabled={reclassifying}>
      <RefreshCw className={`h-4 w-4 mr-2 ${reclassifying ? "animate-spin" : ""}`} />
      {reclassifying ? reclassifyProgress : "Reclassify Pending"}
    </Button>
    <Button variant="outline" onClick={onReclassifyApproved} disabled={reclassifying}>
      <RefreshCw className={`h-4 w-4 mr-2 ${reclassifying ? "animate-spin" : ""}`} />
      {reclassifying ? reclassifyProgress : "Reclassify Approved"}
    </Button>
    <Button variant="outline" onClick={onBackfillGoogleTypes} disabled={backfilling}>
      <Database className="h-4 w-4 mr-2" />
      {backfilling ? backfillProgress : "Backfill Google Types"}
    </Button>
    <FetchCityImagesButton />
    <FetchLoungeImagesButton />
    <Button variant="outline" onClick={onExportLounges} disabled={exporting}>
      <Download className="h-4 w-4 mr-2" />
      {exporting ? "Exporting..." : "Export Lounges"}
    </Button>
    <Button variant="outline" onClick={onExportFull} disabled={exporting}>
      <Download className="h-4 w-4 mr-2" />
      {exporting ? "Exporting..." : "Export Full Database"}
    </Button>
  </div>
);
