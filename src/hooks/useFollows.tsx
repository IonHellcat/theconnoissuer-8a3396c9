import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useFollows = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: following } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      if (error) throw error;
      return new Set(data.map((f: any) => f.following_id));
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFollowing = (userId: string) => following?.has(userId) ?? false;

  const follow = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("follows").insert({
        follower_id: user!.id,
        following_id: userId,
      });
      if (error) throw error;
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ["following", user?.id] });
      const prev = queryClient.getQueryData<Set<string>>(["following", user?.id]);
      queryClient.setQueryData(["following", user?.id], new Set([...(prev || []), userId]));
      return { prev };
    },
    onError: (_err, _userId, context) => {
      queryClient.setQueryData(["following", user?.id], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["follower-count"] });
      queryClient.invalidateQueries({ queryKey: ["following-count"] });
    },
  });

  const unfollow = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user!.id)
        .eq("following_id", userId);
      if (error) throw error;
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ["following", user?.id] });
      const prev = queryClient.getQueryData<Set<string>>(["following", user?.id]);
      const next = new Set(prev);
      next.delete(userId);
      queryClient.setQueryData(["following", user?.id], next);
      return { prev };
    },
    onError: (_err, _userId, context) => {
      queryClient.setQueryData(["following", user?.id], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["follower-count"] });
      queryClient.invalidateQueries({ queryKey: ["following-count"] });
    },
  });

  const useFollowerCount = (userId: string) =>
    useQuery({
      queryKey: ["follower-count", userId],
      queryFn: async () => {
        const { count, error } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId);
        if (error) throw error;
        return count || 0;
      },
      staleTime: 60_000,
    });

  const useFollowingCount = (userId: string) =>
    useQuery({
      queryKey: ["following-count", userId],
      queryFn: async () => {
        const { count, error } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId);
        if (error) throw error;
        return count || 0;
      },
      staleTime: 60_000,
    });

  return { isFollowing, follow, unfollow, useFollowerCount, useFollowingCount };
};
