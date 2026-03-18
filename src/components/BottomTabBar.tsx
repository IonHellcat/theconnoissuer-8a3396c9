import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, Trophy, MapPinCheck, Rss, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const BottomTabBar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const tabs = user
    ? [
        { to: "/", label: "Home", icon: Home },
        { to: "/for-you", label: "For You", icon: Sparkles },
        { to: "/feed", label: "Feed", icon: Rss },
        { to: "/visited", label: "Passport", icon: MapPinCheck },
      ]
    : [
        { to: "/", label: "Home", icon: Home },
        { to: "/explore", label: "Explore", icon: Compass },
        { to: "/leaderboard", label: "Top 100", icon: Trophy },
        { to: "/auth", label: "Sign In", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around h-16">
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
              <Icon className="h-[22px] w-[22px]" />
              <span className="text-[11px] font-body leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
