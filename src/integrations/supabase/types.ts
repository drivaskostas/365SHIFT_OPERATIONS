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
      alert_settings: {
        Row: {
          api_endpoint: string
          api_key: string | null
          created_at: string
          id: number
          provider: string
          refresh_interval: number
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_endpoint?: string
          api_key?: string | null
          created_at?: string
          id?: number
          provider?: string
          refresh_interval?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_endpoint?: string
          api_key?: string | null
          created_at?: string
          id?: number
          provider?: string
          refresh_interval?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_name: string
          key_value: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_name: string
          key_value: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_name?: string
          key_value?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_submissions: {
        Row: {
          created_at: string | null
          data: Json
          form_id: string
          id: string
          submitted_at: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          form_id: string
          id?: string
          submitted_at?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          form_id?: string
          id?: string
          submitted_at?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          content: string | null
          id: string
          image_url: string | null
          status: string | null
          submitted_at: string
          submitted_by: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_teams: {
        Row: {
          created_at: string
          guard_id: string
          id: string
          role: string
          shift_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guard_id: string
          id?: string
          role?: string
          shift_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guard_id?: string
          id?: string
          role?: string
          shift_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_teams_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_teams_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_signups: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          error_message: string | null
          first_name: string
          id: string
          last_name: string
          mobile_phone: string | null
          password: string
          processed_at: string | null
          processed_by: string | null
          status: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          first_name: string
          id?: string
          last_name: string
          mobile_phone?: string | null
          password: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          first_name?: string
          id?: string
          last_name?: string
          mobile_phone?: string | null
          password?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      client_teams: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          team_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_teams_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clock_in_out: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string | null
          id: string
          status: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          id?: string
          status?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          id?: string
          status?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clock_in_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_report_history: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_status: string | null
          note: string | null
          previous_status: string | null
          report_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          previous_status?: string | null
          report_id: string
          user_id: string
          user_name: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          previous_status?: string | null
          report_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_report_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "emergency_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_reports: {
        Row: {
          created_at: string
          description: string | null
          guard_id: string
          guard_name: string | null
          id: string
          image_url: string | null
          incident_time: string | null
          involved_persons: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: Json | null
          patrol_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          guard_id: string
          guard_name?: string | null
          id?: string
          image_url?: string | null
          incident_time?: string | null
          involved_persons?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: Json | null
          patrol_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          guard_id?: string
          guard_name?: string | null
          id?: string
          image_url?: string | null
          incident_time?: string | null
          involved_persons?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: Json | null
          patrol_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          base_price: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      guard_equipment: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          equipment_id: string
          guard_id: string
          id: string
          notes: string | null
          quantity: number
          returned_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          equipment_id: string
          guard_id: string
          id?: string
          notes?: string | null
          quantity?: number
          returned_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          equipment_id?: string
          guard_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          returned_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_equipment_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_equipment_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_locations: {
        Row: {
          accuracy: number | null
          created_at: string | null
          guard_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          on_duty: boolean
          patrol_id: string | null
          speed: number | null
          tracking_type: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          guard_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          on_duty?: boolean
          patrol_id?: string | null
          speed?: number | null
          tracking_type?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          guard_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          on_duty?: boolean
          patrol_id?: string | null
          speed?: number | null
          tracking_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guard_upcoming_shifts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          created_at: string
          guard_id: string
          id: string
          location: string | null
          schedule_id: string
          shift_end_time: string
          shift_start_time: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          created_at?: string
          guard_id: string
          id?: string
          location?: string | null
          schedule_id: string
          shift_end_time: string
          shift_start_time: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          created_at?: string
          guard_id?: string
          id?: string
          location?: string | null
          schedule_id?: string
          shift_end_time?: string
          shift_start_time?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      guard_work_stats: {
        Row: {
          calculation_date: string
          guard_id: string
          holiday_hours: number
          id: string
          month_date: string
          monthly_data: Json
          night_hours: number
          overtime_hours: number
          previous_year_leave: number
          regular_hours: number
          regular_leave: number
          sick_leave: number
          total_shifts: number
        }
        Insert: {
          calculation_date?: string
          guard_id: string
          holiday_hours?: number
          id?: string
          month_date: string
          monthly_data?: Json
          night_hours?: number
          overtime_hours?: number
          previous_year_leave?: number
          regular_hours?: number
          regular_leave?: number
          sick_leave?: number
          total_shifts?: number
        }
        Update: {
          calculation_date?: string
          guard_id?: string
          holiday_hours?: number
          id?: string
          month_date?: string
          monthly_data?: Json
          night_hours?: number
          overtime_hours?: number
          previous_year_leave?: number
          regular_hours?: number
          regular_leave?: number
          sick_leave?: number
          total_shifts?: number
        }
        Relationships: [
          {
            foreignKeyName: "guard_work_stats_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_checkpoints: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string
          name: string
          site_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location: string
          name: string
          site_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string
          name?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_checkpoints_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_geocodes: {
        Row: {
          address: string | null
          created_at: string | null
          error_message: string | null
          formatted_address: string | null
          geocode_status: string
          guardian_id: string
          id: string
          latitude: number | null
          longitude: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          error_message?: string | null
          formatted_address?: string | null
          geocode_status?: string
          guardian_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          error_message?: string | null
          formatted_address?: string | null
          geocode_status?: string
          guardian_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_geocodes_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_geofence_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          guard_id: string
          id: string
          location_data: Json
          site_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          guard_id: string
          id?: string
          location_data: Json
          site_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          guard_id?: string
          id?: string
          location_data?: Json
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_geofence_alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_sites: {
        Row: {
          active: boolean | null
          address: string
          created_at: string
          created_by: string
          description: string | null
          geofence_radius: number | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          team_id: string
        }
        Insert: {
          active?: boolean | null
          address: string
          created_at?: string
          created_by: string
          description?: string | null
          geofence_radius?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          team_id: string
        }
        Update: {
          active?: boolean | null
          address?: string
          created_at?: string
          created_by?: string
          description?: string | null
          geofence_radius?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_sites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          address: string | null
          area: string
          coordinates: Json | null
          created_at: string
          custom_id: string | null
          date_of_birth: string | null
          id: string
          landline: string | null
          last_upload_date: string | null
          municipality: string
          name: string
          parent_name: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          suburb: string
          surname: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string
          coordinates?: Json | null
          created_at?: string
          custom_id?: string | null
          date_of_birth?: string | null
          id?: string
          landline?: string | null
          last_upload_date?: string | null
          municipality?: string
          name: string
          parent_name?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          suburb?: string
          surname: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string
          coordinates?: Json | null
          created_at?: string
          custom_id?: string | null
          date_of_birth?: string | null
          id?: string
          landline?: string | null
          last_upload_date?: string | null
          municipality?: string
          name?: string
          parent_name?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          suburb?: string
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      guardians_backup: {
        Row: {
          address: string | null
          area: string | null
          coordinates: Json | null
          created_at: string | null
          date_of_birth: string | null
          id: string | null
          landline: string | null
          last_upload_date: string | null
          municipality: string | null
          name: string | null
          parent_name: string | null
          phone: string | null
          postal_code: string | null
          suburb: string | null
          surname: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          coordinates?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string | null
          landline?: string | null
          last_upload_date?: string | null
          municipality?: string | null
          name?: string | null
          parent_name?: string | null
          phone?: string | null
          postal_code?: string | null
          suburb?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          coordinates?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string | null
          landline?: string | null
          last_upload_date?: string | null
          municipality?: string | null
          name?: string | null
          parent_name?: string | null
          phone?: string | null
          postal_code?: string | null
          suburb?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      holiday_hourly_costs: {
        Row: {
          cost_per_hour: number
          created_at: string | null
          id: string
          triennia: number
          updated_at: string | null
        }
        Insert: {
          cost_per_hour: number
          created_at?: string | null
          id?: string
          triennia: number
          updated_at?: string | null
        }
        Update: {
          cost_per_hour?: number
          created_at?: string | null
          id?: string
          triennia?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string
          date: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      hourly_costs: {
        Row: {
          cost_per_hour: number
          created_at: string | null
          id: string
          triennia: number
          updated_at: string | null
        }
        Insert: {
          cost_per_hour: number
          created_at?: string | null
          id?: string
          triennia: number
          updated_at?: string | null
        }
        Update: {
          cost_per_hour?: number
          created_at?: string | null
          id?: string
          triennia?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      jotform_configs: {
        Row: {
          api_key: string
          created_at: string
          form_categories: Json
          form_ids: string[]
          id: string
          is_eu_account: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          form_categories?: Json
          form_ids?: string[]
          id?: string
          is_eu_account?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          form_categories?: Json
          form_ids?: string[]
          id?: string
          is_eu_account?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          content: string | null
          created_at: string | null
          end_date: string
          id: string
          start_date: string
          status: string
          team_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: string
          team_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          team_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          attachment_url: string | null
          category: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          category: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      night_hourly_costs: {
        Row: {
          cost_per_hour: number
          created_at: string | null
          id: string
          triennia: number
          updated_at: string | null
        }
        Insert: {
          cost_per_hour: number
          created_at?: string | null
          id?: string
          triennia: number
          updated_at?: string | null
        }
        Update: {
          cost_per_hour?: number
          created_at?: string | null
          id?: string
          triennia?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          created_by: string | null
          email_enabled: boolean | null
          enabled: boolean
          id: string
          language: string | null
          minutes_before: number
          push_enabled: boolean | null
          send_email: boolean
          send_push: boolean
          sms_enabled: boolean | null
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_enabled?: boolean | null
          enabled?: boolean
          id?: string
          language?: string | null
          minutes_before?: number
          push_enabled?: boolean | null
          send_email?: boolean
          send_push?: boolean
          sms_enabled?: boolean | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_enabled?: boolean | null
          enabled?: boolean
          id?: string
          language?: string | null
          minutes_before?: number
          push_enabled?: boolean | null
          send_email?: boolean
          send_push?: boolean
          sms_enabled?: boolean | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          message_id: string | null
          read: boolean
          team_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          read?: boolean
          team_id?: string | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          read?: boolean
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          channel: string
          error_message: string | null
          guard_id: string
          id: string
          shift_id: string
          status: string
          timestamp_sent: string
          type: string
        }
        Insert: {
          channel: string
          error_message?: string | null
          guard_id: string
          id?: string
          shift_id: string
          status: string
          timestamp_sent?: string
          type: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          guard_id?: string
          id?: string
          shift_id?: string
          status?: string
          timestamp_sent?: string
          type?: string
        }
        Relationships: []
      }
      patrol_alerts: {
        Row: {
          alert_type: string
          checkpoint_id: string | null
          created_at: string | null
          description: string
          id: string
          latitude: number | null
          longitude: number | null
          patrol_id: string
          resolved: boolean | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          checkpoint_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          patrol_id: string
          resolved?: boolean | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          checkpoint_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          patrol_id?: string
          resolved?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_alerts_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "guardian_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_alerts_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "patrol_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_checkpoint_visits: {
        Row: {
          checkpoint_id: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          patrol_id: string
          status: string
          timestamp: string
        }
        Insert: {
          checkpoint_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          patrol_id: string
          status: string
          timestamp?: string
        }
        Update: {
          checkpoint_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          patrol_id?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_checkpoint_visits_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "guardian_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_checkpoint_visits_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "patrol_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_incidents: {
        Row: {
          checkpoint_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          patrol_id: string
          severity: string
          status: string
          timestamp: string
          title: string
          updated_at: string
        }
        Insert: {
          checkpoint_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          patrol_id: string
          severity: string
          status: string
          timestamp?: string
          title: string
          updated_at?: string
        }
        Update: {
          checkpoint_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          patrol_id?: string
          severity?: string
          status?: string
          timestamp?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_incidents_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "guardian_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_incidents_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "patrol_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_observations: {
        Row: {
          created_at: string | null
          description: string | null
          guard_id: string
          guard_name: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          notes: Json | null
          patrol_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string
          team_id: string | null
          timestamp: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          guard_id: string
          guard_name?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: Json | null
          patrol_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string
          team_id?: string | null
          timestamp?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          guard_id?: string
          guard_name?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: Json | null
          patrol_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string
          team_id?: string | null
          timestamp?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_observations_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "patrol_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_observations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_preferences: {
        Row: {
          checkpoint_notify: boolean
          continue_in_background: boolean
          created_at: string
          enforce_sequence: boolean
          id: string
          max_checkpoint_time: number
          min_time_between_checkpoints: number
          missed_checkpoint_alert: boolean
          notification_recipients: string[] | null
          patrol_completion_alert: boolean
          patrol_completion_target: number
          pattern_type: string
          priority_checkpoints: string[] | null
          site_id: string
          track_guard_movement: boolean
          tracking_accuracy: string
          tracking_interval: number
          updated_at: string
        }
        Insert: {
          checkpoint_notify?: boolean
          continue_in_background?: boolean
          created_at?: string
          enforce_sequence?: boolean
          id?: string
          max_checkpoint_time?: number
          min_time_between_checkpoints?: number
          missed_checkpoint_alert?: boolean
          notification_recipients?: string[] | null
          patrol_completion_alert?: boolean
          patrol_completion_target?: number
          pattern_type?: string
          priority_checkpoints?: string[] | null
          site_id: string
          track_guard_movement?: boolean
          tracking_accuracy?: string
          tracking_interval?: number
          updated_at?: string
        }
        Update: {
          checkpoint_notify?: boolean
          continue_in_background?: boolean
          created_at?: string
          enforce_sequence?: boolean
          id?: string
          max_checkpoint_time?: number
          min_time_between_checkpoints?: number
          missed_checkpoint_alert?: boolean
          notification_recipients?: string[] | null
          patrol_completion_alert?: boolean
          patrol_completion_target?: number
          pattern_type?: string
          priority_checkpoints?: string[] | null
          site_id?: string
          track_guard_movement?: boolean
          tracking_accuracy?: string
          tracking_interval?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_preferences_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          guard_id: string
          id: string
          latitude: number | null
          longitude: number | null
          site_id: string
          start_time: string
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          guard_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          site_id: string
          start_time?: string
          status: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          guard_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          site_id?: string
          start_time?: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_sessions_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_sessions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          afm: string | null
          avatar_url: string | null
          code: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          first_name: string | null
          full_name: string | null
          hiring_date: string | null
          id: string
          last_name: string | null
          license_expiry_date: string | null
          mobile_phone: string | null
          Role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          triennia: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          afm?: string | null
          avatar_url?: string | null
          code?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          full_name?: string | null
          hiring_date?: string | null
          id: string
          last_name?: string | null
          license_expiry_date?: string | null
          mobile_phone?: string | null
          Role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          triennia?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          afm?: string | null
          avatar_url?: string | null
          code?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          full_name?: string | null
          hiring_date?: string | null
          id?: string
          last_name?: string | null
          license_expiry_date?: string | null
          mobile_phone?: string | null
          Role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          triennia?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      program_settings: {
        Row: {
          id: string
          month_settings: Json | null
          updated_at: string
          updated_by: string
          visible: boolean | null
        }
        Insert: {
          id: string
          month_settings?: Json | null
          updated_at?: string
          updated_by: string
          visible?: boolean | null
        }
        Update: {
          id?: string
          month_settings?: Json | null
          updated_at?: string
          updated_by?: string
          visible?: boolean | null
        }
        Relationships: []
      }
      report_submissions: {
        Row: {
          content: string | null
          id: string
          image_url: string | null
          status: string | null
          submitted_at: string
          submitted_by: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: string | null
          id: string
          image_url: string | null
          status: string | null
          submitted_at: string
          submitted_by: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          image_url?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_alerts: {
        Row: {
          alert_message: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          content: string
          created_at: string
          guard_id: string | null
          hours_scheduled: number | null
          id: string
          is_resolved: boolean | null
          other_team_hours: Json | null
          resolved_by: string | null
          resolved_by_name: string | null
          team_id: string | null
          team_name: string | null
          total_hours: number | null
          updated_at: string
          week_start_date: string
        }
        Insert: {
          alert_message?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          content: string
          created_at?: string
          guard_id?: string | null
          hours_scheduled?: number | null
          id?: string
          is_resolved?: boolean | null
          other_team_hours?: Json | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          team_id?: string | null
          team_name?: string | null
          total_hours?: number | null
          updated_at?: string
          week_start_date: string
        }
        Update: {
          alert_message?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          content?: string
          created_at?: string
          guard_id?: string | null
          hours_scheduled?: number | null
          id?: string
          is_resolved?: boolean | null
          other_team_hours?: Json | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          team_id?: string | null
          team_name?: string | null
          total_hours?: number | null
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_alerts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_backups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_automated: boolean | null
          schedules: Json
          team_id: string
          timestamp: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_automated?: boolean | null
          schedules: Json
          team_id: string
          timestamp: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_automated?: boolean | null
          schedules?: Json
          team_id?: string
          timestamp?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_backups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      service_accounts: {
        Row: {
          api_key: string
          created_at: string
          id: string
          name: string
          permissions: string[] | null
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          name: string
          permissions?: string[] | null
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          name?: string
          permissions?: string[] | null
        }
        Relationships: []
      }
      shared_submission_links: {
        Row: {
          created_at: string
          created_by: string
          expiry_date: string | null
          form_id: string
          id: string
          is_active: boolean
          name: string
          password: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expiry_date?: string | null
          form_id: string
          id?: string
          is_active?: boolean
          name: string
          password?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expiry_date?: string | null
          form_id?: string
          id?: string
          is_active?: boolean
          name?: string
          password?: string | null
        }
        Relationships: []
      }
      shift_changes: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          change_type: Database["public"]["Enums"]["shift_change_type"]
          created_at: string
          created_by: string | null
          guard_id: string
          id: string
          new_data: Json | null
          previous_data: Json | null
          schedule_id: string | null
          team_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          change_type: Database["public"]["Enums"]["shift_change_type"]
          created_at?: string
          created_by?: string | null
          guard_id: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          schedule_id?: string | null
          team_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          change_type?: Database["public"]["Enums"]["shift_change_type"]
          created_at?: string
          created_by?: string | null
          guard_id?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          schedule_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_changes_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_changes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "team_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_changes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_notifications: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          email_sent_at: string | null
          guard_id: string
          id: string
          notification_status: string
          push_sent_at: string | null
          schedule_id: string
          shift_start_time: string
          team_id: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          email_sent_at?: string | null
          guard_id: string
          id?: string
          notification_status?: string
          push_sent_at?: string | null
          schedule_id: string
          shift_start_time: string
          team_id: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          email_sent_at?: string | null
          guard_id?: string
          id?: string
          notification_status?: string
          push_sent_at?: string | null
          schedule_id?: string
          shift_start_time?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_notifications_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "team_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          schedule_data: Json
          team_id: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          schedule_data: Json
          team_id: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          schedule_data?: Json
          team_id?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          location: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          location: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          location?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_guards: {
        Row: {
          assigned_at: string
          guard_id: string
          id: string
          site_id: string
        }
        Insert: {
          assigned_at?: string
          guard_id: string
          id?: string
          site_id: string
        }
        Update: {
          assigned_at?: string
          guard_id?: string
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_guards_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_guards_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_notification_settings: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string | null
          notify_for_severity: string[] | null
          role: string
          site_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notify_for_severity?: string[] | null
          role?: string
          site_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notify_for_severity?: string[] | null
          role?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_notification_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      team_equipment: {
        Row: {
          assigned_at: string
          assigned_by: string
          base_price: number | null
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          quantity: number
          returned_at: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          base_price?: number | null
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          quantity?: number
          returned_at?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          base_price?: number | null
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          returned_at?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_equipment_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "team_equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_equipment_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_equipment_types: {
        Row: {
          base_price: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_incident_links: {
        Row: {
          created_at: string
          id: string
          link_url: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_url: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link_url?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_incident_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          profile_id: string
          role: string | null
          team_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          profile_id: string
          role?: string | null
          team_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          profile_id?: string
          role?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          team_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          team_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_schedules: {
        Row: {
          assigned_guards: string[] | null
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          location: string | null
          source_date: string | null
          start_date: string
          target_date: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_guards?: string[] | null
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          location?: string | null
          source_date?: string | null
          start_date: string
          target_date?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_guards?: string[] | null
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          location?: string | null
          source_date?: string | null
          start_date?: string
          target_date?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_schedules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      week_visibility: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean
          team_id: string
          updated_at: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean
          team_id: string
          updated_at?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean
          team_id?: string
          updated_at?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_visibility_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_shift_notification: {
        Args: { notification_id: string }
        Returns: boolean
      }
      acknowledge_upcoming_shift: {
        Args: { shift_id: string }
        Returns: boolean
      }
      add_guard_upcoming_shifts_constraint: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_if_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_service_account: {
        Args: { p_name: string; p_api_key: string }
        Returns: {
          api_key: string
          created_at: string
          id: string
          name: string
          permissions: string[] | null
        }
      }
      delete_service_account: {
        Args: { p_id: string }
        Returns: boolean
      }
      disable_team_welcome_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_team_welcome_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_template_comparison_alerts: {
        Args: { p_start_date: string; p_team_id?: string }
        Returns: number
      }
      generate_uuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_patrols_with_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          site_id: string
          guard_id: string
          start_time: string
          end_time: string
          status: string
          site_name: string
          guard_first_name: string
          guard_last_name: string
          guard_avatar_url: string
        }[]
      }
      get_geocoding_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_guardians: number
          with_address: number
          without_address: number
          with_coordinates: number
          without_coordinates: number
          pending_geocodes: number
          successful_geocodes: number
          failed_geocodes: number
          processing_geocodes: number
        }[]
      }
      get_guard_productivity_metrics: {
        Args: {
          p_guard_id?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          guard_id: string
          guard_name: string
          total_patrols: number
          completed_patrols: number
          total_patrol_hours: number
          avg_patrol_duration_minutes: number
          total_checkpoints_visited: number
          avg_checkpoints_per_patrol: number
          total_incidents_reported: number
          avg_incidents_per_patrol: number
          response_efficiency_score: number
          on_time_percentage: number
        }[]
      }
      get_pending_shift_notifications: {
        Args: { minutes_ahead?: number }
        Returns: {
          id: string
          team_id: string
          schedule_id: string
          guard_id: string
          shift_start_time: string
          guard_email: string
          guard_name: string
          shift_title: string
        }[]
      }
      get_service_accounts: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_key: string
          created_at: string
          id: string
          name: string
          permissions: string[] | null
        }[]
      }
      get_team_members: {
        Args: { team_id: string }
        Returns: {
          profile_id: string
        }[]
      }
      get_team_members_with_profiles: {
        Args: { team_id_param: string }
        Returns: {
          member_id: string
          profile_id: string
          first_name: string
          last_name: string
          full_name: string
        }[]
      }
      get_team_name: {
        Args: { team_id_param: string }
        Returns: string
      }
      get_user_notifications_direct: {
        Args: { p_user_id?: string }
        Returns: {
          body: string | null
          created_at: string
          id: string
          message_id: string | null
          read: boolean
          team_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }[]
      }
      get_user_roles: {
        Args: { p_user_id?: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_team_ids: {
        Args: { user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      has_role: {
        Args:
          | { user_id: string; _role: Database["public"]["Enums"]["app_role"] }
          | { user_id: string; _role: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_client_for_team: {
        Args: { team_id: string; user_id?: string }
        Returns: boolean
      }
      is_client_for_team_mission: {
        Args: { mission_team_id: string; current_user_id?: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { team_id: string } | { team_id: string; user_id?: string }
        Returns: boolean
      }
      is_valid_url: {
        Args: { url: string }
        Returns: boolean
      }
      mark_notification_read_direct: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      regenerate_api_key: {
        Args: { p_id: string; p_new_key: string }
        Returns: boolean
      }
      schedule_shift_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_leave_request_status: {
        Args: { request_id: string; new_status: string }
        Returns: boolean
      }
      update_notification_status: {
        Args: {
          notification_id: string
          new_status: string
          push_sent?: boolean
          email_sent?: boolean
        }
        Returns: boolean
      }
      upsert_device_token: {
        Args: { p_user_id: string; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      alert_type:
        | "insufficient_hours"
        | "missing_guard"
        | "night_morning_shift"
        | "insufficient_rest"
        | "visibility_status"
        | "unassigned_schedule"
        | "missing_template_shifts"
        | "early_checkout"
      app_role: "admin" | "guard" | "client" | "super_admin" | "guardian"
      equipment_status: "active" | "archived" | "inactive"
      patrol_status: "active" | "completed" | "interrupted" | "leave_tracking"
      shift_change_type: "added" | "removed" | "modified"
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
      alert_type: [
        "insufficient_hours",
        "missing_guard",
        "night_morning_shift",
        "insufficient_rest",
        "visibility_status",
        "unassigned_schedule",
        "missing_template_shifts",
        "early_checkout",
      ],
      app_role: ["admin", "guard", "client", "super_admin", "guardian"],
      equipment_status: ["active", "archived", "inactive"],
      patrol_status: ["active", "completed", "interrupted", "leave_tracking"],
      shift_change_type: ["added", "removed", "modified"],
    },
  },
} as const
