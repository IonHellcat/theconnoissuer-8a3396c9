import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("lounge_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((f) => f.lounge_id);
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (loungeId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isFav = favoriteIds.includes(loungeId);
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("lounge_id", loungeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, lounge_id: loungeId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });

  const isFavorite = (loungeId: string) => favoriteIds.includes(loungeId);

  return { favoriteIds, isFavorite, toggleFavorite };
};
