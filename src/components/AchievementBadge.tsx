import { Lock, MapPin, Award, Crown, Map, Globe, Star, PenLine, BookOpen, Flame, Heart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  MapPin, Award, Crown, Map, Globe, Star, PenLine, BookOpen, Flame, Heart,
};

const tierColors: Record<string, string> = {
  bronze: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  silver: "border-muted-foreground/40 bg-muted/50 text-muted-foreground",
  gold: "border-primary/40 bg-primary/10 text-primary",
  platinum: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

interface AchievementBadgeProps {
  achievement: {
    key: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
  };
  earned: boolean;
  earnedAt?: string;
}

const AchievementBadge = ({ achievement, earned, earnedAt }: AchievementBadgeProps) => {
  const Icon = iconMap[achievement.icon] || Star;
  const colors = tierColors[achievement.tier] || tierColors.bronze;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 text-center transition-all",
        colors,
        !earned && "opacity-40 grayscale"
      )}
    >
      {!earned && (
        <Lock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
      )}
      <Icon className="h-7 w-7 mx-auto mb-2" />
      <p className="font-display text-sm font-bold leading-tight">{achievement.name}</p>
      <p className="text-[10px] font-body mt-1 opacity-80">{achievement.description}</p>
      {earned && earnedAt && (
        <p className="text-[9px] font-body mt-1.5 opacity-60">
          {new Date(earnedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </p>
      )}
    </div>
  );
};

export default AchievementBadge;
