export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string | null
          day_of_week: string
          end_time: string
          id: string
          space_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          end_time: string
          id?: string
          space_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          end_time?: string
          id?: string
          space_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          created_at: string | null
          id: string
          space_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string | null
          id?: string
          space_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string | null
          id?: string
          space_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          completed: boolean | null
          id: string
          section: string
          space_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          section: string
          space_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          section?: string
          space_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_participants: number | null
          date: string
          description: string | null
          id: string
          image_url: string | null
          max_participants: number | null
          space_id: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_participants?: number | null
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          space_id: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_participants?: number | null
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          space_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          booking_id: string
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          booking_id: string
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          booking_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          currency: string
          id: string
          method: string | null
          payment_status: string
          receipt_url: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          currency?: string
          id?: string
          method?: string | null
          payment_status?: string
          receipt_url?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          currency?: string
          id?: string
          method?: string | null
          payment_status?: string
          receipt_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          linkedin_url: string | null
          networking_enabled: boolean | null
          nickname: string | null
          onboarding_completed: boolean | null
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          first_name: string
          id: string
          last_name: string
          linkedin_url?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          profile_photo_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          linkedin_url?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          reporter_id: string
          status: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_profiles_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_tags: {
        Row: {
          created_at: string | null
          id: string
          space_id: string | null
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          space_id?: string | null
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          space_id?: string | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_tags_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          address: string
          amenities: string[]
          availability: Json | null
          category: Database["public"]["Enums"]["space_category"]
          confirmation_type: Database["public"]["Enums"]["confirmation_type"]
          created_at: string
          description: string
          event_friendly_tags: string[] | null
          host_id: string
          id: string
          ideal_guest_tags: string[] | null
          latitude: number | null
          longitude: number | null
          max_capacity: number
          photos: string[]
          price_per_day: number
          price_per_hour: number
          published: boolean
          rules: string | null
          seating_types: string[]
          title: string
          updated_at: string
          work_environment: Database["public"]["Enums"]["work_environment"]
          workspace_features: string[]
        }
        Insert: {
          address: string
          amenities?: string[]
          availability?: Json | null
          category: Database["public"]["Enums"]["space_category"]
          confirmation_type?: Database["public"]["Enums"]["confirmation_type"]
          created_at?: string
          description: string
          event_friendly_tags?: string[] | null
          host_id: string
          id?: string
          ideal_guest_tags?: string[] | null
          latitude?: number | null
          longitude?: number | null
          max_capacity: number
          photos?: string[]
          price_per_day: number
          price_per_hour: number
          published?: boolean
          rules?: string | null
          seating_types?: string[]
          title: string
          updated_at?: string
          work_environment: Database["public"]["Enums"]["work_environment"]
          workspace_features?: string[]
        }
        Update: {
          address?: string
          amenities?: string[]
          availability?: Json | null
          category?: Database["public"]["Enums"]["space_category"]
          confirmation_type?: Database["public"]["Enums"]["confirmation_type"]
          created_at?: string
          description?: string
          event_friendly_tags?: string[] | null
          host_id?: string
          id?: string
          ideal_guest_tags?: string[] | null
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number
          photos?: string[]
          price_per_day?: number
          price_per_hour?: number
          published?: boolean
          rules?: string | null
          seating_types?: string[]
          title?: string
          updated_at?: string
          work_environment?: Database["public"]["Enums"]["work_environment"]
          workspace_features?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "spaces_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          response: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          response?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          response?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlists: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          space_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          space_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          space_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_features: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          label: string
          space_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          label: string
          space_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          label?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_features_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled"
      confirmation_type: "instant" | "host_approval"
      space_category: "home" | "outdoor" | "professional"
      user_role: "host" | "coworker"
      work_environment: "silent" | "controlled" | "dynamic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending", "confirmed", "cancelled"],
      confirmation_type: ["instant", "host_approval"],
      space_category: ["home", "outdoor", "professional"],
      user_role: ["host", "coworker"],
      work_environment: ["silent", "controlled", "dynamic"],
    },
  },
} as const
