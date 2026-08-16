export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string | null;
          status: "active" | "archived";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string | null;
          status?: "active" | "archived";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string | null;
          status?: "active" | "archived";
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string | null;
          owner_id: string | null;
          project_id: string;
          status: "active" | "archived";
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          owner_id?: string | null;
          project_id: string;
          status?: "active" | "archived";
          title?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          owner_id?: string | null;
          project_id?: string;
          status?: "active" | "archived";
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          client_message_id: string | null;
          completed_at: string | null;
          content: Json;
          conversation_id: string;
          created_at: string;
          error: Json | null;
          id: string;
          position: number;
          role: "user" | "assistant";
          run_id: string | null;
          status: "streaming" | "completed" | "failed" | "cancelled";
        };
        Insert: {
          client_message_id?: string | null;
          completed_at?: string | null;
          content?: Json;
          conversation_id: string;
          created_at?: string;
          error?: Json | null;
          id?: string;
          position?: never;
          role: "user" | "assistant";
          run_id?: string | null;
          status: "streaming" | "completed" | "failed" | "cancelled";
        };
        Update: {
          client_message_id?: string | null;
          completed_at?: string | null;
          content?: Json;
          conversation_id?: string;
          created_at?: string;
          error?: Json | null;
          id?: string;
          position?: never;
          role?: "user" | "assistant";
          run_id?: string | null;
          status?: "streaming" | "completed" | "failed" | "cancelled";
        };
        Relationships: [];
      };
      agent_runs: {
        Row: {
          agent_id: string;
          agent_version: string;
          assistant_message_id: string;
          attempt_id: string | null;
          completed_at: string | null;
          conversation_id: string;
          created_at: string;
          error_code: string | null;
          error_message: string | null;
          id: string;
          input_tokens: number | null;
          lease_expires_at: string | null;
          model_alias: string;
          model_config_version: string;
          output_tokens: number | null;
          started_at: string | null;
          status: "queued" | "running" | "cancelling" | "completed" | "failed" | "cancelled";
          user_message_id: string;
        };
        Insert: {
          agent_id?: string;
          agent_version: string;
          assistant_message_id: string;
          attempt_id?: string | null;
          completed_at?: string | null;
          conversation_id: string;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          input_tokens?: number | null;
          lease_expires_at?: string | null;
          model_alias: string;
          model_config_version: string;
          output_tokens?: number | null;
          started_at?: string | null;
          status?: "queued" | "running" | "cancelling" | "completed" | "failed" | "cancelled";
          user_message_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Insert"]>;
        Relationships: [];
      };
      agent_events: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          run_id: string;
          sequence: number;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload?: Json;
          run_id: string;
          sequence: number;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          run_id?: string;
          sequence?: number;
          type?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      health_check: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      create_chat_run: {
        Args: {
          p_client_message_id: string;
          p_content: Json;
          p_conversation_id: string;
        };
        Returns: Json;
      };
      claim_next_chat_run: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      append_chat_event: {
        Args: {
          p_payload: Json;
          p_run_id: string;
          p_sequence: number;
          p_type: string;
        };
        Returns: undefined;
      };
      append_chat_delta: {
        Args: {
          p_content: string;
          p_delta: string;
          p_run_id: string;
          p_sequence: number;
        };
        Returns: undefined;
      };
      finish_chat_run: {
        Args: {
          p_content: string;
          p_error_code?: string | null;
          p_error_message?: string | null;
          p_input_tokens?: number | null;
          p_output_tokens?: number | null;
          p_run_id: string;
          p_sequence: number;
          p_status: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
