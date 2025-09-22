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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accessibility_audits: {
        Row: {
          audit_type: string
          created_at: string | null
          created_by: string | null
          id: string
          page_url: string
          score: number | null
          violations: Json | null
        }
        Insert: {
          audit_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          page_url: string
          score?: number | null
          violations?: Json | null
        }
        Update: {
          audit_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          page_url?: string
          score?: number | null
          violations?: Json | null
        }
        Relationships: []
      }
      admin_access_logs: {
        Row: {
          accessed_at: string | null
          action: string
          admin_id: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          admin_id: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          admin_id?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_actions_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      admin_warnings: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          severity: string
          title: string
          updated_at: string | null
          user_id: string
          warning_type: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          severity?: string
          title: string
          updated_at?: string | null
          user_id: string
          warning_type: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          severity?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          warning_type?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "availability_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reviews: {
        Row: {
          author_id: string
          booking_id: string
          content: string | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          rating: number
          target_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          booking_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          rating: number
          target_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          booking_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          rating?: number
          target_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_host: boolean | null
          created_at: string | null
          end_time: string | null
          id: string
          payment_required: boolean | null
          payment_session_id: string | null
          reservation_token: string | null
          slot_reserved_until: string | null
          space_id: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_date: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_host?: boolean | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          payment_required?: boolean | null
          payment_session_id?: string | null
          reservation_token?: string | null
          slot_reserved_until?: string | null
          space_id: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_date?: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_host?: boolean | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          payment_required?: boolean | null
          payment_session_id?: string | null
          reservation_token?: string | null
          slot_reserved_until?: string | null
          space_id?: string
          start_time?: string | null
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
          {
            foreignKeyName: "bookings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "checklists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_suggestions: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          score: number | null
          shared_context: Json | null
          suggested_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          score?: number | null
          shared_context?: Json | null
          suggested_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          score?: number | null
          shared_context?: Json | null
          suggested_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_suggestions_suggested_user_id_fkey"
            columns: ["suggested_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_consent_log: {
        Row: {
          analytics_consent: boolean
          consent_given_at: string
          consent_method: string
          consent_version: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          marketing_consent: boolean
          necessary_consent: boolean
          preferences_consent: boolean
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          analytics_consent?: boolean
          consent_given_at?: string
          consent_method?: string
          consent_version?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          marketing_consent?: boolean
          necessary_consent?: boolean
          preferences_consent?: boolean
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          analytics_consent?: boolean
          consent_given_at?: string
          consent_method?: string
          consent_version?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          marketing_consent?: boolean
          necessary_consent?: boolean
          preferences_consent?: boolean
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      dac7_reports: {
        Row: {
          created_at: string | null
          host_id: string
          id: string
          report_file_url: string | null
          report_generated_at: string | null
          reporting_threshold_met: boolean | null
          reporting_year: number
          total_income: number | null
          total_transactions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          host_id: string
          id?: string
          report_file_url?: string | null
          report_generated_at?: string | null
          reporting_threshold_met?: boolean | null
          reporting_year: number
          total_income?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          host_id?: string
          id?: string
          report_file_url?: string | null
          report_generated_at?: string | null
          reporting_threshold_met?: boolean | null
          reporting_year?: number
          total_income?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_access_logs: {
        Row: {
          access_type: string
          accessed_user_id: string | null
          column_names: string[] | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_user_id?: string | null
          column_names?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_user_id?: string | null
          column_names?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_breach_log: {
        Row: {
          affected_data_types: string[]
          affected_users_count: number
          authority_notification_required: boolean
          authority_notified_at: string | null
          breach_date: string
          containment_measures: string | null
          created_at: string
          detected_at: string
          id: string
          impact_assessment: string | null
          nature_of_breach: string
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          affected_data_types?: string[]
          affected_users_count?: number
          authority_notification_required?: boolean
          authority_notified_at?: string | null
          breach_date: string
          containment_measures?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          impact_assessment?: string | null
          nature_of_breach: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affected_data_types?: string[]
          affected_users_count?: number
          authority_notification_required?: boolean
          authority_notified_at?: string | null
          breach_date?: string
          containment_measures?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          impact_assessment?: string | null
          nature_of_breach?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_minimization_audit: {
        Row: {
          audit_date: string
          audit_notes: string | null
          business_justification: string | null
          column_name: string | null
          created_at: string
          created_by: string | null
          data_type: string
          id: string
          last_accessed_date: string | null
          legal_basis: string | null
          record_count: number
          retention_recommendation: string | null
          table_name: string
          usage_frequency: string | null
        }
        Insert: {
          audit_date?: string
          audit_notes?: string | null
          business_justification?: string | null
          column_name?: string | null
          created_at?: string
          created_by?: string | null
          data_type: string
          id?: string
          last_accessed_date?: string | null
          legal_basis?: string | null
          record_count?: number
          retention_recommendation?: string | null
          table_name: string
          usage_frequency?: string | null
        }
        Update: {
          audit_date?: string
          audit_notes?: string | null
          business_justification?: string | null
          column_name?: string | null
          created_at?: string
          created_by?: string | null
          data_type?: string
          id?: string
          last_accessed_date?: string | null
          legal_basis?: string | null
          record_count?: number
          retention_recommendation?: string | null
          table_name?: string
          usage_frequency?: string | null
        }
        Relationships: []
      }
      data_retention_log: {
        Row: {
          action_type: string
          criteria_used: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          record_count: number | null
          table_name: string
        }
        Insert: {
          action_type: string
          criteria_used?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          record_count?: number | null
          table_name: string
        }
        Update: {
          action_type?: string
          criteria_used?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          record_count?: number | null
          table_name?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "fk_event_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          author_id: string
          content: string | null
          created_at: string | null
          event_id: string
          id: string
          is_visible: boolean | null
          rating: number
          target_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_visible?: boolean | null
          rating: number
          target_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_visible?: boolean | null
          rating?: number
          target_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
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
          city?: string | null
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
          city?: string | null
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
          {
            foreignKeyName: "events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "favorites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          download_token: string | null
          expires_at: string | null
          export_file_url: string | null
          file_size: number | null
          id: string
          notes: string | null
          processed_by: string | null
          processing_status: string | null
          request_type: string
          requested_at: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          download_token?: string | null
          expires_at?: string | null
          export_file_url?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          processing_status?: string | null
          request_type: string
          requested_at?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          download_token?: string | null
          expires_at?: string | null
          export_file_url?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          processing_status?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      global_tags: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          name: string
          usage_count: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          name: string
          usage_count?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          name?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      host_report_subscriptions: {
        Row: {
          created_at: string
          day_of_month: number
          enabled: boolean
          frequency: string
          host_id: string
          id: string
          last_sent_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          frequency?: string
          host_id: string
          id?: string
          last_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          frequency?: string
          host_id?: string
          id?: string
          last_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_report_subscriptions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_processing_jobs: {
        Row: {
          completed_at: string | null
          compression_ratio: number | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          optimized_path: string | null
          optimized_size: number | null
          original_path: string
          original_size: number | null
          space_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          compression_ratio?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          optimized_path?: string | null
          optimized_size?: number | null
          original_path: string
          original_size?: number | null
          space_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          compression_ratio?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          optimized_path?: string | null
          optimized_size?: number | null
          original_path?: string
          original_size?: number | null
          space_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_processing_jobs_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_processing_jobs_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          host_id: string
          id: string
          is_active: boolean
          is_favorite: boolean
          name: string
          type: Database["public"]["Enums"]["message_template_type"]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          host_id: string
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          name: string
          type?: Database["public"]["Enums"]["message_template_type"]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          host_id?: string
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          name?: string
          type?: Database["public"]["Enums"]["message_template_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "fk_messages_booking_id"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_messages_sender_id"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          host_amount: number | null
          id: string
          method: string | null
          payment_status: string
          platform_fee: number | null
          receipt_url: string | null
          stripe_session_id: string | null
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          currency?: string
          host_amount?: number | null
          id?: string
          method?: string | null
          payment_status?: string
          platform_fee?: number | null
          receipt_url?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          currency?: string
          host_amount?: number | null
          id?: string
          method?: string | null
          payment_status?: string
          platform_fee?: number | null
          receipt_url?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
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
      private_chats: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chats_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_chats_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_messages: {
        Row: {
          attachments: Json | null
          chat_id: string
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "private_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          age_confirmed: boolean | null
          bio: string | null
          city: string | null
          collaboration_availability: string | null
          collaboration_description: string | null
          collaboration_types: string[] | null
          competencies: string[] | null
          created_at: string
          data_retention_exempt: boolean | null
          facebook_url: string | null
          first_name: string
          github_url: string | null
          id: string
          industries: string[] | null
          instagram_url: string | null
          interests: string | null
          is_suspended: boolean | null
          job_title: string | null
          job_type: string | null
          last_login_at: string | null
          last_name: string
          linkedin_url: string | null
          location: string | null
          networking_enabled: boolean | null
          nickname: string | null
          onboarding_completed: boolean | null
          phone: string | null
          preferred_work_mode: string | null
          profession: string | null
          profile_photo_url: string | null
          restriction_reason: string | null
          return_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          skills: string | null
          space_creation_restricted: boolean | null
          stripe_account_id: string | null
          stripe_connected: boolean | null
          stripe_onboarding_status:
            | Database["public"]["Enums"]["stripe_onboarding_state"]
            | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tax_country: string | null
          tax_id: string | null
          twitter_url: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
          work_style: string | null
          youtube_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          age_confirmed?: boolean | null
          bio?: string | null
          city?: string | null
          collaboration_availability?: string | null
          collaboration_description?: string | null
          collaboration_types?: string[] | null
          competencies?: string[] | null
          created_at?: string
          data_retention_exempt?: boolean | null
          facebook_url?: string | null
          first_name: string
          github_url?: string | null
          id: string
          industries?: string[] | null
          instagram_url?: string | null
          interests?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          job_type?: string | null
          last_login_at?: string | null
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          restriction_reason?: string | null
          return_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          skills?: string | null
          space_creation_restricted?: boolean | null
          stripe_account_id?: string | null
          stripe_connected?: boolean | null
          stripe_onboarding_status?:
            | Database["public"]["Enums"]["stripe_onboarding_state"]
            | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tax_country?: string | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
          work_style?: string | null
          youtube_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          age_confirmed?: boolean | null
          bio?: string | null
          city?: string | null
          collaboration_availability?: string | null
          collaboration_description?: string | null
          collaboration_types?: string[] | null
          competencies?: string[] | null
          created_at?: string
          data_retention_exempt?: boolean | null
          facebook_url?: string | null
          first_name?: string
          github_url?: string | null
          id?: string
          industries?: string[] | null
          instagram_url?: string | null
          interests?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          job_type?: string | null
          last_login_at?: string | null
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          restriction_reason?: string | null
          return_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string | null
          space_creation_restricted?: boolean | null
          stripe_account_id?: string | null
          stripe_connected?: boolean | null
          stripe_onboarding_status?:
            | Database["public"]["Enums"]["stripe_onboarding_state"]
            | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tax_country?: string | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
          work_style?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          action: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          action?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string
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
          {
            foreignKeyName: "space_tags_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          address: string
          amenities: string[]
          approved_at: string | null
          approved_by: string | null
          availability: Json | null
          capacity: number | null
          category: Database["public"]["Enums"]["space_category"]
          confirmation_type: Database["public"]["Enums"]["confirmation_type"]
          created_at: string
          deleted_at: string | null
          description: string
          event_friendly_tags: string[] | null
          host_id: string
          id: string
          ideal_guest_tags: string[] | null
          is_suspended: boolean | null
          latitude: number | null
          longitude: number | null
          max_capacity: number
          pending_approval: boolean | null
          photos: string[]
          price_per_day: number
          price_per_hour: number
          published: boolean
          rejection_reason: string | null
          revision_notes: string | null
          revision_requested: boolean | null
          rules: string | null
          seating_types: string[]
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          title: string
          updated_at: string
          work_environment: Database["public"]["Enums"]["work_environment"]
          workspace_features: string[]
        }
        Insert: {
          address: string
          amenities?: string[]
          approved_at?: string | null
          approved_by?: string | null
          availability?: Json | null
          capacity?: number | null
          category: Database["public"]["Enums"]["space_category"]
          confirmation_type?: Database["public"]["Enums"]["confirmation_type"]
          created_at?: string
          deleted_at?: string | null
          description: string
          event_friendly_tags?: string[] | null
          host_id: string
          id?: string
          ideal_guest_tags?: string[] | null
          is_suspended?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_capacity: number
          pending_approval?: boolean | null
          photos?: string[]
          price_per_day: number
          price_per_hour: number
          published?: boolean
          rejection_reason?: string | null
          revision_notes?: string | null
          revision_requested?: boolean | null
          rules?: string | null
          seating_types?: string[]
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string
          work_environment: Database["public"]["Enums"]["work_environment"]
          workspace_features?: string[]
        }
        Update: {
          address?: string
          amenities?: string[]
          approved_at?: string | null
          approved_by?: string | null
          availability?: Json | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["space_category"]
          confirmation_type?: Database["public"]["Enums"]["confirmation_type"]
          created_at?: string
          deleted_at?: string | null
          description?: string
          event_friendly_tags?: string[] | null
          host_id?: string
          id?: string
          ideal_guest_tags?: string[] | null
          is_suspended?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number
          pending_approval?: boolean | null
          photos?: string[]
          price_per_day?: number
          price_per_hour?: number
          published?: boolean
          rejection_reason?: string | null
          revision_notes?: string | null
          revision_requested?: boolean | null
          rules?: string | null
          seating_types?: string[]
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
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
      static_content: {
        Row: {
          content: string
          content_type: string
          created_at: string | null
          id: string
          is_published: boolean | null
          last_updated_by: string
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          last_updated_by: string
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          last_updated_by?: string
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
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
      user_notifications: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "fk_waitlists_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "waitlists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
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
          {
            foreignKeyName: "workspace_features_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      spaces_public_view: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["space_category"] | null
          confirmation_type:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at: string | null
          host_stripe_account_id: string | null
          id: string | null
          max_capacity: number | null
          name: string | null
          price_per_day: number | null
          price_per_hour: number | null
          work_environment:
            | Database["public"]["Enums"]["work_environment"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_tag: {
        Args: { approver_id: string; tag_id: string }
        Returns: Json
      }
      calculate_cancellation_fee: {
        Args: { booking_date_param: string; price_per_day_param: number }
        Returns: number
      }
      calculate_dac7_thresholds: {
        Args: { host_id_param: string; year_param: number }
        Returns: Json
      }
      calculate_weighted_space_rating: {
        Args: { space_id_param: string }
        Returns: number
      }
      cancel_booking: {
        Args: {
          booking_id: string
          cancelled_by_host?: boolean
          reason?: string
        }
        Returns: Json
      }
      check_profile_access: {
        Args: { profile_id: string; viewer_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_action: string; p_identifier: string }
        Returns: Json
      }
      cleanup_expired_gdpr_exports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_slots: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_inactive_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_image_processing_job: {
        Args: {
          original_path_param: string
          original_size_param?: number
          space_id_param: string
        }
        Returns: string
      }
      detect_data_breach: {
        Args: {
          affected_count?: number
          affected_data_types?: string[]
          breach_nature: string
          breach_severity?: string
          manual_report?: boolean
        }
        Returns: Json
      }
      expire_pending_connections: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      export_user_data: {
        Args: { target_user_id: string }
        Returns: Json
      }
      generate_connection_suggestions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_alternative_time_slots: {
        Args: {
          date_param: string
          duration_hours_param: number
          space_id_param: string
        }
        Returns: string[]
      }
      get_host_metrics: {
        Args: { host_id_param: string }
        Returns: Json
      }
      get_public_profile: {
        Args: { profile_id_param: string }
        Returns: {
          bio: string
          city: string
          collaboration_availability: string
          collaboration_description: string
          created_at: string
          first_name: string
          id: string
          interests: string
          job_title: string
          last_name: string
          networking_enabled: boolean
          nickname: string
          profession: string
          profile_photo_url: string
          skills: string
        }[]
      }
      get_public_profile_safe: {
        Args: { profile_id_param: string }
        Returns: Json
      }
      get_public_spaces: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          amenities: string[]
          category: string
          confirmation_type: string
          created_at: string
          description: string
          host_first_name: string
          host_last_name: string
          host_profile_photo: string
          id: string
          ideal_guest: string
          latitude: number
          longitude: number
          max_capacity: number
          photos: string[]
          price_per_day: number
          published: boolean
          seating_type: string
          subcategory: string
          title: string
          work_environment: string
          workspace_features: string[]
        }[]
      }
      get_public_spaces_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string | null
          category: Database["public"]["Enums"]["space_category"] | null
          confirmation_type:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at: string | null
          host_stripe_account_id: string | null
          id: string | null
          max_capacity: number | null
          name: string | null
          price_per_day: number | null
          price_per_hour: number | null
          work_environment:
            | Database["public"]["Enums"]["work_environment"]
            | null
        }[]
      }
      get_safe_public_profile: {
        Args: { profile_id_param: string }
        Returns: Json
      }
      get_single_space_metrics: {
        Args: { space_id_param: string }
        Returns: Json
      }
      get_space_availability_optimized: {
        Args: {
          end_date_param: string
          space_id_param: string
          start_date_param: string
        }
        Returns: {
          booking_date: string
          end_time: string
          start_time: string
          status: string
          user_id: string
        }[]
      }
      get_space_reviews_with_details: {
        Args: { space_id_param: string }
        Returns: {
          author_first_name: string
          author_last_name: string
          author_profile_photo_url: string
          booking_date: string
          content: string
          created_at: string
          id: string
          is_visible: boolean
          rating: number
        }[]
      }
      get_space_with_host_info: {
        Args: { space_id_param: string }
        Returns: {
          address: string
          amenities: string[]
          category: string
          confirmation_type: string
          created_at: string
          description: string
          host_stripe_account_id: string
          id: string
          latitude: number
          longitude: number
          max_capacity: number
          name: string
          photos: string[]
          price_per_day: number
          price_per_hour: number
          subcategory: string
          work_environment: string
          workspace_features: string[]
        }[]
      }
      get_user_public_reviews: {
        Args: { target_id_param: string }
        Returns: {
          author_first_name: string
          author_last_name: string
          author_profile_photo_url: string
          booking_date: string
          content: string
          created_at: string
          id: string
          is_visible: boolean
          rating: number
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      log_admin_access: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_record_id: string
          p_table_name: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_sensitive_data_access: {
        Args: {
          p_access_type: string
          p_accessed_user_id: string
          p_column_names: string[]
          p_table_name: string
        }
        Returns: Json
      }
      mark_all_notifications_as_read: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: boolean
      }
      moderate_space: {
        Args: {
          approve: boolean
          moderator_id: string
          rejection_reason?: string
          space_id: string
        }
        Returns: Json
      }
      process_data_rectification: {
        Args: {
          admin_notes?: string
          approved: boolean
          corrections_applied?: Json
          request_id: string
        }
        Returns: Json
      }
      reactivate_user: {
        Args: { reactivated_by_admin: string; target_user_id: string }
        Returns: Json
      }
      request_data_deletion: {
        Args: { deletion_reason?: string; target_user_id: string }
        Returns: Json
      }
      request_space_revision: {
        Args: { host_id: string; revision_notes: string; space_id: string }
        Returns: Json
      }
      review_report: {
        Args: { admin_notes?: string; new_status: string; report_id: string }
        Returns: Json
      }
      review_space_revision: {
        Args: {
          admin_id: string
          admin_notes?: string
          approved: boolean
          space_id: string
        }
        Returns: Json
      }
      run_data_minimization_audit: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      suspend_space_with_bookings: {
        Args: { admin_id: string; space_id: string; suspension_reason: string }
        Returns: Json
      }
      suspend_user: {
        Args: {
          reason: string
          suspended_by_admin: string
          target_user_id: string
        }
        Returns: Json
      }
      update_image_processing_job: {
        Args: {
          compression_ratio_param?: number
          error_message_param?: string
          job_id_param: string
          optimized_path_param?: string
          optimized_size_param?: number
          status_param: string
        }
        Returns: boolean
      }
      validate_and_reserve_slot: {
        Args: {
          confirmation_type_param: string
          date_param: string
          end_time_param: string
          space_id_param: string
          start_time_param: string
          user_id_param: string
        }
        Returns: Json
      }
      validate_booking_slot_with_lock: {
        Args: {
          date_param: string
          end_time_param: string
          space_id_param: string
          start_time_param: string
          user_id_param: string
        }
        Returns: Json
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled"
      confirmation_type: "instant" | "host_approval"
      message_template_type: "confirmation" | "reminder" | "cancellation_notice"
      space_category: "home" | "outdoor" | "professional"
      stripe_onboarding_state: "none" | "pending" | "completed" | "restricted"
      user_role: "host" | "coworker" | "admin"
      work_environment: "silent" | "controlled" | "dynamic"
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
      booking_status: ["pending", "confirmed", "cancelled"],
      confirmation_type: ["instant", "host_approval"],
      message_template_type: [
        "confirmation",
        "reminder",
        "cancellation_notice",
      ],
      space_category: ["home", "outdoor", "professional"],
      stripe_onboarding_state: ["none", "pending", "completed", "restricted"],
      user_role: ["host", "coworker", "admin"],
      work_environment: ["silent", "controlled", "dynamic"],
    },
  },
} as const
