/**
 * Generated types for Supabase database
 * Update this file when database schema changes
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          oab_number: string | null
          oab_state: string | null
          phone: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          oab_number?: string | null
          oab_state?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          oab_number?: string | null
          oab_state?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      offices: {
        Row: {
          id: string
          name: string
          cnpj: string | null
          address: string | null
          city: string | null
          state: string | null
          cep: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          owner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          cep?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          owner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          cep?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          owner_id?: string | null
          created_at?: string
        }
      }
      office_members: {
        Row: {
          id: string
          office_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          office_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          office_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          office_id: string
          type: string
          name: string
          cpf_cnpj: string | null
          rg: string | null
          birth_date: string | null
          email: string | null
          phone: string | null
          whatsapp: string | null
          address: string | null
          city: string | null
          state: string | null
          cep: string | null
          notes: string | null
          portal_access: boolean
          portal_password_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          office_id: string
          type: string
          name: string
          cpf_cnpj?: string | null
          rg?: string | null
          birth_date?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          cep?: string | null
          notes?: string | null
          portal_access?: boolean
          portal_password_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          office_id?: string
          type?: string
          name?: string
          cpf_cnpj?: string | null
          rg?: string | null
          birth_date?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          cep?: string | null
          notes?: string | null
          portal_access?: boolean
          portal_password_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          office_id: string
          client_id: string | null
          case_number: string | null
          court: string | null
          court_type: string | null
          state: string | null
          area: string | null
          subject: string | null
          value: number | null
          status: string
          client_role: string | null
          opposing_party: string | null
          opposing_lawyer: string | null
          opposing_oab: string | null
          filing_date: string | null
          last_movement_date: string | null
          next_deadline: string | null
          monitoring_enabled: boolean
          monitoring_source: string | null
          external_id: string | null
          notes: string | null
          created_by: string | null
          responsible_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          office_id: string
          client_id?: string | null
          case_number?: string | null
          court?: string | null
          court_type?: string | null
          state?: string | null
          area?: string | null
          subject?: string | null
          value?: number | null
          status?: string
          client_role?: string | null
          opposing_party?: string | null
          opposing_lawyer?: string | null
          opposing_oab?: string | null
          filing_date?: string | null
          last_movement_date?: string | null
          next_deadline?: string | null
          monitoring_enabled?: boolean
          monitoring_source?: string | null
          external_id?: string | null
          notes?: string | null
          created_by?: string | null
          responsible_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          office_id?: string
          client_id?: string | null
          case_number?: string | null
          court?: string | null
          court_type?: string | null
          state?: string | null
          area?: string | null
          subject?: string | null
          value?: number | null
          status?: string
          client_role?: string | null
          opposing_party?: string | null
          opposing_lawyer?: string | null
          opposing_oab?: string | null
          filing_date?: string | null
          last_movement_date?: string | null
          next_deadline?: string | null
          monitoring_enabled?: boolean
          monitoring_source?: string | null
          external_id?: string | null
          notes?: string | null
          created_by?: string | null
          responsible_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calculations: {
        Row: {
          id: string
          office_id: string
          user_id: string | null
          case_id: string | null
          type: string
          name: string | null
          input_data: Json
          output_data: Json
          breakdown: Json | null
          indices_used: Json | null
          pdf_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          office_id: string
          user_id?: string | null
          case_id?: string | null
          type: string
          name?: string | null
          input_data: Json
          output_data: Json
          breakdown?: Json | null
          indices_used?: Json | null
          pdf_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          office_id?: string
          user_id?: string | null
          case_id?: string | null
          type?: string
          name?: string | null
          input_data?: Json
          output_data?: Json
          breakdown?: Json | null
          indices_used?: Json | null
          pdf_path?: string | null
          created_at?: string
        }
      }
      economic_indices: {
        Row: {
          id: string
          type: string
          reference_date: string
          value: number
          accumulated_12m: number | null
          accumulated_year: number | null
          source: string | null
          fetched_at: string
        }
        Insert: {
          id?: string
          type: string
          reference_date: string
          value: number
          accumulated_12m?: number | null
          accumulated_year?: number | null
          source?: string | null
          fetched_at?: string
        }
        Update: {
          id?: string
          type?: string
          reference_date?: string
          value?: number
          accumulated_12m?: number | null
          accumulated_year?: number | null
          source?: string | null
          fetched_at?: string
        }
      }
      minimum_wages: {
        Row: {
          id: string
          start_date: string
          end_date: string | null
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          start_date: string
          end_date?: string | null
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          start_date?: string
          end_date?: string | null
          value?: number
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          reference_type: string | null
          reference_id: string | null
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          reference_type?: string | null
          reference_id?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          reference_type?: string | null
          reference_id?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
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
  }
}
