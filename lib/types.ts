export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      api_cache: {
        Row: {
          created_at: string;
          endpoint: string;
          expires_at: string;
          id: string;
          last_accessed_at: string;
          parameters: Json;
          response: Json;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          expires_at: string;
          id?: string;
          last_accessed_at?: string;
          parameters: Json;
          response: Json;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          expires_at?: string;
          id?: string;
          last_accessed_at?: string;
          parameters?: Json;
          response?: Json;
        };
        Relationships: [];
      };
      api_errors: {
        Row: {
          created_at: string;
          endpoint: string;
          error_code: string | null;
          error_details: Json | null;
          error_message: string;
          id: string;
          request_data: Json | null;
          request_id: string | null;
          stack_trace: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          error_code?: string | null;
          error_details?: Json | null;
          error_message: string;
          id?: string;
          request_data?: Json | null;
          request_id?: string | null;
          stack_trace?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          error_code?: string | null;
          error_details?: Json | null;
          error_message?: string;
          id?: string;
          request_data?: Json | null;
          request_id?: string | null;
          stack_trace?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      api_metrics: {
        Row: {
          created_at: string;
          endpoint: string;
          id: string;
          request_id: string | null;
          response_time_ms: number;
          status_code: number;
          success: boolean;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          id?: string;
          request_id?: string | null;
          response_time_ms: number;
          status_code: number;
          success: boolean;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          id?: string;
          request_id?: string | null;
          response_time_ms?: number;
          status_code?: number;
          success?: boolean;
          user_id?: string | null;
        };
        Relationships: [];
      };
      facebook_config: {
        Row: {
          access_token: string;
          api_version: string | null;
          created_at: string;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          access_token: string;
          api_version?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string | null;
        };
        Update: {
          access_token?: string;
          api_version?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      meta_account_insights: {
        Row: {
          account_id: string;
          account_status: number | null;
          amount_spent: number | null;
          average_cpc: number | null;
          average_cpm: number | null;
          balance: number | null;
          created_at: string | null;
          currency: string | null;
          id: string;
          insights_end_date: string | null;
          insights_start_date: string | null;
          last_updated: string | null;
          name: string;
          roas: number | null;
          spend_cap: number | null;
          total_clicks: number | null;
          total_conversions: Json | null;
          total_impressions: number | null;
          total_reach: number | null;
          updated_at: string | null;
        };
        Insert: {
          account_id: string;
          account_status?: number | null;
          amount_spent?: number | null;
          average_cpc?: number | null;
          average_cpm?: number | null;
          balance?: number | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          insights_end_date?: string | null;
          insights_start_date?: string | null;
          last_updated?: string | null;
          name: string;
          roas?: number | null;
          spend_cap?: number | null;
          total_clicks?: number | null;
          total_conversions?: Json | null;
          total_impressions?: number | null;
          total_reach?: number | null;
          updated_at?: string | null;
        };
        Update: {
          account_id?: string;
          account_status?: number | null;
          amount_spent?: number | null;
          average_cpc?: number | null;
          average_cpm?: number | null;
          balance?: number | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          insights_end_date?: string | null;
          insights_start_date?: string | null;
          last_updated?: string | null;
          name?: string;
          roas?: number | null;
          spend_cap?: number | null;
          total_clicks?: number | null;
          total_conversions?: Json | null;
          total_impressions?: number | null;
          total_reach?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      meta_ad_sets: {
        Row: {
          ad_set_id: string;
          bid_amount: number | null;
          billing_event: string | null;
          campaign_id: string;
          clicks: number | null;
          conversions: Json | null;
          cost_per_conversion: number | null;
          created_at: string | null;
          daily_budget: number | null;
          end_time: string | null;
          id: string;
          impressions: number | null;
          lifetime_budget: number | null;
          name: string;
          optimization_goal: string | null;
          reach: number | null;
          spend: number | null;
          start_time: string | null;
          status: string;
          targeting: Json | null;
          updated_at: string | null;
        };
        Insert: {
          ad_set_id: string;
          bid_amount?: number | null;
          billing_event?: string | null;
          campaign_id: string;
          clicks?: number | null;
          conversions?: Json | null;
          cost_per_conversion?: number | null;
          created_at?: string | null;
          daily_budget?: number | null;
          end_time?: string | null;
          id?: string;
          impressions?: number | null;
          lifetime_budget?: number | null;
          name: string;
          optimization_goal?: string | null;
          reach?: number | null;
          spend?: number | null;
          start_time?: string | null;
          status: string;
          targeting?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          ad_set_id?: string;
          bid_amount?: number | null;
          billing_event?: string | null;
          campaign_id?: string;
          clicks?: number | null;
          conversions?: Json | null;
          cost_per_conversion?: number | null;
          created_at?: string | null;
          daily_budget?: number | null;
          end_time?: string | null;
          id?: string;
          impressions?: number | null;
          lifetime_budget?: number | null;
          name?: string;
          optimization_goal?: string | null;
          reach?: number | null;
          spend?: number | null;
          start_time?: string | null;
          status?: string;
          targeting?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_ad_sets_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "meta_campaigns";
            referencedColumns: ["campaign_id"];
          }
        ];
      };
      meta_ads: {
        Row: {
          ad_id: string;
          ad_set_id: string | null;
          clicks: number | null;
          conversion_specs: Json | null;
          conversions: Json | null;
          cost_per_conversion: number | null;
          created_at: string | null;
          creative: Json | null;
          impressions: number | null;
          name: string | null;
          reach: number | null;
          spend: number | null;
          status: string | null;
          tracking_specs: Json | null;
          updated_at: string | null;
        };
        Insert: {
          ad_id: string;
          ad_set_id?: string | null;
          clicks?: number | null;
          conversion_specs?: Json | null;
          conversions?: Json | null;
          cost_per_conversion?: number | null;
          created_at?: string | null;
          creative?: Json | null;
          impressions?: number | null;
          name?: string | null;
          reach?: number | null;
          spend?: number | null;
          status?: string | null;
          tracking_specs?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          ad_id?: string;
          ad_set_id?: string | null;
          clicks?: number | null;
          conversion_specs?: Json | null;
          conversions?: Json | null;
          cost_per_conversion?: number | null;
          created_at?: string | null;
          creative?: Json | null;
          impressions?: number | null;
          name?: string | null;
          reach?: number | null;
          spend?: number | null;
          status?: string | null;
          tracking_specs?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_ads_ad_set_id_fkey";
            columns: ["ad_set_id"];
            isOneToOne: false;
            referencedRelation: "meta_ad_sets";
            referencedColumns: ["ad_set_id"];
          }
        ];
      };
      meta_campaigns: {
        Row: {
          account_id: string;
          campaign_id: string;
          clicks: number | null;
          conversions: Json | null;
          cost_per_conversion: number | null;
          created_at: string | null;
          daily_budget: number | null;
          end_time: string | null;
          id: string;
          impressions: number | null;
          lifetime_budget: number | null;
          name: string;
          objective: string;
          reach: number | null;
          spend: number | null;
          start_time: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          account_id: string;
          campaign_id: string;
          clicks?: number | null;
          conversions?: Json | null;
          cost_per_conversion?: number | null;
          created_at?: string | null;
          daily_budget?: number | null;
          end_time?: string | null;
          id?: string;
          impressions?: number | null;
          lifetime_budget?: number | null;
          name: string;
          objective: string;
          reach?: number | null;
          spend?: number | null;
          start_time?: string | null;
          status: string;
          updated_at?: string | null;
        };
        Update: {
          account_id?: string;
          campaign_id?: string;
          clicks?: number | null;
          conversions?: Json | null;
          cost_per_conversion?: number | null;
          created_at?: string | null;
          daily_budget?: number | null;
          end_time?: string | null;
          id?: string;
          impressions?: number | null;
          lifetime_budget?: number | null;
          name?: string;
          objective?: string;
          reach?: number | null;
          spend?: number | null;
          start_time?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "meta_account_insights";
            referencedColumns: ["account_id"];
          }
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          id: string;
          is_admin: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          is_admin?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_admin?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      get_current_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      log_api_error: {
        Args: {
          p_endpoint: string;
          p_error_message: string;
          p_error_details?: Json;
          p_error_code?: string;
          p_request_data?: Json;
          p_stack_trace?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      campaign_objective:
        | "OUTCOME_AWARENESS"
        | "OUTCOME_ENGAGEMENT"
        | "OUTCOME_SALES"
        | "OUTCOME_LEADS"
        | "OUTCOME_TRAFFIC"
        | "OUTCOME_APP_PROMOTION"
        | "OUTCOME_CONVERSIONS";
      campaign_status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      campaign_objective: [
        "OUTCOME_AWARENESS",
        "OUTCOME_ENGAGEMENT",
        "OUTCOME_SALES",
        "OUTCOME_LEADS",
        "OUTCOME_TRAFFIC",
        "OUTCOME_APP_PROMOTION",
        "OUTCOME_CONVERSIONS",
      ],
      campaign_status: ["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"],
    },
  },
} as const;
