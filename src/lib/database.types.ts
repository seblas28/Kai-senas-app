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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          actor_id: string | null
          after_data: Json
          before_data: Json
          created_at: string
          entity: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          after_data: Json
          before_data: Json
          created_at?: string
          entity: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          after_data?: Json
          before_data?: Json
          created_at?: string
          entity?: string
          id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          label: string
          maintenance_reason: string
          module_id: string
          status: string
          supported: boolean
          updated_at: string
          visibility: string
        }
        Insert: {
          label: string
          maintenance_reason?: string
          module_id: string
          status?: string
          supported?: boolean
          updated_at?: string
          visibility?: string
        }
        Update: {
          label?: string
          maintenance_reason?: string
          module_id?: string
          status?: string
          supported?: boolean
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      model_channels: {
        Row: {
          active_version: string
          module_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_version: string
          module_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_version?: string
          module_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_channels_active_version_module_id_fkey"
            columns: ["active_version", "module_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id", "module_id"]
          },
          {
            foreignKeyName: "model_channels_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          artifact_bytes: number
          artifact_hash: string
          created_at: string
          id: string
          labels: string[]
          module_id: string
          notes: string
          published_at: string | null
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          version: string
        }
        Insert: {
          artifact_bytes: number
          artifact_hash: string
          created_at?: string
          id?: string
          labels: string[]
          module_id: string
          notes: string
          published_at?: string | null
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          version: string
        }
        Update: {
          artifact_bytes?: number
          artifact_hash?: string
          created_at?: string
          id?: string
          labels?: string[]
          module_id?: string
          notes?: string
          published_at?: string | null
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          id: string
          maintenance_reason: string
          ranking_eligible: boolean | null
          stage: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          id: string
          maintenance_reason?: string
          ranking_eligible?: boolean | null
          stage: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          id?: string
          maintenance_reason?: string
          ranking_eligible?: boolean | null
          stage?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      practice_attempts: {
        Row: {
          client_attempt_id: string
          completed: boolean
          created_at: string
          duration_seconds: number
          id: string
          label: string
          module_id: string
          score: number
          source: string
          user_id: string
        }
        Insert: {
          client_attempt_id: string
          completed?: boolean
          created_at?: string
          duration_seconds: number
          id?: string
          label: string
          module_id: string
          score: number
          source?: string
          user_id: string
        }
        Update: {
          client_attempt_id?: string
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          label?: string
          module_id?: string
          score?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_module_id_label_fkey"
            columns: ["module_id", "label"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["module_id", "label"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_model: { Args: { p_module: string }; Returns: Json }
      get_model_artifact: { Args: { p_id: string }; Returns: Json }
      publish_model: {
        Args: { p_expected_active?: string; p_id: string }
        Returns: undefined
      }
      review_model: {
        Args: { p_approve: boolean; p_id: string; p_note: string }
        Returns: undefined
      }
      submit_model: {
        Args: {
          p_bundle: Json
          p_module: string
          p_notes: string
          p_version: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
