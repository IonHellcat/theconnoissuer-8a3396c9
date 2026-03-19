import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Trash2, ImageOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BATCH_SIZE = 60;

type FlaggedVenue = { id: string; name: string; address: string | null; google_types: any; image_url: string | null };

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  async function next() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, next));
  return results;
}

export function AuditLoungesTab() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [flagged, setFlagged] = useState<FlaggedVenue[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [done, setDone] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const runAudit = useCallback(async () => {
    if (!session?.access_token) return;
    setRunning(true);
    setFlagged([]);
    setTotalScanned(0);
    setDone(false);
    setSelectedIds(new Set());

    try {
      const { count } = await supabase.from("lounges").select("id", { count: "exact", head: true });
      const total = count || 0;
      if (total === 0) {
        setProgress("No lounges found.");
        setDone(true);
        setRunning(false);
        return;
      }

      const offsets: number[] = [];
      for (let o = 0; o < total; o += BATCH_SIZE) offsets.push(o);

      let scannedSoFar = 0;
      let flaggedSoFar = 0;

      const tasks = offsets.map((offset) => async () => {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-lounges`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ offset }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        scannedSoFar += data.total_scanned || 0;
        flaggedSoFar += data.flagged_count || 0;

        if (data.flagged?.length) {
          setFlagged((prev) => [...prev, ...data.flagged]);
        }
        setTotalScanned(scannedSoFar);
        setProgress(`Scanned ${scannedSoFar} / ${total} lounges, ${flaggedSoFar} flagged so far...`);

        return data;
      });

      await runWithConcurrency(tasks, 5);
      setProgress(`Audit complete: ${scannedSoFar} lounges scanned, ${flaggedSoFar} flagged.`);
      setDone(true);
    } catch (err: any) {
      toast({ title: "Audit failed", description: err.message, variant: "destructive" });
      setProgress("");
    } finally {
      setRunning(false);
    }
  }, [session, toast]);

  const handleDelete = useCallback(async () => {
    if (!session?.access_token || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-lounges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ delete_ids: [...selectedIds] }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast({ title: "Deleted", description: `${data.deleted} lounges removed and blocklisted.` });
      setFlagged((prev) => prev.filter((v) => !selectedIds.has(v.id)));
      setSelectedIds(new Set());
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }, [session, selectedIds, toast, queryClient]);

  const allSelected = flagged.length > 0 && selectedIds.size === flagged.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Audit Approved Lounges</CardTitle>
          <CardDescription>Scan all approved lounges for non-cigar venues using AI classification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runAudit} disabled={running}>
            {running && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {running ? "Running..." : "Run Audit"}
          </Button>
          {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
        </CardContent>
      </Card>

      {done && flagged.length === 0 && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5" />
          <span>All {totalScanned} lounges look cigar-related ✓</span>
        </div>
      )}

      {flagged.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flagged Venues ({flagged.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => {
                  setSelectedIds(checked ? new Set(flagged.map((v) => v.id)) : new Set());
                }}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {flagged.map((v) => {
                const types = (v.google_types as any)?.types?.join(", ") || "—";
                return (
                  <div key={v.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={selectedIds.has(v.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          checked ? next.add(v.id) : next.delete(v.id);
                          return next;
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      {v.address && <p className="text-xs text-muted-foreground truncate">{v.address}</p>}
                      <p className="text-xs text-muted-foreground">Types: {types}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedIds.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.size} lounges?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {selectedIds.size} lounges and add them to the blocklist so they won't be re-imported.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
