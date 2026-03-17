export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cities: {
        Row: {
          country: string
          created_at: string
          id: string
          image_url: string | null
          lounge_count: number
          name: string
          slug: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          image_url?: string | null
          lounge_count?: number
          name: string
          slug: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          image_url?: string | null
          lounge_count?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      deleted_lounges: {
        Row: {
          city_name: string | null
          deleted_at: string
          google_place_id: string | null
          id: string
          name: string
        }
        Insert: {
          city_name?: string | null
          deleted_at?: string
          google_place_id?: string | null
          id?: string
          name: string
        }
        Update: {
          city_name?: string | null
          deleted_at?: string
          google_place_id?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          lounge_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lounge_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lounge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_top100"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews: {
        Row: {
          author_name: string | null
          fetched_at: string
          google_place_id: string | null
          id: string
          lounge_id: string
          rating: number | null
          relative_time: string | null
          review_text: string | null
        }
        Insert: {
          author_name?: string | null
          fetched_at?: string
          google_place_id?: string | null
          id?: string
          lounge_id: string
          rating?: number | null
          relative_time?: string | null
          review_text?: string | null
        }
        Update: {
          author_name?: string | null
          fetched_at?: string
          google_place_id?: string | null
          id?: string
          lounge_id?: string
          rating?: number | null
          relative_time?: string | null
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_reviews_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_top100"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_reviews_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          content: Json
          country: string | null
          created_at: string | null
          guide_type: string
          hero_subtitle: string | null
          id: string
          meta_description: string
          published: boolean | null
          published_at: string | null
          related_city_slugs: string[] | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          country?: string | null
          created_at?: string | null
          guide_type?: string
          hero_subtitle?: string | null
          id?: string
          meta_description: string
          published?: boolean | null
          published_at?: string | null
          related_city_slugs?: string[] | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          country?: string | null
          created_at?: string | null
          guide_type?: string
          hero_subtitle?: string | null
          id?: string
          meta_description?: string
          published?: boolean | null
          published_at?: string | null
          related_city_slugs?: string[] | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lounge_suggestions: {
        Row: {
          address: string | null
          city: string
          country: string
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          country: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      lounges: {
        Row: {
          address: string | null
          cigar_highlights: string[] | null
          city_id: string
          confidence: string | null
          connoisseur_score: number | null
          created_at: string
          description: string | null
          features: string[] | null
          gallery: string[] | null
          geog: unknown
          google_place_id: string | null
          google_types: Json | null
          hours: Json | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          pillar_scores: Json | null
          price_tier: number
          rating: number
          review_count: number
          review_data_count: number | null
          score_label: string | null
          score_source: string
          score_summary: string | null
          scored_at: string | null
          slug: string
          type: string
          updated_at: string
          visit_type: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cigar_highlights?: string[] | null
          city_id: string
          confidence?: string | null
          connoisseur_score?: number | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          gallery?: string[] | null
          geog?: unknown
          google_place_id?: string | null
          google_types?: Json | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          pillar_scores?: Json | null
          price_tier?: number
          rating?: number
          review_count?: number
          review_data_count?: number | null
          score_label?: string | null
          score_source?: string
          score_summary?: string | null
          scored_at?: string | null
          slug: string
          type?: string
          updated_at?: string
          visit_type?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cigar_highlights?: string[] | null
          city_id?: string
          confidence?: string | null
          connoisseur_score?: number | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          gallery?: string[] | null
          geog?: unknown
          google_place_id?: string | null
          google_types?: Json | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          pillar_scores?: Json | null
          price_tier?: number
          rating?: number
          review_count?: number
          review_data_count?: number | null
          score_label?: string | null
          score_source?: string
          score_summary?: string | null
          scored_at?: string | null
          slug?: string
          type?: string
          updated_at?: string
          visit_type?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lounges_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_lounges: {
        Row: {
          address: string | null
          cigar_highlights: string[] | null
          city_name: string
          country: string
          created_at: string
          description: string | null
          features: string[] | null
          gallery: string[] | null
          google_place_id: string | null
          google_types: Json | null
          hours: Json | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          price_tier: number | null
          rating: number | null
          raw_data: Json | null
          review_count: number | null
          slug: string
          source: string
          status: string
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cigar_highlights?: string[] | null
          city_name: string
          country: string
          created_at?: string
          description?: string | null
          features?: string[] | null
          gallery?: string[] | null
          google_place_id?: string | null
          google_types?: Json | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          price_tier?: number | null
          rating?: number | null
          raw_data?: Json | null
          review_count?: number | null
          slug: string
          source?: string
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cigar_highlights?: string[] | null
          city_name?: string
          country?: string
          created_at?: string
          description?: string | null
          features?: string[] | null
          gallery?: string[] | null
          google_place_id?: string | null
          google_types?: Json | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          price_tier?: number | null
          rating?: number | null
          raw_data?: Json | null
          review_count?: number | null
          slug?: string
          source?: string
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_classifications: {
        Row: {
          aspects: Json
          classified_at: string
          id: string
          lounge_id: string
          review_id: string
          venue_type: string
        }
        Insert: {
          aspects?: Json
          classified_at?: string
          id?: string
          lounge_id: string
          review_id: string
          venue_type?: string
        }
        Update: {
          aspects?: Json
          classified_at?: string
          id?: string
          lounge_id?: string
          review_id?: string
          venue_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_classifications_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_top100"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_classifications_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_classifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "google_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          cigar_smoked: string | null
          created_at: string
          drink_pairing: string | null
          id: string
          lounge_id: string
          photos: string[] | null
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cigar_smoked?: string | null
          created_at?: string
          drink_pairing?: string | null
          id?: string
          lounge_id: string
          photos?: string[] | null
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cigar_smoked?: string | null
          created_at?: string
          drink_pairing?: string | null
          id?: string
          lounge_id?: string
          photos?: string[] | null
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_top100"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          id: string
          lounge_id: string
          note: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          lounge_id: string
          note?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          lounge_id?: string
          note?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_top100"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_top100: {
        Row: {
          city_country: string | null
          city_name: string | null
          city_slug: string | null
          connoisseur_score: number | null
          id: string | null
          image_url: string | null
          name: string | null
          rating: number | null
          score_label: string | null
          score_source: string | null
          slug: string | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recommend_lounges: {
        Args: {
          radius_m?: number
          user_lat: number
          user_lng: number
          venue_filter?: string
          visit_style: string
        }
        Returns: {
          address: string
          city_id: string
          city_name: string
          city_slug: string
          connoisseur_score: number
          distance_km: number
          id: string
          image_url: string
          latitude: number
          longitude: number
          name: string
          rating: number
          recommendation_score: number
          score_label: string
          score_source: string
          score_summary: string
          slug: string
          type: string
          visit_type: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
