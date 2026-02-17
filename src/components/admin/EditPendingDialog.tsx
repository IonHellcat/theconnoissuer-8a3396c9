import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type PendingLounge = Tables<"pending_lounges">;

interface Props {
  lounge: PendingLounge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lounge: PendingLounge, updates: Partial<PendingLounge>) => void;
}

export const EditPendingDialog = ({ lounge, open, onOpenChange, onSave }: Props) => {
  const [form, setForm] = useState({
    name: "",
    address: "",
    description: "",
    phone: "",
    website: "",
    type: "lounge",
    city_name: "",
    country: "",
  });

  useEffect(() => {
    if (lounge) {
      setForm({
        name: lounge.name || "",
        address: lounge.address || "",
        description: lounge.description || "",
        phone: lounge.phone || "",
        website: lounge.website || "",
        type: lounge.type || "lounge",
        city_name: lounge.city_name || "",
        country: lounge.country || "",
      });
    }
  }, [lounge]);

  const handleSave = () => {
    if (!lounge) return;
    onSave(lounge, {
      name: form.name,
      address: form.address || null,
      description: form.description || null,
      phone: form.phone || null,
      website: form.website || null,
      type: form.type,
      city_name: form.city_name,
      country: form.country,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Pending Lounge</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lounge">Lounge</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="club">Club</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>Save & Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
