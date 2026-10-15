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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      lesson_build_jobs: {
        Row: {
          attempts: number
          chapter: string
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          klass: string
          slides: number
          status: string
          subject: string
          subtopics: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          chapter: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          klass: string
          slides?: number
          status?: string
          subject: string
          subtopics?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          chapter?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          klass?: string
          slides?: number
          status?: string
          subject?: string
          subtopics?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_build_state: {
        Row: {
          id: string
          lease_until: string | null
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          id: string
          lease_until?: string | null
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lease_until?: string | null
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_cache: {
        Row: {
          cache_key: string
          chapter: string
          created_at: string
          klass: string
          result: Json
          subject: string
          subtopics: string
          topic: string
        }
        Insert: {
          cache_key: string
          chapter?: string
          created_at?: string
          klass: string
          result: Json
          subject: string
          subtopics?: string
          topic: string
        }
        Update: {
          cache_key?: string
          chapter?: string
          created_at?: string
          klass?: string
          result?: Json
          subject?: string
          subtopics?: string
          topic?: string
        }
        Relationships: []
      }
      ncert_books: {
        Row: {
          source_kind: string
          approved_by: string | null
          approved_at: string | null
          chapter: string
          class: string
          created_at: string
          download_url: string | null
          file_name: string
          file_size: number
          full_text: string | null
          id: string
          learner_goal: string | null
          learner_name: string | null
          num_chunks: number
          num_pages: number
          status: string
          storage_path: string
          subject: string
          summary: string | null
        }
        Insert: {
          source_kind?: string
          approved_by?: string | null
          approved_at?: string | null
          chapter: string
          class: string
          created_at?: string
          download_url?: string | null
          file_name: string
          file_size: number
          full_text?: string | null
          id?: string
          learner_goal?: string | null
          learner_name?: string | null
          num_chunks?: number
          num_pages?: number
          status?: string
          storage_path: string
          subject: string
          summary?: string | null
        }
        Update: {
          source_kind?: string
          approved_by?: string | null
          approved_at?: string | null
          chapter?: string
          class?: string
          created_at?: string
          download_url?: string | null
          file_name?: string
          file_size?: number
          full_text?: string | null
          id?: string
          learner_goal?: string | null
          learner_name?: string | null
          num_chunks?: number
          num_pages?: number
          status?: string
          storage_path?: string
          subject?: string
          summary?: string | null
        }
        Relationships: []
      }
      ncert_chunks: {
        Row: {
          book_id: string
          chunk_index: number
          content: string
          created_at: string
          id: string
        }
        Insert: {
          book_id: string
          chunk_index: number
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          book_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncert_chunks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "ncert_books"
            referencedColumns: ["id"]
          },
        ]
      }
      ncert_pages: {
        Row: {
          book_id: string
          created_at: string
          id: string
          page_number: number
          text: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          page_number: number
          text: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          page_number?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncert_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "ncert_books"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_image_audit: {
        Row: {
          bullets: string
          cache_key: string
          cached: boolean
          caption: string
          created_at: string
          duration_ms: number | null
          error: string | null
          grounding: string
          id: string
          image_url: string | null
          klass: string
          nocache: boolean
          status: string
          subject: string
          title: string
          visual_prompt: string
        }
        Insert: {
          bullets?: string
          cache_key: string
          cached?: boolean
          caption?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          grounding?: string
          id?: string
          image_url?: string | null
          klass?: string
          nocache?: boolean
          status?: string
          subject?: string
          title?: string
          visual_prompt?: string
        }
        Update: {
          bullets?: string
          cache_key?: string
          cached?: boolean
          caption?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          grounding?: string
          id?: string
          image_url?: string | null
          klass?: string
          nocache?: boolean
          status?: string
          subject?: string
          title?: string
          visual_prompt?: string
        }
        Relationships: []
      }
      slide_image_cache: {
        Row: {
          cache_key: string
          created_at: string
          image_url: string
          klass: string
          subject: string
          title: string
          visual_prompt: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          image_url: string
          klass: string
          subject: string
          title: string
          visual_prompt?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          image_url?: string
          klass?: string
          subject?: string
          title?: string
          visual_prompt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
