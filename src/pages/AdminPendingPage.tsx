import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportForm } from "@/components/admin/ImportForm";
import { PendingLoungeCard } from "@/components/admin/PendingLoungeCard";
import { EditPendingDialog } from "@/components/admin/EditPendingDialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type PendingLounge = Tables<"pending_lounges">;

const AdminPendingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [editLounge, setEditLounge] = useState<PendingLounge | null>(null);

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

  const approveMutation = useMutation({
    mutationFn: async (lounge: PendingLounge) => {
      // 1. Find or create city
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

      // 2. Insert lounge
      const { error: loungeErr } = await supabase.from("lounges").insert({
        name: lounge.name,
        slug: lounge.slug,
        city_id: city!.id,
        type: lounge.type,
        address: lounge.address,
        description: lounge.description,
        phone: lounge.phone,
        website: lounge.website,
        rating: lounge.rating || 0,
        review_count: lounge.review_count || 0,
        price_tier: lounge.price_tier || 2,
        features: lounge.features,
        cigar_highlights: lounge.cigar_highlights,
        image_url: lounge.image_url,
        gallery: lounge.gallery,
        latitude: lounge.latitude,
        longitude: lounge.longitude,
        hours: lounge.hours,
        google_place_id: lounge.google_place_id,
      });
      if (loungeErr) throw loungeErr;

      // 3. Increment city lounge_count
      await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }); // just to validate
      // We need a raw update for incrementing
      const { error: countErr } = await supabase
        .from("cities")
        .update({ lounge_count: (await supabase.from("lounges").select("id", { count: "exact" }).eq("city_id", city!.id)).count || 0 })
        .eq("id", city!.id);

      // 4. Mark pending as approved
      const { error: statusErr } = await supabase
        .from("pending_lounges")
        .update({ status: "approved" })
        .eq("id", lounge.id);
      if (statusErr) throw statusErr;
    },
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

  const editSaveMutation = useMutation({
    mutationFn: async ({ lounge, updates }: { lounge: PendingLounge; updates: Partial<PendingLounge> }) => {
      // Update the pending lounge first
      const { error } = await supabase
        .from("pending_lounges")
        .update(updates)
        .eq("id", lounge.id);
      if (error) throw error;
      // Then approve
      await approveMutation.mutateAsync({ ...lounge, ...updates } as PendingLounge);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-lounges"] });
    },
  });

  // Loading / auth guard
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

  // Group by city
  const grouped = filtered.reduce<Record<string, PendingLounge[]>>((acc, l) => {
    const key = `${l.city_name}, ${l.country}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-6">Admin: Pending Lounges</h1>

        <ImportForm onComplete={() => queryClient.invalidateQueries({ queryKey: ["pending-lounges"] })} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6 mb-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
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
          Object.entries(grouped).map(([city, items]) => (
            <div key={city} className="mb-6">
              <h2 className="text-lg font-display font-semibold mb-2 text-primary">{city}</h2>
              <div className="space-y-2">
                {items.map((lounge) => (
                  <PendingLoungeCard
                    key={lounge.id}
                    lounge={lounge}
                    onApprove={(l) => approveMutation.mutate(l)}
                    onReject={(l) => rejectMutation.mutate(l)}
                    onEdit={(l) => setEditLounge(l)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

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
