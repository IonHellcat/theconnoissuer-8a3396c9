import { MapPinCheck, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VisitButtonProps {
  loungeId: string;
  className?: string;
}

const VisitButton = ({ loungeId, className }: VisitButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: visit } = useQuery({
    queryKey: ["visit", loungeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id")
        .eq("user_id", user!.id)
        .eq("lounge_id", loungeId)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const visited = !!visit;

  const toggle = useMutation({
    mutationFn: async () => {
      if (visited) {
        await supabase.from("visits").delete().eq("id", visit!.id);
      } else {
        await supabase.from("visits").insert({ user_id: user!.id, lounge_id: loungeId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit", loungeId] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      toast({
        title: visited ? "Removed from passport" : "Added to your passport!",
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    toggle.mutate();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-2 rounded-full transition-all duration-200",
        "bg-background/60 backdrop-blur-sm hover:bg-background/80",
        "border border-border/30",
        visited && "border-primary/50 bg-primary/10",
        className
      )}
      aria-label={visited ? "Remove from passport" : "Mark as visited"}
    >
      <MapPinCheck
        className={cn(
          "h-4 w-4 transition-colors",
          visited ? "fill-primary text-primary" : "text-muted-foreground"
        )}
      />
    </button>
  );
};

export default VisitButton;
