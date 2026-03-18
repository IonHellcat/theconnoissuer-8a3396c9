import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Share2, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import TopFourShareCard from "@/components/TopFourShareCard";

interface TopFourShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  lounges: {
    name: string;
    cityName: string;
    image_url: string | null;
  }[];
  profileUrl: string;
}

const TopFourShareModal = ({
  open,
  onOpenChange,
  displayName,
  lounges,
  profileUrl,
}: TopFourShareModalProps) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const generateImage = async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#1a1a1a",
        logging: false,
      });
      return canvas;
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-top-4-theconnoisseur.png";
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
      const file = new File([blob], "my-top-4-theconnoisseur.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "My Top 4 — The Connoisseur",
          });
          return;
        } catch {
          // user cancelled or error — fall through to save
        }
      }
      // Fallback to download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-top-4-theconnoisseur.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Image saved!" });
    }, "image/png");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    toast({ title: "Link copied!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Share your Top 4</DialogTitle>
        </DialogHeader>

        {/* Preview at 50% scale */}
        <div className="flex justify-center">
          <div className="w-[180px] h-[320px] overflow-hidden relative rounded-lg border border-border/30">
            <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 360, height: 640 }}>
              <TopFourShareCard displayName={displayName} lounges={lounges} cardRef={{ current: null } as any} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={handleSave}
            disabled={generating}
            className="w-full min-h-[44px] gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Save image
          </Button>
          <Button
            variant="secondary"
            onClick={handleShare}
            disabled={generating}
            className="w-full min-h-[44px] gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share to Instagram / WhatsApp
          </Button>
          <Button
            variant="ghost"
            onClick={handleCopyLink}
            className="w-full min-h-[44px] gap-2"
          >
            <Link2 className="h-4 w-4" />
            Copy profile link
          </Button>
        </div>

        {/* Off-screen full-size card for html2canvas capture */}
        <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
          <TopFourShareCard displayName={displayName} lounges={lounges} cardRef={cardRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopFourShareModal;
