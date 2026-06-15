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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      questoes: {
        Row: {
          acertou: boolean | null
          alternativas: Json
          assunto: string
          created_at: string
          enunciado: string
          explicacao: string
          gabarito: string
          id: string
          ordem: number
          resposta_aluno: string | null
          simulado_id: string
        }
        Insert: {
          acertou?: boolean | null
          alternativas: Json
          assunto: string
          created_at?: string
          enunciado: string
          explicacao: string
          gabarito: string
          id?: string
          ordem: number
          resposta_aluno?: string | null
          simulado_id: string
        }
        Update: {
          acertou?: boolean | null
          alternativas?: Json
          assunto?: string
          created_at?: string
          enunciado?: string
          explicacao?: string
          gabarito?: string
          id?: string
          ordem?: number
          resposta_aluno?: string | null
          simulado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questoes_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes: {
        Row: {
          comentarios: Json
          created_at: string
          feedback_geral: string
          id: string
          modelo: string
          nota_total: number
          notas: Json
          pontos_fortes: Json
          pontos_fracos: Json
          sugestoes: Json
          tema: string
          texto: string
          user_id: string
        }
        Insert: {
          comentarios?: Json
          created_at?: string
          feedback_geral?: string
          id?: string
          modelo: string
          nota_total?: number
          notas?: Json
          pontos_fortes?: Json
          pontos_fracos?: Json
          sugestoes?: Json
          tema: string
          texto: string
          user_id: string
        }
        Update: {
          comentarios?: Json
          created_at?: string
          feedback_geral?: string
          id?: string
          modelo?: string
          nota_total?: number
          notas?: Json
          pontos_fortes?: Json
          pontos_fracos?: Json
          sugestoes?: Json
          tema?: string
          texto?: string
          user_id?: string
        }
        Relationships: []
      }
      simulados: {
        Row: {
          acertos: number
          area: Database["public"]["Enums"]["area_conhecimento"]
          banca: Database["public"]["Enums"]["banca_vestibular"]
          created_at: string
          dificuldade: Database["public"]["Enums"]["dificuldade"]
          feedback_ia: string | null
          finalizado_at: string | null
          id: string
          quantidade_questoes: number
          status: Database["public"]["Enums"]["simulado_status"]
          tempo_segundos: number
          user_id: string
        }
        Insert: {
          acertos?: number
          area: Database["public"]["Enums"]["area_conhecimento"]
          banca: Database["public"]["Enums"]["banca_vestibular"]
          created_at?: string
          dificuldade: Database["public"]["Enums"]["dificuldade"]
          feedback_ia?: string | null
          finalizado_at?: string | null
          id?: string
          quantidade_questoes: number
          status?: Database["public"]["Enums"]["simulado_status"]
          tempo_segundos?: number
          user_id: string
        }
        Update: {
          acertos?: number
          area?: Database["public"]["Enums"]["area_conhecimento"]
          banca?: Database["public"]["Enums"]["banca_vestibular"]
          created_at?: string
          dificuldade?: Database["public"]["Enums"]["dificuldade"]
          feedback_ia?: string | null
          finalizado_at?: string | null
          id?: string
          quantidade_questoes?: number
          status?: Database["public"]["Enums"]["simulado_status"]
          tempo_segundos?: number
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          meta_diaria: number
          nivel: number
          streak_dias: number
          ultima_atividade: string | null
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          meta_diaria?: number
          nivel?: number
          streak_dias?: number
          ultima_atividade?: string | null
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          meta_diaria?: number
          nivel?: number
          streak_dias?: number
          ultima_atividade?: string | null
          updated_at?: string
          user_id?: string
          xp?: number
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
      area_conhecimento: "matematica" | "linguagens" | "humanas" | "natureza"
      banca_vestibular: "enem" | "fuvest" | "unicamp" | "unesp"
      dificuldade: "facil" | "medio" | "dificil" | "misto"
      simulado_status: "em_andamento" | "finalizado"
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
      area_conhecimento: ["matematica", "linguagens", "humanas", "natureza"],
      banca_vestibular: ["enem", "fuvest", "unicamp", "unesp"],
      dificuldade: ["facil", "medio", "dificil", "misto"],
      simulado_status: ["em_andamento", "finalizado"],
    },
  },
} as const
