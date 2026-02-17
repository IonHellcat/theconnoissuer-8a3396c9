import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportForm } from "@/components/admin/ImportForm";
import { PendingLoungeCard } from "@/components/admin/PendingLoungeCard";
import { EditPendingDialog } from "@/components/admin/EditPendingDialog";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, Check, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type PendingLounge = Tables<"pending_lounges">;

async function approveLounge(lounge: PendingLounge, userId: string) {
  let { data: city } = await supabase
    .from("cities")
    .select("id")
    .eq("name", lounge.city_name)
    .maybeSingle();

  if (!city) {
    const slug = lounge.city_name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const { data: newCity, error: cityErr } = await supabase
      .from("cities")
      .insert({ name: lounge.city_name, country: lounge.country, slug })
      .select("id")
      .single();
    if (cityErr) throw cityErr;
    city = newCity;
  }

  const { error: loungeErr } = await supabase.from("lounges").insert({
    name: lounge.name, slug: lounge.slug, city_id: city!.id, type: lounge.type,
    address: lounge.address, description: lounge.description, phone: lounge.phone,
    website: lounge.website, rating: lounge.rating || 0, review_count: lounge.review_count || 0,
    price_tier: lounge.price_tier || 2, features: lounge.features,
    cigar_highlights: lounge.cigar_highlights, image_url: lounge.image_url,
    gallery: lounge.gallery, latitude: lounge.latitude, longitude: lounge.longitude,
    hours: lounge.hours, google_place_id: lounge.google_place_id,
  });
  if (loungeErr) throw loungeErr;

  const { count } = await supabase.from("lounges").select("id", { count: "exact", head: true }).eq("city_id", city!.id);
  await supabase.from("cities").update({ lounge_count: count || 0 }).eq("id", city!.id);

  const { error: statusErr } = await supabase
    .from("pending_lounges")
    .update({ status: "approved" })
    .eq("id", lounge.id);
  if (statusErr) throw statusErr;
}

const AdminPendingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [editLounge, setEditLounge] = useState<PendingLounge | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: lounges = [], isLoading } = useQuery({
    queryKey: ["pending-lounges", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_lounges")
        .select("*")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PendingLounge[];
    },
    enabled: !!isAdmin,
  });

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const toggleGroupSelect = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const approveMutation = useMutation({
    mutationFn: (lounge: PendingLounge) => approveLounge(lounge, user!.id),
    onSuccess: () => {
      toast({ title: "Approved", description: "Lounge added to directory" });
      queryClient.invalidateQueries({ queryKey: ["pending-lounges"] });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (lounge: PendingLounge) => {
      const { error } = await supabase
        .from("pending_lounges")
        .update({ status: "rejected" })
        .eq("id", lounge.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rejected" });
      queryClient.invalidateQueries({ queryKey: ["pending-lounges"] });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const toApprove = lounges.filter((l) => ids.includes(l.id));
      // Process in batches of 5
      for (let i = 0; i < toApprove.length; i += 5) {
        const batch = toApprove.slice(i, i + 5);
        await Promise.all(batch.map((l) => approveLounge(l, user!.id)));
      }
    },
    onSuccess: () => {
      toast({ title: "Bulk Approved", description: `${selectedIds.size} lounges approved` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pending-lounges"] });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("pending_lounges")
        .update({ status: "rejected" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Bulk Rejected", description: `${selectedIds.size} lounges rejected` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pending-lounges"] });
    },
  });

  const editSaveMutation = useMutation({
    mutationFn: async ({ lounge, updates }: { lounge: PendingLounge; updates: Partial<PendingLounge> }) => {
      const { error } = await supabase
        .from("pending_lounges")
        .update(updates)
        .eq("id", lounge.id);
      if (error) throw error;
      await approveLounge({ ...lounge, ...updates } as PendingLounge, user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-lounges"] });
    },
  });

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-display">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to view this page.</p>
      </div>
    );
  }

  const filtered = lounges.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.city_name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, PendingLounge[]>>((acc, l) => {
    const key = `${l.city_name}, ${l.country}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const isPending = statusFilter === "pending";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-6">Admin: Pending Lounges</h1>

        <ImportForm onComplete={() => queryClient.invalidateQueries({ queryKey: ["pending-lounges"] })} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6 mb-4">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No {statusFilter} lounges found.
          </p>
        ) : (
          Object.entries(grouped).map(([city, items]) => {
            const groupIds = items.map((l) => l.id);
            const allSelected = isPending && groupIds.every((id) => selectedIds.has(id));

            return (
              <div key={city} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {isPending && (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => toggleGroupSelect(groupIds, !!checked)}
                      />
                    )}
                    <h2 className="text-lg font-display font-semibold text-primary">{city}</h2>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  {isPending && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300 text-xs"
                        onClick={() => {
                          toggleGroupSelect(groupIds, true);
                          bulkApproveMutation.mutate(groupIds);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />Approve All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 text-xs"
                        onClick={() => bulkRejectMutation.mutate(groupIds)}
                      >
                        <X className="h-3 w-3 mr-1" />Reject All
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((lounge) => (
                    <PendingLoungeCard
                      key={lounge.id}
                      lounge={lounge}
                      selected={selectedIds.has(lounge.id)}
                      onSelectChange={(checked) => toggleSelect(lounge.id, checked)}
                      onApprove={(l) => approveMutation.mutate(l)}
                      onReject={(l) => rejectMutation.mutate(l)}
                      onEdit={(l) => setEditLounge(l)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BulkActionBar
        count={selectedIds.size}
        onApprove={() => bulkApproveMutation.mutate([...selectedIds])}
        onReject={() => bulkRejectMutation.mutate([...selectedIds])}
        isApproving={bulkApproveMutation.isPending}
        isRejecting={bulkRejectMutation.isPending}
      />

      <EditPendingDialog
        lounge={editLounge}
        open={!!editLounge}
        onOpenChange={(open) => !open && setEditLounge(null)}
        onSave={(lounge, updates) => editSaveMutation.mutate({ lounge, updates })}
      />
    </div>
  );
};

export default AdminPendingPage;
