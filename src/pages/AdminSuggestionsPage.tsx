import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Inbox, Check, X, ExternalLink, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
};

const AdminSuggestionsPage = () => {
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounge_suggestions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("lounge_suggestions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      toast({ title: `Suggestion ${status}` });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const deleteSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lounge_suggestions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      toast({ title: "Suggestion deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  if (!roleLoading && !isAdmin) return <Navigate to="/" replace />;

  const pending = suggestions?.filter((s) => s.status === "pending") || [];
  const resolved = suggestions?.filter((s) => s.status !== "pending") || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Manage Suggestions — Admin — The Connoisseur</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Inbox className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl font-bold text-foreground">
              Lounge Suggestions
            </h1>
            {pending.length > 0 && (
              <span className="text-xs font-body font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {pending.length} pending
              </span>
            )}
          </div>

          {isLoading || roleLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : !suggestions || suggestions.length === 0 ? (
            <div className="text-center py-20">
              <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-body text-lg">No suggestions yet</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending */}
              {pending.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    Pending Review ({pending.length})
                  </h2>
                  <div className="space-y-4">
                    {pending.map((s) => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        onApprove={() => updateStatus.mutate({ id: s.id, status: "approved" })}
                        onReject={() => updateStatus.mutate({ id: s.id, status: "rejected" })}
                        onDelete={() => deleteSuggestion.mutate(s.id)}
                        isPending
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Resolved */}
              {resolved.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                    Resolved ({resolved.length})
                  </h2>
                  <div className="space-y-4">
                    {resolved.map((s) => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        onApprove={() => updateStatus.mutate({ id: s.id, status: "approved" })}
                        onReject={() => updateStatus.mutate({ id: s.id, status: "rejected" })}
                        onDelete={() => deleteSuggestion.mutate(s.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const SuggestionCard = ({
  suggestion: s,
  onApprove,
  onReject,
  onDelete,
  isPending,
}: {
  suggestion: any;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isPending?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card rounded-xl border border-border/50 p-5"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display text-lg font-bold text-foreground">{s.name}</h3>
          <span className={`text-[10px] font-body font-medium px-2 py-0.5 rounded-full ${statusColors[s.status] || statusColors.pending}`}>
            {s.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-body">
          {s.city}, {s.country}
        </p>
        {s.address && (
          <p className="text-xs text-muted-foreground/70 font-body mt-0.5">{s.address}</p>
        )}
        {s.website && (
          <a
            href={s.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary font-body mt-1 hover:underline"
          >
            Visit website <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {s.notes && (
          <p className="text-sm font-body text-foreground/80 mt-2 bg-secondary/50 rounded-lg p-3">
            "{s.notes}"
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/50 font-body mt-2">
          Submitted {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isPending ? (
          <>
            <Button size="sm" onClick={onApprove} className="gap-1 h-8">
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} className="gap-1 h-8">
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-muted-foreground hover:text-destructive h-8">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  </motion.div>
);

export default AdminSuggestionsPage;
