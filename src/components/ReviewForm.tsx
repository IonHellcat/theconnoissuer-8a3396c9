import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface ReviewFormProps {
  loungeId: string;
}

const ReviewForm = ({ loungeId }: ReviewFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [cigarSmoked, setCigarSmoked] = useState("");
  const [drinkPairing, setDrinkPairing] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-8 bg-card rounded-xl border border-border/50">
        <p className="text-muted-foreground font-body mb-3">Log in to leave a review</p>
        <Link to="/auth">
          <Button variant="outline" className="font-body">Log In</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("reviews").insert({
      lounge_id: loungeId,
      user_id: user.id,
      rating,
      review_text: reviewText.trim() || null,
      cigar_smoked: cigarSmoked.trim() || null,
      drink_pairing: drinkPairing.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error submitting review", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted!" });
      setRating(0);
      setReviewText("");
      setCigarSmoked("");
      setDrinkPairing("");
      queryClient.invalidateQueries({ queryKey: ["reviews", loungeId] });
      // Check achievements after review
      try {
        const { data } = await supabase.functions.invoke("check-achievements", {
          body: { user_id: user.id },
        });
        if (data?.new_achievements?.length) {
          const { data: achievements } = await supabase
            .from("achievements")
            .select("key, name")
            .in("key", data.new_achievements);
          (achievements || []).forEach((a: any) => {
            toast({ title: `🏅 Achievement unlocked: ${a.name}` });
          });
          queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
        }
      } catch (err) { console.error("check-achievements failed:", err); }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border/50 p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">Write a Review</h3>

      {/* Star Rating */}
      <div>
        <Label className="font-body text-sm">Rating</Label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-colors"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoverRating || rating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-text" className="font-body text-sm">Your Review</Label>
        <Textarea
          id="review-text"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience..."
          className="bg-secondary border-border/50 font-body"
          maxLength={1000}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cigar-smoked" className="font-body text-sm">Cigar Smoked</Label>
          <Input
            id="cigar-smoked"
            value={cigarSmoked}
            onChange={(e) => setCigarSmoked(e.target.value)}
            placeholder="e.g. Cohiba Behike"
            className="bg-secondary border-border/50 font-body"
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor="drink-pairing" className="font-body text-sm">Drink Pairing</Label>
          <Input
            id="drink-pairing"
            value={drinkPairing}
            onChange={(e) => setDrinkPairing(e.target.value)}
            placeholder="e.g. Macallan 18"
            className="bg-secondary border-border/50 font-body"
            maxLength={200}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="font-body">
        {loading ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
};

export default ReviewForm;
