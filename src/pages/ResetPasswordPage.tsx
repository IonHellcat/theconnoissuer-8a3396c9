import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "You can now log in with your new password." });
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-sm mx-auto px-4">
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">Set New Password</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="font-body text-sm">New Password</Label>
              <Input id="new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border/50" />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="font-body text-sm">Confirm Password</Label>
              <Input id="confirm-password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-secondary border-border/50" />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-body">{loading ? "Updating..." : "Update Password"}</Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPasswordPage;
