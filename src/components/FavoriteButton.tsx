import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import AuthPromptSheet from "@/components/AuthPromptSheet";

interface FavoriteButtonProps {
  loungeId: string;
  className?: string;
}

const FavoriteButton = ({ loungeId, className }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const favorited = isFavorite(loungeId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    toggleFavorite.mutate(loungeId);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-2 rounded-full transition-all duration-200",
        "bg-background/60 backdrop-blur-sm hover:bg-background/80",
        "border border-border/30",
        className
      )}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          favorited ? "fill-primary text-primary" : "text-muted-foreground"
        )}
      />
    </button>
  );
};

export default FavoriteButton;
