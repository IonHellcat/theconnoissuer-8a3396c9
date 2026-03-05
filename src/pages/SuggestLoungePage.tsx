import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { MapPin, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const SuggestLoungePage = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    city: "",
    country: "",
    address: "",
    website: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.country.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("lounge_suggestions").insert({
        user_id: user.id,
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast({ title: "Failed to submit suggestion", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Suggest a Lounge — The Connoisseur</title>
        <meta
          name="description"
          content="Know a great cigar lounge or shop? Suggest it and help fellow connoisseurs discover new destinations."
        />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="font-display text-3xl font-bold text-foreground">
                Suggest a Lounge
              </h1>
            </div>
            <p className="text-muted-foreground font-body mb-8">
              Know a great cigar lounge or shop we're missing? Let us know and
              we'll review it for inclusion.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl border border-border/50 p-8 text-center"
              >
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  Thank you!
                </h2>
                <p className="text-muted-foreground font-body mb-6">
                  Your suggestion has been submitted. Our team will review it
                  and add it if it meets our standards.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", city: "", country: "", address: "", website: "", notes: "" });
                    }}
                    variant="outline"
                  >
                    Suggest another
                  </Button>
                  <Button onClick={() => navigate("/explore")}>
                    Explore lounges
                  </Button>
                </div>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-card rounded-xl border border-border/50 p-6 space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-body text-sm">
                    Lounge / Shop Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Club Macanudo"
                    maxLength={150}
                    className="bg-secondary border-border/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-body text-sm">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="e.g. New York"
                      maxLength={100}
                      className="bg-secondary border-border/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="font-body text-sm">
                      Country <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      placeholder="e.g. United States"
                      maxLength={100}
                      className="bg-secondary border-border/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="font-body text-sm">
                    Address <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Street address if known"
                    maxLength={300}
                    className="bg-secondary border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="font-body text-sm">
                    Website <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://..."
                    maxLength={500}
                    className="bg-secondary border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="font-body text-sm">
                    Notes <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Why should we add this lounge? Any special details?"
                    rows={3}
                    maxLength={1000}
                    className="bg-secondary border-border/50 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Suggestion"}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SuggestLoungePage;
