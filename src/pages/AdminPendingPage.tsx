import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportForm } from "@/components/admin/ImportForm";
import { DiscoverCitiesForm } from "@/components/admin/DiscoverCitiesForm";
import { EditPendingDialog } from "@/components/admin/EditPendingDialog";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { AdminToolsBar } from "@/components/admin/AdminToolsBar";
import { PendingLoungeList } from "@/components/admin/PendingLoungeList";
import { approveLounge, type PendingLounge } from "@/components/admin/adminPendingHelpers";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";

const AdminPendingPage = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyProgress, setReclassifyProgress] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [editLounge, setEditLounge] = useState<PendingLounge | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discoveredCities, setDiscoveredCities] = useState<{ city: string; country: string }[] | undefined>();

  const handleBackfillGoogleTypes = async (targetTable: "lounges" | "pending_lounges" = "lounges") => {
    if (!session?.access_token) return;
    setBackfilling(true);
    setBackfillProgress("Starting...");
    let offset = 0;
    let totalUpdated = 0;
    try {
      while (true) {
        setBackfillProgress(`Updated ${totalUpdated}, processing...`);
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-google-types`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ table: targetTable, offset }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        totalUpdated += data.updated || 0;
        if (!data.next_offset) break;
        offset = data.next_offset;
      }
      toast({ title: "Backfill complete", description: `${totalUpdated} venues updated with Google types` });
    } catch (err: any) {
      toast({ title: "Backfill failed", description: err.message, variant: "destructive" });
    } finally {
      setBackfilling(false);
      setBackfillProgress("");
    }
  };

  const handleReclassifyVenues = async (targetTable: "lounges" | "pending_lounges" = "lounges") => {
    if (!session?.access_token) return;
    setReclassifying(true);
    setReclassifyProgress("Starting...");
    let offset = 0;
    let totalClassified = 0;
    let totalReclassified = 0;
    try {
      while (true) {
        setReclassifyProgress(`Processing batch at offset ${offset}...`);
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reclassify-venues`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ table: targetTable, offset }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        totalClassified += data.classified || 0;
        totalReclassified += data.reclassified || 0;
        if (!data.next_offset) break;
        offset = data.next_offset;
      }
      toast({ title: "Reclassification complete", description: `${totalClassified} venues processed, ${totalReclassified} reclassified as shop/both` });
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Reclassification failed", description: err.message, variant: "destructive" });
    } finally {
      setReclassifying(false);
      setReclassifyProgress("");
    }
  };

  const handleExportDatabase = async (tablesParam?: string) => {
    if (!session?.access_token) return;
    setExporting(true);
    try {
      const exportUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database`);
      if (tablesParam) exportUrl.searchParams.set("tables", tablesParam);
      const res = await fetch(exportUrl.toString(), { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${tablesParam || "database"}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Export complete", description: "Database downloaded as Excel file" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const { data: existingLoungeNames = [] } = useQuery({
    queryKey: ["existing-lounge-names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lounges").select("name");
      if (error) throw error;
      return (data || []).map((l) =>
        l.name.toLowerCase().replace(/^the\s+/, "").replace(/\band\b/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim()
      );
    },
    enabled: !!isAdmin,
  });

  const isPossibleDuplicate = useCallback((name: string) => {
    const normalized = name.toLowerCase().replace(/^the\s+/, "").replace(/\band\b/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    return existingLoungeNames.includes(normalized);
  }, [existingLoungeNames]);

  const { data: lounges = [], isLoading } = useQuery({
    queryKey: ["pending-lounges", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_lounges").select("*").eq("status", statusFilter).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PendingLounge[];
    },
    enabled: !!isAdmin,
  });

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next; });
  }, []);

  const toggleGroupSelect = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds((prev) => { const next = new Set(prev); ids.forEach((id) => (checked ? next.add(id) : next.delete(id))); return next; });
  }, []);

  const approveMutation = useMutation({
    mutationFn: (lounge: PendingLounge) => approveLounge(lounge, user!.id),
    onSuccess: () => { toast({ title: "Approved", description: "Lounge added to directory" }); queryClient.invalidateQueries({ queryKey: ["pending-lounges"] }); },
    onError: (err) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (lounge: PendingLounge) => {
      const { error } = await supabase.from("pending_lounges").update({ status: "rejected" }).eq("id", lounge.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Rejected" }); queryClient.invalidateQueries({ queryKey: ["pending-lounges"] }); },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const toApprove = lounges.filter((l) => ids.includes(l.id));
      for (let i = 0; i < toApprove.length; i += 5) {
        const batch = toApprove.slice(i, i + 5);
        await Promise.all(batch.map((l) => approveLounge(l, user!.id)));
      }
    },
    onSuccess: () => { toast({ title: "Bulk Approved", description: `${selectedIds.size} lounges approved` }); setSelectedIds(new Set()); queryClient.invalidateQueries({ queryKey: ["pending-lounges"] }); },
    onError: (err) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("pending_lounges").update({ status: "rejected" }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Bulk Rejected", description: `${selectedIds.size} lounges rejected` }); setSelectedIds(new Set()); queryClient.invalidateQueries({ queryKey: ["pending-lounges"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (lounge: PendingLounge) => {
      const { error } = await supabase.from("pending_lounges").delete().eq("id", lounge.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Deleted", description: "Lounge permanently removed" }); queryClient.invalidateQueries({ queryKey: ["pending-lounges"] }); },
    onError: (err) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const editSaveMutation = useMutation({
    mutationFn: async ({ lounge, updates }: { lounge: PendingLounge; updates: Partial<PendingLounge> }) => {
      const { error } = await supabase.from("pending_lounges").update(updates).eq("id", lounge.id);
      if (error) throw error;
      await approveLounge({ ...lounge, ...updates } as PendingLounge, user!.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pending-lounges"] }); },
  });

  useEffect(() => {
    if (!authLoading && !roleLoading && !user) navigate("/auth");
  }, [user, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-display">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to view this page.</p>
      </div>
    );
  }

  const filtered = lounges.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.city_name.toLowerCase().includes(search.toLowerCase()));
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

        <AdminToolsBar
          reclassifying={reclassifying} reclassifyProgress={reclassifyProgress}
          backfilling={backfilling} backfillProgress={backfillProgress} exporting={exporting}
          onReclassifyPending={() => handleReclassifyVenues("pending_lounges")}
          onReclassifyApproved={() => handleReclassifyVenues("lounges")}
          onBackfillGoogleTypes={() => handleBackfillGoogleTypes("lounges")}
          onExportLounges={() => handleExportDatabase("lounges")}
          onExportFull={() => handleExportDatabase()}
        />

        <DiscoverCitiesForm onSendToScraper={(cities) => setDiscoveredCities(cities)} />
        <div className="mt-6">
          <ImportForm onComplete={() => queryClient.invalidateQueries({ queryKey: ["pending-lounges"] })} initialCities={discoveredCities} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6 mb-4">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input placeholder="Search by name or city..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No {statusFilter} lounges found.</p>
        ) : (
          <PendingLoungeList
            grouped={grouped} isPending={isPending} selectedIds={selectedIds}
            onToggleSelect={toggleSelect} onToggleGroupSelect={toggleGroupSelect}
            onApprove={(l) => approveMutation.mutate(l)} onReject={(l) => rejectMutation.mutate(l)}
            onEdit={(l) => setEditLounge(l)}
            onDelete={(l) => { if (confirm(`Permanently delete "${l.name}"?`)) deleteMutation.mutate(l); }}
            onBulkApprove={(ids) => bulkApproveMutation.mutate(ids)}
            onBulkReject={(ids) => bulkRejectMutation.mutate(ids)}
            isPossibleDuplicate={isPossibleDuplicate}
          />
        )}
      </div>

      <BulkActionBar count={selectedIds.size} onApprove={() => bulkApproveMutation.mutate([...selectedIds])} onReject={() => bulkRejectMutation.mutate([...selectedIds])} isApproving={bulkApproveMutation.isPending} isRejecting={bulkRejectMutation.isPending} />
      <EditPendingDialog lounge={editLounge} open={!!editLounge} onOpenChange={(open) => !open && setEditLounge(null)} onSave={(lounge, updates) => editSaveMutation.mutate({ lounge, updates })} />
    </div>
  );
};

export default AdminPendingPage;
