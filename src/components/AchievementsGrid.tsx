import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import AchievementBadge from "./AchievementBadge";
import { Skeleton } from "./ui/skeleton";

interface AchievementsGridProps {
  userId: string;
  showLocked?: boolean;
}

const AchievementsGrid = ({ userId, showLocked = true }: AchievementsGridProps) => {
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

  const earnedMap = new Map(
    (userAchievements || []).map((ua: any) => [ua.achievement_key, ua.earned_at])
  );

  const earned = achievements.filter((a: any) => earnedMap.has(a.key));
  const locked = achievements.filter((a: any) => !earnedMap.has(a.key));
  const display = showLocked ? [...earned, ...locked] : earned;

  if (display.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Achievements
      </h2>
      <p className="text-xs text-muted-foreground font-body mb-4">
        {earned.length} / {achievements.length} unlocked
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {display.map((a: any, i: number) => (
          <motion.div
            key={a.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <AchievementBadge
              achievement={a}
              earned={earnedMap.has(a.key)}
              earnedAt={earnedMap.get(a.key)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default AchievementsGrid;
