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
    PostgrestVersion: "13.0.5"
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
      active_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
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
          geo_location: Json | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          session_id: string | null
          target_id: string
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          description: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          target_id: string
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          description?: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          target_id?: string
          target_type?: string
          user_agent?: string | null
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
            referencedRelation: "spaces_public_safe"
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
      availability_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
          id: string
          space_id: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
          id?: string
          space_id?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
          id?: string
          space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_cache_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_cache_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_cache_space_id_fkey"
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
            foreignKeyName: "booking_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
          {
            foreignKeyName: "booking_reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          approval_deadline: string | null
          approval_reminder_sent: boolean | null
          auto_cancel_scheduled_at: string | null
          booking_date: string
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_host: boolean | null
          created_at: string | null
          end_time: string | null
          frozen_at: string | null
          frozen_reason: string | null
          guests_count: number
          host_issue_reported: boolean | null
          id: string
          is_urgent: boolean | null
          issue_report_reason: string | null
          payment_deadline: string | null
          payment_reminder_sent: boolean | null
          payment_required: boolean | null
          payment_session_id: string | null
          payout_completed_at: string | null
          payout_scheduled_at: string | null
          payout_stripe_transfer_id: string | null
          processing_lock: string | null
          reservation_token: string | null
          service_completed_at: string | null
          service_completed_by: string | null
          slot_reserved_until: string | null
          space_id: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_deadline?: string | null
          approval_reminder_sent?: boolean | null
          auto_cancel_scheduled_at?: string | null
          booking_date: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_host?: boolean | null
          created_at?: string | null
          end_time?: string | null
          frozen_at?: string | null
          frozen_reason?: string | null
          guests_count?: number
          host_issue_reported?: boolean | null
          id?: string
          is_urgent?: boolean | null
          issue_report_reason?: string | null
          payment_deadline?: string | null
          payment_reminder_sent?: boolean | null
          payment_required?: boolean | null
          payment_session_id?: string | null
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          payout_stripe_transfer_id?: string | null
          processing_lock?: string | null
          reservation_token?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          slot_reserved_until?: string | null
          space_id: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_deadline?: string | null
          approval_reminder_sent?: boolean | null
          auto_cancel_scheduled_at?: string | null
          booking_date?: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_host?: boolean | null
          created_at?: string | null
          end_time?: string | null
          frozen_at?: string | null
          frozen_reason?: string | null
          guests_count?: number
          host_issue_reported?: boolean | null
          id?: string
          is_urgent?: boolean | null
          issue_report_reason?: string | null
          payment_deadline?: string | null
          payment_reminder_sent?: boolean | null
          payment_required?: boolean | null
          payment_session_id?: string | null
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          payout_stripe_transfer_id?: string | null
          processing_lock?: string | null
          reservation_token?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
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
            referencedRelation: "spaces_public_safe"
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
          {
            foreignKeyName: "fk_bookings_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_backup_20250115: {
        Row: {
          approval_deadline: string | null
          approval_reminder_sent: boolean | null
          auto_cancel_scheduled_at: string | null
          booking_date: string | null
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_host: boolean | null
          created_at: string | null
          end_time: string | null
          frozen_at: string | null
          frozen_reason: string | null
          guests_count: number | null
          host_issue_reported: boolean | null
          id: string | null
          is_urgent: boolean | null
          issue_report_reason: string | null
          payment_deadline: string | null
          payment_reminder_sent: boolean | null
          payment_required: boolean | null
          payment_session_id: string | null
          payout_completed_at: string | null
          payout_scheduled_at: string | null
          payout_stripe_transfer_id: string | null
          reservation_token: string | null
          service_completed_at: string | null
          service_completed_by: string | null
          slot_reserved_until: string | null
          space_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approval_deadline?: string | null
          approval_reminder_sent?: boolean | null
          auto_cancel_scheduled_at?: string | null
          booking_date?: string | null
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_host?: boolean | null
          created_at?: string | null
          end_time?: string | null
          frozen_at?: string | null
          frozen_reason?: string | null
          guests_count?: number | null
          host_issue_reported?: boolean | null
          id?: string | null
          is_urgent?: boolean | null
          issue_report_reason?: string | null
          payment_deadline?: string | null
          payment_reminder_sent?: boolean | null
          payment_required?: boolean | null
          payment_session_id?: string | null
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          payout_stripe_transfer_id?: string | null
          reservation_token?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          slot_reserved_until?: string | null
          space_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approval_deadline?: string | null
          approval_reminder_sent?: boolean | null
          auto_cancel_scheduled_at?: string | null
          booking_date?: string | null
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_host?: boolean | null
          created_at?: string | null
          end_time?: string | null
          frozen_at?: string | null
          frozen_reason?: string | null
          guests_count?: number | null
          host_issue_reported?: boolean | null
          id?: string | null
          is_urgent?: boolean | null
          issue_report_reason?: string | null
          payment_deadline?: string | null
          payment_reminder_sent?: boolean | null
          payment_required?: boolean | null
          payment_session_id?: string | null
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          payout_stripe_transfer_id?: string | null
          reservation_token?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          slot_reserved_until?: string | null
          space_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
            referencedRelation: "spaces_public_safe"
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
            foreignKeyName: "connection_suggestions_suggested_user_id_fkey"
            columns: ["suggested_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
            foreignKeyName: "connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          coworker_id: string
          created_at: string
          host_id: string
          id: string
          last_message: string | null
          last_message_at: string | null
          space_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          coworker_id: string
          created_at?: string
          host_id: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          space_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          coworker_id?: string
          created_at?: string
          host_id?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          space_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_coworker_id_fkey"
            columns: ["coworker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_coworker_id_fkey"
            columns: ["coworker_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
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
          error_details: Json | null
          generated_by: string | null
          host_acknowledged_at: string | null
          host_id: string
          id: string
          notification_sent_at: string | null
          report_file_url: string | null
          report_generated_at: string | null
          report_json_data: Json | null
          report_status: string | null
          reporting_threshold_met: boolean | null
          reporting_year: number
          submission_reference: string | null
          total_income: number | null
          total_transactions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          generated_by?: string | null
          host_acknowledged_at?: string | null
          host_id: string
          id?: string
          notification_sent_at?: string | null
          report_file_url?: string | null
          report_generated_at?: string | null
          report_json_data?: Json | null
          report_status?: string | null
          reporting_threshold_met?: boolean | null
          reporting_year: number
          submission_reference?: string | null
          total_income?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          generated_by?: string | null
          host_acknowledged_at?: string | null
          host_id?: string
          id?: string
          notification_sent_at?: string | null
          report_file_url?: string | null
          report_generated_at?: string | null
          report_json_data?: Json | null
          report_status?: string | null
          reporting_threshold_met?: boolean | null
          reporting_year?: number
          submission_reference?: string | null
          total_income?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dac7_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dac7_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
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
      db_connection_stats: {
        Row: {
          active_connections: number
          created_at: string
          id: string
          idle_connections: number
          max_connections: number
          sampled_at: string
          total_connections: number
          usage_percentage: number | null
          waiting_connections: number
        }
        Insert: {
          active_connections: number
          created_at?: string
          id?: string
          idle_connections: number
          max_connections: number
          sampled_at?: string
          total_connections: number
          usage_percentage?: number | null
          waiting_connections: number
        }
        Update: {
          active_connections?: number
          created_at?: string
          id?: string
          idle_connections?: number
          max_connections?: number
          sampled_at?: string
          total_connections?: number
          usage_percentage?: number | null
          waiting_connections?: number
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          subject: string
          template_key: string
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject: string
          template_key: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject?: string
          template_key?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
          {
            foreignKeyName: "fk_event_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
            foreignKeyName: "event_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
          {
            foreignKeyName: "event_reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
            referencedRelation: "spaces_public_safe"
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
          {
            foreignKeyName: "fk_events_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          id: string
          ip_address: unknown | null
          reason: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
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
            referencedRelation: "spaces_public_safe"
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
          {
            foreignKeyName: "host_report_subscriptions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: true
            referencedRelation: "profiles_public_safe"
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
            referencedRelation: "spaces_public_safe"
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
      invoices: {
        Row: {
          base_amount: number
          booking_id: string
          conservazione_completed_at: string | null
          conservazione_sostitutiva_url: string | null
          created_at: string | null
          discount_amount: number | null
          discount_reason: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          issuer: string | null
          payment_id: string
          pdf_file_url: string | null
          recipient_id: string
          recipient_type: string
          total_amount: number
          updated_at: string | null
          vat_amount: number
          vat_rate: number | null
          xml_delivery_status: string | null
          xml_file_url: string | null
          xml_rejection_reason: string | null
          xml_sdi_id: string | null
          xml_sent_at: string | null
        }
        Insert: {
          base_amount: number
          booking_id: string
          conservazione_completed_at?: string | null
          conservazione_sostitutiva_url?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          issuer?: string | null
          payment_id: string
          pdf_file_url?: string | null
          recipient_id: string
          recipient_type: string
          total_amount: number
          updated_at?: string | null
          vat_amount: number
          vat_rate?: number | null
          xml_delivery_status?: string | null
          xml_file_url?: string | null
          xml_rejection_reason?: string | null
          xml_sdi_id?: string | null
          xml_sent_at?: string | null
        }
        Update: {
          base_amount?: number
          booking_id?: string
          conservazione_completed_at?: string | null
          conservazione_sostitutiva_url?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          issuer?: string | null
          payment_id?: string
          pdf_file_url?: string | null
          recipient_id?: string
          recipient_type?: string
          total_amount?: number
          updated_at?: string | null
          vat_amount?: number
          vat_rate?: number | null
          xml_delivery_status?: string | null
          xml_file_url?: string | null
          xml_rejection_reason?: string | null
          xml_sdi_id?: string | null
          xml_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_payment_id"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "message_templates_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          booking_id: string
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          booking_id: string
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          booking_id?: string
          content?: string
          conversation_id?: string | null
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
            foreignKeyName: "fk_messages_sender_id"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["conversation_id"]
          },
        ]
      }
      non_fiscal_receipts: {
        Row: {
          booking_id: string
          canone_amount: number
          coworker_id: string
          created_at: string | null
          disclaimer: string | null
          discount_amount: number | null
          host_id: string
          id: string
          includes_coworker_cf: boolean | null
          payment_id: string
          pdf_url: string
          receipt_date: string
          receipt_number: string
          total_amount: number
        }
        Insert: {
          booking_id: string
          canone_amount: number
          coworker_id: string
          created_at?: string | null
          disclaimer?: string | null
          discount_amount?: number | null
          host_id: string
          id?: string
          includes_coworker_cf?: boolean | null
          payment_id: string
          pdf_url: string
          receipt_date: string
          receipt_number: string
          total_amount: number
        }
        Update: {
          booking_id?: string
          canone_amount?: number
          coworker_id?: string
          created_at?: string | null
          disclaimer?: string | null
          discount_amount?: number | null
          host_id?: string
          id?: string
          includes_coworker_cf?: boolean | null
          payment_id?: string
          pdf_url?: string
          receipt_date?: string
          receipt_number?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "non_fiscal_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_fiscal_receipts_coworker_id_fkey"
            columns: ["coworker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_fiscal_receipts_coworker_id_fkey"
            columns: ["coworker_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_fiscal_receipts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_fiscal_receipts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_fiscal_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
          credit_note_deadline: string | null
          credit_note_issued_by_host: boolean | null
          credit_note_required: boolean | null
          credit_note_xml_url: string | null
          currency: string
          host_amount: number | null
          host_invoice_deadline: string | null
          host_invoice_reminder_sent: boolean | null
          host_invoice_required: boolean | null
          id: string
          method: string | null
          payment_status: string
          platform_fee: number | null
          receipt_url: string | null
          stripe_event_id: string | null
          stripe_idempotency_key: string | null
          stripe_session_id: string | null
          stripe_transfer_id: string | null
          user_id: string
          workover_invoice_id: string | null
          workover_invoice_pdf_url: string | null
          workover_invoice_xml_url: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          credit_note_deadline?: string | null
          credit_note_issued_by_host?: boolean | null
          credit_note_required?: boolean | null
          credit_note_xml_url?: string | null
          currency?: string
          host_amount?: number | null
          host_invoice_deadline?: string | null
          host_invoice_reminder_sent?: boolean | null
          host_invoice_required?: boolean | null
          id?: string
          method?: string | null
          payment_status?: string
          platform_fee?: number | null
          receipt_url?: string | null
          stripe_event_id?: string | null
          stripe_idempotency_key?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          user_id: string
          workover_invoice_id?: string | null
          workover_invoice_pdf_url?: string | null
          workover_invoice_xml_url?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          credit_note_deadline?: string | null
          credit_note_issued_by_host?: boolean | null
          credit_note_required?: boolean | null
          credit_note_xml_url?: string | null
          currency?: string
          host_amount?: number | null
          host_invoice_deadline?: string | null
          host_invoice_reminder_sent?: boolean | null
          host_invoice_required?: boolean | null
          id?: string
          method?: string | null
          payment_status?: string
          platform_fee?: number | null
          receipt_url?: string | null
          stripe_event_id?: string | null
          stripe_idempotency_key?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          user_id?: string
          workover_invoice_id?: string | null
          workover_invoice_pdf_url?: string | null
          workover_invoice_xml_url?: string | null
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
      performance_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
            foreignKeyName: "private_chats_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_chats_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_chats_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
          {
            foreignKeyName: "private_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
          dac7_data_collected: boolean | null
          dac7_threshold_notified: boolean | null
          data_retention_exempt: boolean | null
          email_verification_blocked_actions: string[] | null
          facebook_url: string | null
          first_name: string
          fiscal_regime: string | null
          github_url: string | null
          iban: string | null
          id: string
          industries: string[] | null
          instagram_url: string | null
          interests: string | null
          is_suspended: boolean | null
          job_title: string | null
          job_type: string | null
          kyc_documents_verified: boolean | null
          kyc_rejection_reason: string | null
          kyc_verified_at: string | null
          last_login_at: string | null
          last_name: string
          legal_address: string | null
          linkedin_url: string | null
          location: string | null
          networking_enabled: boolean | null
          nickname: string | null
          onboarding_completed: boolean | null
          pec_email: string | null
          phone: string | null
          preferred_work_mode: string | null
          profession: string | null
          profile_photo_url: string | null
          restriction_reason: string | null
          return_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          sdi_code: string | null
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
          dac7_data_collected?: boolean | null
          dac7_threshold_notified?: boolean | null
          data_retention_exempt?: boolean | null
          email_verification_blocked_actions?: string[] | null
          facebook_url?: string | null
          first_name: string
          fiscal_regime?: string | null
          github_url?: string | null
          iban?: string | null
          id: string
          industries?: string[] | null
          instagram_url?: string | null
          interests?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          job_type?: string | null
          kyc_documents_verified?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_verified_at?: string | null
          last_login_at?: string | null
          last_name: string
          legal_address?: string | null
          linkedin_url?: string | null
          location?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          pec_email?: string | null
          phone?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          restriction_reason?: string | null
          return_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          sdi_code?: string | null
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
          dac7_data_collected?: boolean | null
          dac7_threshold_notified?: boolean | null
          data_retention_exempt?: boolean | null
          email_verification_blocked_actions?: string[] | null
          facebook_url?: string | null
          first_name?: string
          fiscal_regime?: string | null
          github_url?: string | null
          iban?: string | null
          id?: string
          industries?: string[] | null
          instagram_url?: string | null
          interests?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          job_type?: string | null
          kyc_documents_verified?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_verified_at?: string | null
          last_login_at?: string | null
          last_name?: string
          legal_address?: string | null
          linkedin_url?: string | null
          location?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          pec_email?: string | null
          phone?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          restriction_reason?: string | null
          return_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sdi_code?: string | null
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
      profiles_backup_20250115: {
        Row: {
          admin_notes: string | null
          age_confirmed: boolean | null
          bio: string | null
          city: string | null
          collaboration_availability: string | null
          collaboration_description: string | null
          collaboration_types: string[] | null
          competencies: string[] | null
          created_at: string | null
          dac7_data_collected: boolean | null
          dac7_threshold_notified: boolean | null
          data_retention_exempt: boolean | null
          email_verification_blocked_actions: string[] | null
          facebook_url: string | null
          first_name: string | null
          fiscal_regime: string | null
          github_url: string | null
          iban: string | null
          id: string | null
          industries: string[] | null
          instagram_url: string | null
          interests: string | null
          is_suspended: boolean | null
          job_title: string | null
          job_type: string | null
          kyc_documents_verified: boolean | null
          kyc_rejection_reason: string | null
          kyc_verified_at: string | null
          last_login_at: string | null
          last_name: string | null
          legal_address: string | null
          linkedin_url: string | null
          location: string | null
          networking_enabled: boolean | null
          nickname: string | null
          onboarding_completed: boolean | null
          pec_email: string | null
          phone: string | null
          preferred_work_mode: string | null
          profession: string | null
          profile_photo_url: string | null
          restriction_reason: string | null
          return_url: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          sdi_code: string | null
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
          updated_at: string | null
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
          created_at?: string | null
          dac7_data_collected?: boolean | null
          dac7_threshold_notified?: boolean | null
          data_retention_exempt?: boolean | null
          email_verification_blocked_actions?: string[] | null
          facebook_url?: string | null
          first_name?: string | null
          fiscal_regime?: string | null
          github_url?: string | null
          iban?: string | null
          id?: string | null
          industries?: string[] | null
          instagram_url?: string | null
          interests?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          job_type?: string | null
          kyc_documents_verified?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_verified_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          legal_address?: string | null
          linkedin_url?: string | null
          location?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          pec_email?: string | null
          phone?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          restriction_reason?: string | null
          return_url?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sdi_code?: string | null
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
          updated_at?: string | null
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
          created_at?: string | null
          dac7_data_collected?: boolean | null
          dac7_threshold_notified?: boolean | null
          data_retention_exempt?: boolean | null
          email_verification_blocked_actions?: string[] | null
          facebook_url?: string | null
          first_name?: string | null
          fiscal_regime?: string | null
          github_url?: string | null
          iban?: string | null
          id?: string | null
          industries?: string[] | null
          instagram_url?: string | null
          interests?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          job_type?: string | null
          kyc_documents_verified?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_verified_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          legal_address?: string | null
          linkedin_url?: string | null
          location?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          onboarding_completed?: boolean | null
          pec_email?: string | null
          phone?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          restriction_reason?: string | null
          return_url?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sdi_code?: string | null
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
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
          work_style?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          action: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          ip_address: unknown | null
          user_agent: string | null
          window_start: string | null
        }
        Insert: {
          action: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          ip_address?: unknown | null
          user_agent?: string | null
          window_start?: string | null
        }
        Update: {
          action?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          ip_address?: unknown | null
          user_agent?: string | null
          window_start?: string | null
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
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          setting_key: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          setting_key: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          setting_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      space_locations: {
        Row: {
          address: string
          created_at: string | null
          latitude: number
          longitude: number
          space_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          latitude: number
          longitude: number
          space_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          latitude?: number
          longitude?: number
          space_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_locations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_locations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_locations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces_public_view"
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
            referencedRelation: "spaces_public_safe"
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
          approximate_location: unknown | null
          availability: Json | null
          cancellation_policy:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          capacity: number | null
          category: Database["public"]["Enums"]["space_category"]
          city_name: string | null
          confirmation_type: Database["public"]["Enums"]["confirmation_type"]
          country_code: string | null
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
          approximate_location?: unknown | null
          availability?: Json | null
          cancellation_policy?:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          capacity?: number | null
          category: Database["public"]["Enums"]["space_category"]
          city_name?: string | null
          confirmation_type?: Database["public"]["Enums"]["confirmation_type"]
          country_code?: string | null
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
          approximate_location?: unknown | null
          availability?: Json | null
          cancellation_policy?:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["space_category"]
          city_name?: string | null
          confirmation_type?: Database["public"]["Enums"]["confirmation_type"]
          country_code?: string | null
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
          {
            foreignKeyName: "spaces_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces_backup_20250115_security: {
        Row: {
          address: string | null
          amenities: string[] | null
          approved_at: string | null
          approved_by: string | null
          availability: Json | null
          cancellation_policy:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          capacity: number | null
          category: Database["public"]["Enums"]["space_category"] | null
          confirmation_type:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          event_friendly_tags: string[] | null
          host_id: string | null
          id: string | null
          ideal_guest_tags: string[] | null
          is_suspended: boolean | null
          latitude: number | null
          longitude: number | null
          max_capacity: number | null
          pending_approval: boolean | null
          photos: string[] | null
          price_per_day: number | null
          price_per_hour: number | null
          published: boolean | null
          rejection_reason: string | null
          revision_notes: string | null
          revision_requested: boolean | null
          rules: string | null
          seating_types: string[] | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          title: string | null
          updated_at: string | null
          work_environment:
            | Database["public"]["Enums"]["work_environment"]
            | null
          workspace_features: string[] | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          availability?: Json | null
          cancellation_policy?:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["space_category"] | null
          confirmation_type?:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          event_friendly_tags?: string[] | null
          host_id?: string | null
          id?: string | null
          ideal_guest_tags?: string[] | null
          is_suspended?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number | null
          pending_approval?: boolean | null
          photos?: string[] | null
          price_per_day?: number | null
          price_per_hour?: number | null
          published?: boolean | null
          rejection_reason?: string | null
          revision_notes?: string | null
          revision_requested?: boolean | null
          rules?: string | null
          seating_types?: string[] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title?: string | null
          updated_at?: string | null
          work_environment?:
            | Database["public"]["Enums"]["work_environment"]
            | null
          workspace_features?: string[] | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          availability?: Json | null
          cancellation_policy?:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["space_category"] | null
          confirmation_type?:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          event_friendly_tags?: string[] | null
          host_id?: string | null
          id?: string | null
          ideal_guest_tags?: string[] | null
          is_suspended?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number | null
          pending_approval?: boolean | null
          photos?: string[] | null
          price_per_day?: number | null
          price_per_hour?: number | null
          published?: boolean | null
          rejection_reason?: string | null
          revision_notes?: string | null
          revision_requested?: boolean | null
          rules?: string | null
          seating_types?: string[] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title?: string | null
          updated_at?: string | null
          work_environment?:
            | Database["public"]["Enums"]["work_environment"]
            | null
          workspace_features?: string[] | null
        }
        Relationships: []
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
      storage_cleanup_log: {
        Row: {
          bucket_name: string
          cleanup_date: string
          created_at: string
          errors: Json | null
          execution_time_ms: number | null
          files_deleted: number
          id: string
        }
        Insert: {
          bucket_name: string
          cleanup_date?: string
          created_at?: string
          errors?: Json | null
          execution_time_ms?: number | null
          files_deleted?: number
          id?: string
        }
        Update: {
          bucket_name?: string
          cleanup_date?: string
          created_at?: string
          errors?: Json | null
          execution_time_ms?: number | null
          files_deleted?: number
          id?: string
        }
        Relationships: []
      }
      stripe_accounts: {
        Row: {
          account_status: string
          account_type: string | null
          charges_enabled: boolean
          country_code: string | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          onboarding_completed: boolean
          payouts_enabled: boolean
          requirements_due: Json | null
          stripe_account_id: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          account_type?: string | null
          charges_enabled?: boolean
          country_code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          requirements_due?: Json | null
          stripe_account_id: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          account_type?: string | null
          charges_enabled?: boolean
          country_code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          requirements_due?: Json | null
          stripe_account_id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
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
      system_alarms: {
        Row: {
          alarm_type: string
          created_at: string | null
          error_details: string | null
          id: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alarm_type: string
          created_at?: string | null
          error_details?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alarm_type?: string
          created_at?: string | null
          error_details?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: Database["public"]["Enums"]["setting_category"]
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: Database["public"]["Enums"]["setting_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: Database["public"]["Enums"]["setting_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_details: {
        Row: {
          address_line1: string
          address_line2: string | null
          bic_swift: string | null
          city: string
          country_code: string
          created_at: string
          created_by: string | null
          entity_type: string
          iban: string
          id: string
          is_primary: boolean
          postal_code: string
          profile_id: string
          province: string | null
          tax_id: string
          updated_at: string
          valid_from: string
          valid_to: string | null
          vat_number: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          bic_swift?: string | null
          city: string
          country_code: string
          created_at?: string
          created_by?: string | null
          entity_type: string
          iban: string
          id?: string
          is_primary?: boolean
          postal_code: string
          profile_id: string
          province?: string | null
          tax_id: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          vat_number?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          bic_swift?: string | null
          city?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          entity_type?: string
          iban?: string
          id?: string
          is_primary?: boolean
          postal_code?: string
          profile_id?: string
          province?: string | null
          tax_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_details_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_details_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_backup_20250115: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_session_state: {
        Row: {
          expires_at: string
          id: string
          session_data: Json
          session_key: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          session_data: Json
          session_key: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          session_data?: Json
          session_key?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_session_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_session_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
            foreignKeyName: "fk_waitlists_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
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
            referencedRelation: "spaces_public_safe"
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
          {
            foreignKeyName: "waitlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "spaces_public_safe"
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
      profiles_public_safe: {
        Row: {
          bio: string | null
          city: string | null
          collaboration_availability: string | null
          collaboration_description: string | null
          collaboration_types: string[] | null
          competencies: string[] | null
          created_at: string | null
          first_name: string | null
          id: string | null
          industries: string[] | null
          interests: string | null
          job_title: string | null
          last_name: string | null
          networking_enabled: boolean | null
          nickname: string | null
          preferred_work_mode: string | null
          profession: string | null
          profile_photo_url: string | null
          skills: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          collaboration_availability?: string | null
          collaboration_description?: string | null
          collaboration_types?: string[] | null
          competencies?: string[] | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          industries?: string[] | null
          interests?: string | null
          job_title?: string | null
          last_name?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          skills?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          collaboration_availability?: string | null
          collaboration_description?: string | null
          collaboration_types?: string[] | null
          competencies?: string[] | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          industries?: string[] | null
          interests?: string | null
          job_title?: string | null
          last_name?: string | null
          networking_enabled?: boolean | null
          nickname?: string | null
          preferred_work_mode?: string | null
          profession?: string | null
          profile_photo_url?: string | null
          skills?: string | null
        }
        Relationships: []
      }
      spaces_public_safe: {
        Row: {
          amenities: string[] | null
          approximate_location: unknown | null
          availability: Json | null
          cancellation_policy:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          category: Database["public"]["Enums"]["space_category"] | null
          city_name: string | null
          confirmation_type:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          country_code: string | null
          created_at: string | null
          description: string | null
          event_friendly_tags: string[] | null
          id: string | null
          ideal_guest_tags: string[] | null
          max_capacity: number | null
          photos: string[] | null
          price_per_day: number | null
          price_per_hour: number | null
          published: boolean | null
          rules: string | null
          seating_types: string[] | null
          title: string | null
          updated_at: string | null
          work_environment:
            | Database["public"]["Enums"]["work_environment"]
            | null
          workspace_features: string[] | null
        }
        Insert: {
          amenities?: string[] | null
          approximate_location?: unknown | null
          availability?: Json | null
          cancellation_policy?:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          category?: Database["public"]["Enums"]["space_category"] | null
          city_name?: string | null
          confirmation_type?:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          event_friendly_tags?: string[] | null
          id?: string | null
          ideal_guest_tags?: string[] | null
          max_capacity?: number | null
          photos?: string[] | null
          price_per_day?: number | null
          price_per_hour?: number | null
          published?: boolean | null
          rules?: string | null
          seating_types?: string[] | null
          title?: string | null
          updated_at?: string | null
          work_environment?:
            | Database["public"]["Enums"]["work_environment"]
            | null
          workspace_features?: string[] | null
        }
        Update: {
          amenities?: string[] | null
          approximate_location?: unknown | null
          availability?: Json | null
          cancellation_policy?:
            | Database["public"]["Enums"]["cancellation_policy"]
            | null
          category?: Database["public"]["Enums"]["space_category"] | null
          city_name?: string | null
          confirmation_type?:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          event_friendly_tags?: string[] | null
          id?: string | null
          ideal_guest_tags?: string[] | null
          max_capacity?: number | null
          photos?: string[] | null
          price_per_day?: number | null
          price_per_hour?: number | null
          published?: boolean | null
          rules?: string | null
          seating_types?: string[] | null
          title?: string | null
          updated_at?: string | null
          work_environment?:
            | Database["public"]["Enums"]["work_environment"]
            | null
          workspace_features?: string[] | null
        }
        Relationships: []
      }
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
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["space_category"] | null
          confirmation_type?:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at?: string | null
          host_stripe_account_id?: never
          id?: string | null
          max_capacity?: number | null
          name?: string | null
          price_per_day?: number | null
          price_per_hour?: number | null
          work_environment?:
            | Database["public"]["Enums"]["work_environment"]
            | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["space_category"] | null
          confirmation_type?:
            | Database["public"]["Enums"]["confirmation_type"]
            | null
          created_at?: string | null
          host_stripe_account_id?: never
          id?: string | null
          max_capacity?: number | null
          name?: string | null
          price_per_day?: number | null
          price_per_hour?: number | null
          work_environment?:
            | Database["public"]["Enums"]["work_environment"]
            | null
        }
        Relationships: []
      }
      user_conversations_view: {
        Row: {
          booking_id: string | null
          conversation_id: string | null
          coworker_id: string | null
          created_at: string | null
          host_id: string | null
          last_message: string | null
          last_message_at: string | null
          last_sender_first_name: string | null
          last_sender_id: string | null
          last_sender_is_me: boolean | null
          last_sender_last_name: string | null
          me_id: string | null
          me_is_host: boolean | null
          message_count: number | null
          other_first_name: string | null
          other_last_name: string | null
          other_profile_photo_url: string | null
          other_role: Database["public"]["Enums"]["user_role"] | null
          other_user_id: string | null
          space_id: string | null
          space_title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_coworker_id_fkey"
            columns: ["coworker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_coworker_id_fkey"
            columns: ["coworker_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_messages_sender_id"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_messages_sender_id"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_tag: {
        Args: { approver_id: string; tag_id: string }
        Returns: Json
      }
      assign_moderator_role: {
        Args: { assigned_by_admin?: string; target_user_id: string }
        Returns: Json
      }
      calculate_cancellation_fee: {
        Args: {
          booking_date_param: string
          booking_status_param?: string
          confirmation_type_param?: string
          price_per_day_param: number
        }
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
      can_moderate_content: {
        Args: { user_id: string }
        Returns: boolean
      }
      cancel_booking: {
        Args: {
          booking_id: string
          cancelled_by_host?: boolean
          reason?: string
        }
        Returns: Json
      }
      check_payment_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          booking_date: string
          booking_id: string
          issue: string
          space_title: string
          status: string
        }[]
      }
      check_profile_access: {
        Args: { profile_id: string; viewer_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_action: string; p_identifier: string }
        Returns: Json
      }
      check_rate_limit_advanced: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_requests: number
          p_window_ms: number
        }
        Returns: Json
      }
      check_slot_conflicts: {
        Args: {
          date_param: string
          end_time_param: string
          exclude_booking_id?: string
          space_id_param: string
          start_time_param: string
        }
        Returns: Json
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_gdpr_exports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
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
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_image_processing_job: {
        Args: {
          original_path_param: string
          original_size_param?: number
          space_id_param: string
        }
        Returns: string
      }
      create_system_alarm: {
        Args: {
          p_alarm_type: string
          p_error_details?: string
          p_message: string
          p_metadata?: Json
          p_severity?: string
          p_source?: string
          p_title: string
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
      get_admin_kyc_hosts: {
        Args: { kyc_status_param?: string }
        Returns: {
          active_spaces_count: number
          created_at: string
          email: string
          first_name: string
          host_id: string
          kyc_documents_count: number
          kyc_rejection_reason: string
          kyc_verified: boolean
          last_name: string
          stripe_connected: boolean
          tax_details_count: number
          total_bookings_count: number
        }[]
      }
      get_aggregated_metrics: {
        Args: { metric_type_param: string; time_window_hours?: number }
        Returns: Json
      }
      get_alternative_time_slots: {
        Args:
          | {
              date_param: string
              duration_hours_param: number
              space_id_param: string
            }
          | {
              date_param: string
              duration_hours_param: number
              space_id_param: string
            }
        Returns: string[]
      }
      get_cron_job_runs: {
        Args: { limit_count?: number }
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      get_cron_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_host_metrics: {
        Args: { host_id_param: string }
        Returns: Json
      }
      get_host_transactions_optimized: {
        Args: { host_id_param: string; limit_param?: number }
        Returns: {
          amount: number
          booking_id: string
          created_at: string
          customer_name: string
          host_amount: number
          id: string
          payment_status: string
          space_title: string
        }[]
      }
      get_hosts_for_dac7_report: {
        Args: { host_ids_filter?: string[]; report_year: number }
        Returns: {
          email: string
          first_name: string
          host_id: string
          last_name: string
          monthly_data: Json
          tax_details: Json
          total_days: number
          total_hours: number
          total_income: number
          total_transactions: number
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_booking_id: string
          p_coworker_id: string
          p_host_id: string
          p_space_id: string
        }
        Returns: string
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
      get_safe_public_profile: {
        Args: { profile_id_param: string }
        Returns: Json
      }
      get_single_space_metrics: {
        Args: { space_id_param: string }
        Returns: Json
      }
      get_space_availability_optimized: {
        Args:
          | {
              end_date_param: string
              space_id_param: string
              start_date_param: string
            }
          | {
              end_date_param: string
              space_id_param: string
              start_date_param: string
            }
        Returns: {
          booking_id: string
          end_time: string
          start_time: string
          status: string
          user_id: string
        }[]
      }
      get_space_availability_v2: {
        Args: {
          end_date_param: string
          space_id_param: string
          start_date_param: string
        }
        Returns: {
          booking_id: string
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
          host_bio: string
          host_created_at: string
          host_first_name: string
          host_last_name: string
          host_networking_enabled: boolean
          host_profile_photo: string
          host_stripe_account_id: string
          host_stripe_connected: boolean
          host_total_spaces: number
          id: string
          latitude: number
          longitude: number
          max_capacity: number
          name: string
          photos: string[]
          price_per_day: number
          price_per_hour: number
          published: boolean
          seating_type: string
          subcategory: string
          title: string
          work_environment: string
          workspace_features: string[]
        }[]
      }
      get_spaces_availability_batch: {
        Args: {
          check_date: string
          check_end_time: string
          check_start_time: string
          space_ids: string[]
        }
        Returns: {
          available_capacity: number
          booked_capacity: number
          max_capacity: number
          space_id: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_webhook_retry: {
        Args: { event_uuid: string }
        Returns: undefined
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_moderator: {
        Args: { user_id: string }
        Returns: boolean
      }
      lock_and_select_expired_bookings: {
        Args: { p_lock_duration_minutes?: number }
        Returns: {
          approval_deadline: string | null
          approval_reminder_sent: boolean | null
          auto_cancel_scheduled_at: string | null
          booking_date: string
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_host: boolean | null
          created_at: string | null
          end_time: string | null
          frozen_at: string | null
          frozen_reason: string | null
          guests_count: number
          host_issue_reported: boolean | null
          id: string
          is_urgent: boolean | null
          issue_report_reason: string | null
          payment_deadline: string | null
          payment_reminder_sent: boolean | null
          payment_required: boolean | null
          payment_session_id: string | null
          payout_completed_at: string | null
          payout_scheduled_at: string | null
          payout_stripe_transfer_id: string | null
          processing_lock: string | null
          reservation_token: string | null
          service_completed_at: string | null
          service_completed_by: string | null
          slot_reserved_until: string | null
          space_id: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          user_id: string
        }[]
      }
      lock_and_select_reminder_bookings: {
        Args: { p_lock_duration_minutes?: number }
        Returns: {
          approval_deadline: string | null
          approval_reminder_sent: boolean | null
          auto_cancel_scheduled_at: string | null
          booking_date: string
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_host: boolean | null
          created_at: string | null
          end_time: string | null
          frozen_at: string | null
          frozen_reason: string | null
          guests_count: number
          host_issue_reported: boolean | null
          id: string
          is_urgent: boolean | null
          issue_report_reason: string | null
          payment_deadline: string | null
          payment_reminder_sent: boolean | null
          payment_required: boolean | null
          payment_session_id: string | null
          payout_completed_at: string | null
          payout_scheduled_at: string | null
          payout_stripe_transfer_id: string | null
          processing_lock: string | null
          reservation_token: string | null
          service_completed_at: string | null
          service_completed_by: string | null
          slot_reserved_until: string | null
          space_id: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          user_id: string
        }[]
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
      log_storage_cleanup: {
        Args: {
          p_bucket_name: string
          p_errors?: Json
          p_execution_time_ms?: number
          p_files_deleted: number
        }
        Returns: string
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
      refresh_user_suggestions: {
        Args: { p_user_id: string }
        Returns: Json
      }
      remove_moderator_role: {
        Args: { removed_by_admin?: string; target_user_id: string }
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
      unlock_bookings: {
        Args: { booking_ids: string[] }
        Returns: undefined
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
      validate_and_reserve_multi_slots: {
        Args: {
          client_total_price_param?: number
          confirmation_type_param: string
          guests_count_param: number
          slots_param: Json
          space_id_param: string
          user_id_param: string
        }
        Returns: Json
      }
      validate_and_reserve_slot: {
        Args:
          | {
              confirmation_type_param: string
              date_param: string
              end_time_param: string
              space_id_param: string
              start_time_param: string
              user_id_param: string
            }
          | {
              confirmation_type_param?: string
              date_param: string
              end_time_param: string
              guests_count_param?: number
              space_id_param: string
              start_time_param: string
              user_id_param: string
            }
          | {
              date_param: string
              end_time_param: string
              space_id_param: string
              start_time_param: string
              user_id_param: string
            }
        Returns: Json
      }
      validate_booking_slot_with_lock: {
        Args:
          | {
              date_param: string
              end_time_param: string
              space_id_param: string
              start_time_param: string
              user_id_param: string
            }
          | {
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
      app_role: "admin" | "moderator" | "user"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "pending_approval"
        | "pending_payment"
        | "served"
        | "refunded"
        | "disputed"
        | "frozen"
      cancellation_policy: "flexible" | "moderate" | "strict"
      confirmation_type: "instant" | "host_approval"
      message_template_type: "confirmation" | "reminder" | "cancellation_notice"
      setting_category:
        | "general"
        | "payment"
        | "booking"
        | "moderation"
        | "gdpr"
        | "integration"
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
      app_role: ["admin", "moderator", "user"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "pending_approval",
        "pending_payment",
        "served",
        "refunded",
        "disputed",
        "frozen",
      ],
      cancellation_policy: ["flexible", "moderate", "strict"],
      confirmation_type: ["instant", "host_approval"],
      message_template_type: [
        "confirmation",
        "reminder",
        "cancellation_notice",
      ],
      setting_category: [
        "general",
        "payment",
        "booking",
        "moderation",
        "gdpr",
        "integration",
      ],
      space_category: ["home", "outdoor", "professional"],
      stripe_onboarding_state: ["none", "pending", "completed", "restricted"],
      user_role: ["host", "coworker", "admin"],
      work_environment: ["silent", "controlled", "dynamic"],
    },
  },
} as const
