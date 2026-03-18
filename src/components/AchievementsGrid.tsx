import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, PartyPopper } from "lucide-react";
import AchievementBadge from "./AchievementBadge";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface AchievementsGridProps {
  userId: string;
  showLocked?: boolean;
}

const SEEN_KEY = "seen-achievements";

function getSeenAchievements(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${SEEN_KEY}-${userId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markAchievementsSeen(userId: string, keys: string[]) {
  const seen = getSeenAchievements(userId);
  keys.forEach((k) => seen.add(k));
  localStorage.setItem(`${SEEN_KEY}-${userId}`, JSON.stringify([...seen]));
}

const AchievementsGrid = ({ userId, showLocked = true }: AchievementsGridProps) => {
  const { toast } = useToast();
  const celebratedRef = useRef(false);

  const { data: achievements, isLoading: loadingAchievements } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("achievements").select("*").order("condition_value");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userAchievements, isLoading: loadingUser } = useQuery({
    queryKey: ["user-achievements", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const earnedMap = new Map(
    (userAchievements || []).map((ua: any) => [ua.achievement_key, ua.earned_at])
  );

  const earnedKeys = [...earnedMap.keys()];
  const seen = getSeenAchievements(userId);
  const newlyEarned = earnedKeys.filter((k) => !seen.has(k));

  // Celebrate new achievements once
  useEffect(() => {
    if (celebratedRef.current || !userAchievements || !achievements || newlyEarned.length === 0) return;
    celebratedRef.current = true;

    // Show a single celebratory toast for all new achievements
    const names = newlyEarned
      .map((key) => achievements.find((a: any) => a.key === key)?.name)
      .filter(Boolean);

    if (names.length === 1) {
      toast({
        title: "🎉 New Achievement Unlocked!",
        description: names[0],
      });
    } else if (names.length > 1) {
      toast({
        title: `🎉 ${names.length} New Achievements!`,
        description: names.join(", "),
      });
    }

    // Mark as seen after a delay so the "NEW" shimmer plays
    setTimeout(() => {
      markAchievementsSeen(userId, newlyEarned);
    }, 5000);
  }, [userAchievements, achievements, newlyEarned.length]);

  if (loadingAchievements || loadingUser) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!achievements) return null;

  const earned = achievements.filter((a: any) => earnedMap.has(a.key));
  const locked = achievements.filter((a: any) => !earnedMap.has(a.key));
  const display = showLocked ? [...earned, ...locked] : earned;

  if (display.length === 0) return null;

  const newSet = new Set(newlyEarned);

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Achievements
        {newlyEarned.length > 0 && (
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <PartyPopper className="h-5 w-5 text-amber-500" />
          </motion.span>
        )}
      </h2>
      <p className="text-xs text-muted-foreground font-body mb-4">
        {earned.length} / {achievements.length} unlocked
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnimatePresence>
          {display.map((a: any, i: number) => {
            const isNew = newSet.has(a.key);
            return (
              <motion.div
                key={a.key}
                initial={{ opacity: 0, y: 16, scale: isNew ? 0.8 : 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: isNew ? 0.3 + i * 0.08 : i * 0.03,
                  type: isNew ? "spring" : "tween",
                  stiffness: 300,
                  damping: 20,
                }}
                className="relative"
              >
                {isNew && (
                  <motion.div
                    className="absolute -top-1.5 -right-1.5 z-10 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 500 }}
                  >
                    NEW
                  </motion.div>
                )}
                {isNew && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-primary/60 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.4, 1, 0] }}
                    transition={{ duration: 2, delay: 0.4 + i * 0.08 }}
                  />
                )}
                <AchievementBadge
                  achievement={a}
                  earned={earnedMap.has(a.key)}
                  earnedAt={earnedMap.get(a.key)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AchievementsGrid;
