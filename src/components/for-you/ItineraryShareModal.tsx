import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ItineraryShareCard from "./ItineraryShareCard";
import type { LoungeWithCoords } from "@/lib/recommendations";

interface ItineraryShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityName: string;
  itinerary: LoungeWithCoords[];
}

const ItineraryShareModal = ({ open, onOpenChange, cityName, itinerary }: ItineraryShareModalProps) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const stops = itinerary.map((l) => ({
    name: l.name,
    type: l.type || "lounge",
    image_url: l.image_url,
    image_url_cached: l.image_url_cached,
    connoisseur_score: l.connoisseur_score,
  }));

  const generateImage = async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#1a1a1a",
        logging: false,
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
      });
      return canvas;
    } finally {
      setGenerating(false);
    }
  };

  const fileName = `itinerary-${cityName.toLowerCase().replace(/\s+/g, "-")}-theconnoisseur.png`;

  const handleSave = async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Cigar Itinerary — ${cityName}` });
          return;
        } catch {
          return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Image saved!" });
    }, "image/png");
  };

  const handleShare = async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Cigar Itinerary — ${cityName}` });
          return;
        } catch {
          // cancelled
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Image saved!" });
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Share your itinerary</DialogTitle>
        </DialogHeader>

        {/* Preview at 50% scale */}
        <div className="flex justify-center">
          <div className="w-[180px] h-[320px] overflow-hidden relative rounded-lg border border-border/30">
            <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 360, height: 640 }}>
              <ItineraryShareCard cityName={cityName} stops={stops} cardRef={{ current: null } as any} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={handleSave} disabled={generating} className="w-full min-h-[44px] gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Save to Photos
          </Button>
          <Button variant="secondary" onClick={handleShare} disabled={generating} className="w-full min-h-[44px] gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share to Instagram / WhatsApp
          </Button>
        </div>

        {/* Off-screen full-size card for html2canvas */}
        <div style={{ position: "fixed", left: 0, top: 0, transform: "translateX(-200vw)" }}>
          <ItineraryShareCard cityName={cityName} stops={stops} cardRef={cardRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItineraryShareModal;
