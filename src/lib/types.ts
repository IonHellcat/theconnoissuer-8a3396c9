import type { Tables } from "@/integrations/supabase/types";

/** City fields returned from a `cities(...)` join */
export interface JoinedCity {
  name: string;
  slug: string;
  country?: string;
}

/** A lounge row with its joined city relation */
export type LoungeWithCity = Tables<"lounges"> & {
  cities: JoinedCity;
};
