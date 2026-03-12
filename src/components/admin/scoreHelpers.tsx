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
  confidence: string | null;
  review_data_count: number;
  city: { name: string; country: string } | null;
}

export interface AspectData {
  sentiment: string;
  positive: number;
  negative: number;
  total: number;
}

export interface PipelineResult {
  connoisseur_score: number;
  score_label: string | null;
  pillar_scores: Record<string, AspectData>;
  confidence: string;
  components: { quality: number; sentiment: number; volume: number; consistency: number; prestige: number };
  score_summary?: string;
  reviews: Array<{ author_name: string; rating: number | null; review_text: string; relative_time: string }>;
}

export type SortKey = "name" | "city" | "rating" | "status";

export const LOUNGE_ASPECTS = ["atmosphere", "service", "cigar_selection", "drinks"];
export const SHOP_ASPECTS = ["selection", "staff", "pricing"];

export const aspectLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const sentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case "strength": return "text-green-400";
    case "positive": return "text-emerald-400";
    case "mixed": return "text-yellow-400";
    case "weakness": return "text-red-400";
    default: return "text-muted-foreground";
  }
};

export const sentimentLabel = (sentiment: string) => {
  switch (sentiment) {
    case "strength": return "Strength";
    case "positive": return "Positive";
    case "mixed": return "Mixed";
    case "weakness": return "Weakness";
    case "not_mentioned": return "No Data";
    default: return "—";
  }
};

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

export const confidenceBadge = (confidence: string | null) => {
  switch (confidence) {
    case "high":
      return <span className="text-[9px] font-medium font-body px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">High</span>;
    case "medium":
      return <span className="text-[9px] font-medium font-body px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Med</span>;
    case "low":
      return <span className="text-[9px] font-medium font-body px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">Low</span>;
    default:
      return null;
  }
};
