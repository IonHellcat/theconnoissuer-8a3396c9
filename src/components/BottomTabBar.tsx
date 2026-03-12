import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, Search, Heart, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/for-you", label: "For You", icon: Sparkles },
  { to: "/leaderboard", label: "Top 100", icon: Trophy },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/favorites", label: "Favorites", icon: Heart },
] as const;

const BottomTabBar = () => {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-body leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
