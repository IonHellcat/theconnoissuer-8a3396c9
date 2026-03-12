export interface LoungeRow {
  id: string;
  name: string;
  type: string;
  rating: number;
  review_count: number;
  google_place_id: string | null;
  connoisseur_score: number | null;
  score_source: string;
  score_label: string | null;
  city: { name: string; country: string } | null;
}

export interface AnalysisResult {
  pillar_scores: Record<string, number | null>;
  connoisseur_score: number;
  score_label: string | null;
  score_summary: string;
  reviews: Array<{ author_name: string; rating: number | null; review_text: string; relative_time: string }>;
}

export type SortKey = "name" | "city" | "rating" | "status";

export const LOUNGE_PILLARS = ["cigar_selection", "ambiance", "service", "drinks", "value"];
export const SHOP_PILLARS = ["selection", "storage", "staff_knowledge", "pricing", "experience"];

export const pillarLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const statusBadge = (source: string) => {
  switch (source) {
    case "estimated":
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Estimated</span>;
    case "verified":
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Verified</span>;
    case "no_reviews":
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No Reviews</span>;
    default:
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">No Score</span>;
  }
};
