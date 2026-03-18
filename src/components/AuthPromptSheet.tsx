import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPinCheck, Heart, Star, Globe } from "lucide-react";

interface AuthPromptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "visit" | "favorite" | "review" | "feed";
}

const variantConfig = {
  visit: {
    icon: MapPinCheck,
    heading: "Start your cigar passport",
    body: "Track every lounge you visit. Build a collection across cities and countries.",
    bullets: [
      "Personal world map of visited lounges",
      "Stats — cities, countries, average score",
      "Earn achievements for every milestone",
    ],
  },
  favorite: {
    icon: Heart,
    heading: "Save this lounge",
    body: "Build your wishlist of lounges to visit next.",
    bullets: [
      "Access your saved lounges anywhere",
      "Never lose a recommendation",
      "Share your list with other connoisseurs",
    ],
  },
  review: {
    icon: Star,
    heading: "Share your experience",
    body: "Your review helps the community and improves the Connoisseur Score.",
    bullets: [
      "Rate atmosphere, service, and selection",
      "Log the cigar you smoked and your drink pairing",
      "Earn the Critic's Eye achievement",
    ],
  },
  feed: {
    icon: Globe,
    heading: "See what's happening",
    body: "Follow other connoisseurs and see their visits and reviews in real time.",
    bullets: [
      "Activity feed from people you follow",
      "Discover new lounges through your network",
      "Earn achievements and reactions",
    ],
  },
};

const AuthPromptSheet = ({ open, onOpenChange, variant }: AuthPromptSheetProps) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] overflow-y-auto px-6 pb-8 pt-6 [&>button]:hidden">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>

          {/* Heading + Body */}
          <div className="space-y-2 mb-5">
            <h2 className="font-display text-xl font-bold text-foreground">{config.heading}</h2>
            <p className="text-sm text-muted-foreground font-body max-w-sm">{config.body}</p>
          </div>

          {/* Bullets */}
          <ul className="space-y-2 mb-6 text-left w-full max-w-sm">
            {config.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm font-body text-foreground">
                <span className="text-primary font-bold mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="w-full max-w-sm space-y-2">
            <Link to="/auth" className="block">
              <Button className="w-full font-body font-semibold h-11">Create free account</Button>
            </Link>
            <Link to="/auth" className="block">
              <Button variant="ghost" className="w-full font-body text-muted-foreground">Log in</Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AuthPromptSheet;
