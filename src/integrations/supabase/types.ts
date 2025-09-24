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
      assessment_forms: {
        Row: {
          created_at: string | null
          created_by: string | null
          description_el: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          module_id: string
          pass_percentage: number
          title_el: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description_el?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          pass_percentage?: number
          title_el: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description_el?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          pass_percentage?: number
          title_el?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          created_at: string | null
          form_id: string
          id: string
          options: Json
          order_index: number
          points: number
          question_el: string
          question_en: string
          question_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          form_id: string
          id?: string
          options: Json
          order_index: number
          points?: number
          question_el: string
          question_en: string
          question_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          form_id?: string
          id?: string
          options?: Json
          order_index?: number
          points?: number
          question_el?: string
          question_en?: string
          question_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_responses: {
        Row: {
          created_at: string | null
          form_id: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_answers: string[]
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          form_id: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_answers?: string[]
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          form_id?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_answers?: string[]
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "assessment_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          attempt_number: number | null
          can_retake: boolean | null
          completed_at: string | null
          created_at: string | null
          form_id: string
          id: string
          max_points: number
          passed: boolean
          percentage_score: number
          started_at: string | null
          status: string | null
          time_spent_seconds: number | null
          total_points: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          can_retake?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          form_id: string
          id?: string
          max_points?: number
          passed?: boolean
          percentage_score?: number
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          total_points?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          can_retake?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          form_id?: string
          id?: string
          max_points?: number
          passed?: boolean
          percentage_score?: number
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          total_points?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "assessment_forms"
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
            foreignKeyName: "assigned_teams_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
      behavior_records: {
        Row: {
          behavior_type_id: string
          created_at: string | null
          description: string | null
          evidence: string | null
          guard_id: string
          id: string
          incident_date: string
          notes: Json | null
          recorded_by: string
          score_applied: number
          status: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          behavior_type_id: string
          created_at?: string | null
          description?: string | null
          evidence?: string | null
          guard_id: string
          id?: string
          incident_date?: string
          notes?: Json | null
          recorded_by: string
          score_applied?: number
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          behavior_type_id?: string
          created_at?: string | null
          description?: string | null
          evidence?: string | null
          guard_id?: string
          id?: string
          incident_date?: string
          notes?: Json | null
          recorded_by?: string
          score_applied?: number
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_records_behavior_type_id_fkey"
            columns: ["behavior_type_id"]
            isOneToOne: false
            referencedRelation: "behavior_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
          {
            foreignKeyName: "behavior_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
          {
            foreignKeyName: "behavior_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_types: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          score_impact: number
          updated_at: string | null
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          score_impact?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          score_impact?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      candidate_evaluations: {
        Row: {
          additional_notes: string | null
          candidate_id: string
          communication_skills: number | null
          created_at: string
          evaluation_type: string
          evaluator_id: string | null
          experience_relevance: number | null
          id: string
          interview_id: string | null
          overall_impression: number | null
          physical_fitness: number | null
          problem_solving: number | null
          professionalism: number | null
          reliability_assessment: number | null
          strengths: string | null
          technical_knowledge: number | null
          weaknesses: string | null
        }
        Insert: {
          additional_notes?: string | null
          candidate_id: string
          communication_skills?: number | null
          created_at?: string
          evaluation_type: string
          evaluator_id?: string | null
          experience_relevance?: number | null
          id?: string
          interview_id?: string | null
          overall_impression?: number | null
          physical_fitness?: number | null
          problem_solving?: number | null
          professionalism?: number | null
          reliability_assessment?: number | null
          strengths?: string | null
          technical_knowledge?: number | null
          weaknesses?: string | null
        }
        Update: {
          additional_notes?: string | null
          candidate_id?: string
          communication_skills?: number | null
          created_at?: string
          evaluation_type?: string
          evaluator_id?: string | null
          experience_relevance?: number | null
          id?: string
          interview_id?: string | null
          overall_impression?: number | null
          physical_fitness?: number | null
          problem_solving?: number | null
          professionalism?: number | null
          reliability_assessment?: number | null
          strengths?: string | null
          technical_knowledge?: number | null
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_evaluations_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address: string | null
          application_date: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          identity_number: string | null
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          status: string
          suburbs: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          application_date?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          identity_number?: string | null
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: string
          suburbs?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          application_date?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          identity_number?: string | null
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: string
          suburbs?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          background_image: string | null
          canvas_data: Json
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          preview_url: string | null
          updated_at: string
        }
        Insert: {
          background_image?: string | null
          canvas_data: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          preview_url?: string | null
          updated_at?: string
        }
        Update: {
          background_image?: string | null
          canvas_data?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          preview_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkpoint_groups: {
        Row: {
          color: string | null
          completion_percentage_required: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_required: boolean | null
          name: string
          order_index: number | null
          site_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          completion_percentage_required?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          order_index?: number | null
          site_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          completion_percentage_required?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          order_index?: number | null
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_groups_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_evaluations: {
        Row: {
          additional_comments: string | null
          client_id: string
          communication_score: number | null
          company_representation_score: number | null
          created_at: string | null
          evaluation_period: string
          evaluation_year: number
          guard_id: string
          id: string
          improvement_suggestions: string | null
          overall_satisfaction: number | null
          positive_feedback: string | null
          professionalism_score: number | null
          punctuality_score: number | null
          quality_of_service_score: number | null
          reliability_score: number | null
          submitted_at: string | null
          team_id: string
          updated_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          additional_comments?: string | null
          client_id: string
          communication_score?: number | null
          company_representation_score?: number | null
          created_at?: string | null
          evaluation_period: string
          evaluation_year?: number
          guard_id: string
          id?: string
          improvement_suggestions?: string | null
          overall_satisfaction?: number | null
          positive_feedback?: string | null
          professionalism_score?: number | null
          punctuality_score?: number | null
          quality_of_service_score?: number | null
          reliability_score?: number | null
          submitted_at?: string | null
          team_id: string
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          additional_comments?: string | null
          client_id?: string
          communication_score?: number | null
          company_representation_score?: number | null
          created_at?: string | null
          evaluation_period?: string
          evaluation_year?: number
          guard_id?: string
          id?: string
          improvement_suggestions?: string | null
          overall_satisfaction?: number | null
          positive_feedback?: string | null
          professionalism_score?: number | null
          punctuality_score?: number | null
          quality_of_service_score?: number | null
          reliability_score?: number | null
          submitted_at?: string | null
          team_id?: string
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_evaluations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_evaluations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
          {
            foreignKeyName: "client_evaluations_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_evaluations_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
          {
            foreignKeyName: "client_evaluations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            foreignKeyName: "client_teams_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
          auto_checkout: boolean | null
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
          auto_checkout?: boolean | null
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
          auto_checkout?: boolean | null
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
      cognitive_test_items: {
        Row: {
          cognitive_domain: string
          correct_answer: number
          created_at: string | null
          difficulty_level: number | null
          discrimination_index: number | null
          id: string
          options: Json
          question_text: string
          requires_reverse_scoring: boolean | null
          scoring_weight: number | null
          subtest: string | null
          test_type: string
          time_limit_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          cognitive_domain: string
          correct_answer: number
          created_at?: string | null
          difficulty_level?: number | null
          discrimination_index?: number | null
          id?: string
          options: Json
          question_text: string
          requires_reverse_scoring?: boolean | null
          scoring_weight?: number | null
          subtest?: string | null
          test_type: string
          time_limit_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          cognitive_domain?: string
          correct_answer?: number
          created_at?: string | null
          difficulty_level?: number | null
          discrimination_index?: number | null
          id?: string
          options?: Json
          question_text?: string
          requires_reverse_scoring?: boolean | null
          scoring_weight?: number | null
          subtest?: string | null
          test_type?: string
          time_limit_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cognitive_test_norms: {
        Row: {
          age_group: string
          created_at: string | null
          education_level: string
          id: string
          percentile_conversion: Json | null
          raw_score_mean: number | null
          raw_score_std: number | null
          t_score_conversion: Json | null
          test_type: string
        }
        Insert: {
          age_group: string
          created_at?: string | null
          education_level: string
          id?: string
          percentile_conversion?: Json | null
          raw_score_mean?: number | null
          raw_score_std?: number | null
          t_score_conversion?: Json | null
          test_type: string
        }
        Update: {
          age_group?: string
          created_at?: string | null
          education_level?: string
          id?: string
          percentile_conversion?: Json | null
          raw_score_mean?: number | null
          raw_score_std?: number | null
          t_score_conversion?: Json | null
          test_type?: string
        }
        Relationships: []
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
      email_deliverability: {
        Row: {
          created_at: string | null
          email_id: string
          event_data: Json | null
          event_type: string
          id: string
          occurred_at: string
          recipient_email: string
          reference_id: string | null
          reference_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          occurred_at: string
          recipient_email: string
          reference_id?: string | null
          reference_type?: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string
          recipient_email?: string
          reference_id?: string | null
          reference_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          from_email: string
          from_name: string
          html_content: string
          id: string
          notification_type: string
          recipient_email: string
          reference_id: string | null
          sent_at: string | null
          site_id: string | null
          status: string | null
          subject: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          from_email?: string
          from_name?: string
          html_content: string
          id?: string
          notification_type: string
          recipient_email: string
          reference_id?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string | null
          subject: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          from_email?: string
          from_name?: string
          html_content?: string
          id?: string
          notification_type?: string
          recipient_email?: string
          reference_id?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string | null
          subject?: string
          team_id?: string | null
          updated_at?: string | null
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
          email_id: string | null
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
          email_id?: string | null
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
          email_id?: string | null
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
      employee_awards: {
        Row: {
          award_period: string
          award_type: string
          awarded_at: string | null
          base_score: number
          created_at: string | null
          final_score: number
          guard_id: string
          id: string
          justification: string
          performance_breakdown: Json
          performance_grade: string
          rank_position: number
          total_candidates: number
        }
        Insert: {
          award_period: string
          award_type: string
          awarded_at?: string | null
          base_score: number
          created_at?: string | null
          final_score: number
          guard_id: string
          id?: string
          justification: string
          performance_breakdown: Json
          performance_grade: string
          rank_position?: number
          total_candidates: number
        }
        Update: {
          award_period?: string
          award_type?: string
          awarded_at?: string | null
          base_score?: number
          created_at?: string | null
          final_score?: number
          guard_id?: string
          id?: string
          justification?: string
          performance_breakdown?: Json
          performance_grade?: string
          rank_position?: number
          total_candidates?: number
        }
        Relationships: []
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
      guard_complaints: {
        Row: {
          complaint_date: string
          complaint_description: string
          complaint_title: string
          created_at: string
          guard_id: string
          guard_satisfied_with_resolution: boolean | null
          id: string
          resolution_notes: string | null
          resolution_timestamp: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          complaint_date?: string
          complaint_description: string
          complaint_title: string
          created_at?: string
          guard_id: string
          guard_satisfied_with_resolution?: boolean | null
          id?: string
          resolution_notes?: string | null
          resolution_timestamp?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          complaint_date?: string
          complaint_description?: string
          complaint_title?: string
          created_at?: string
          guard_id?: string
          guard_satisfied_with_resolution?: boolean | null
          id?: string
          resolution_notes?: string | null
          resolution_timestamp?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          team_id?: string | null
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
            foreignKeyName: "guard_equipment_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
          {
            foreignKeyName: "guard_equipment_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
        ]
      }
      guard_fatigue_levels: {
        Row: {
          created_at: string
          factors: string | null
          fatigue_level: number
          guard_id: string
          id: string
          shift_date: string
          shift_duration_hours: number | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          factors?: string | null
          fatigue_level: number
          guard_id: string
          id?: string
          shift_date?: string
          shift_duration_hours?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          factors?: string | null
          fatigue_level?: number
          guard_id?: string
          id?: string
          shift_date?: string
          shift_duration_hours?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          observation: string | null
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
          observation?: string | null
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
          observation?: string | null
          on_duty?: boolean
          patrol_id?: string | null
          speed?: number | null
          tracking_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guard_performance_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          badge_color: string | null
          badge_icon: string | null
          created_at: string
          earned_date: string
          evaluation_id: string | null
          guard_id: string
          id: string
          valid_until: string | null
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          earned_date?: string
          evaluation_id?: string | null
          guard_id: string
          id?: string
          valid_until?: string | null
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          earned_date?: string
          evaluation_id?: string | null
          guard_id?: string
          id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guard_performance_achievements_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "guard_performance_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_performance_achievements_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_performance_achievements_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
        ]
      }
      guard_performance_details: {
        Row: {
          baseline_value: number | null
          calculation_details: Json | null
          created_at: string
          evaluation_id: string
          id: string
          max_possible_points: number
          metric_name: string
          metric_type: Database["public"]["Enums"]["performance_metric_type"]
          performance_notes: string | null
          points_awarded: number
          raw_value: number | null
          target_value: number | null
        }
        Insert: {
          baseline_value?: number | null
          calculation_details?: Json | null
          created_at?: string
          evaluation_id: string
          id?: string
          max_possible_points?: number
          metric_name: string
          metric_type: Database["public"]["Enums"]["performance_metric_type"]
          performance_notes?: string | null
          points_awarded?: number
          raw_value?: number | null
          target_value?: number | null
        }
        Update: {
          baseline_value?: number | null
          calculation_details?: Json | null
          created_at?: string
          evaluation_id?: string
          id?: string
          max_possible_points?: number
          metric_name?: string
          metric_type?: Database["public"]["Enums"]["performance_metric_type"]
          performance_notes?: string | null
          points_awarded?: number
          raw_value?: number | null
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guard_performance_details_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "guard_performance_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_performance_evaluations: {
        Row: {
          assessment_score: number
          behavior_score: number
          client_evaluation_score: number
          created_at: string
          evaluated_by: string | null
          evaluation_period_end: string
          evaluation_period_start: string
          evaluation_status: string
          guard_id: string
          id: string
          notes: string | null
          overall_rank: number | null
          patrol_performance_score: number
          performance_grade:
            | Database["public"]["Enums"]["performance_grade"]
            | null
          punctuality_score: number
          supervisor_reports_score: number
          team_rank: number | null
          total_raw_score: number
          updated_at: string
          weighted_score: number
        }
        Insert: {
          assessment_score?: number
          behavior_score?: number
          client_evaluation_score?: number
          created_at?: string
          evaluated_by?: string | null
          evaluation_period_end: string
          evaluation_period_start: string
          evaluation_status?: string
          guard_id: string
          id?: string
          notes?: string | null
          overall_rank?: number | null
          patrol_performance_score?: number
          performance_grade?:
            | Database["public"]["Enums"]["performance_grade"]
            | null
          punctuality_score?: number
          supervisor_reports_score?: number
          team_rank?: number | null
          total_raw_score?: number
          updated_at?: string
          weighted_score?: number
        }
        Update: {
          assessment_score?: number
          behavior_score?: number
          client_evaluation_score?: number
          created_at?: string
          evaluated_by?: string | null
          evaluation_period_end?: string
          evaluation_period_start?: string
          evaluation_status?: string
          guard_id?: string
          id?: string
          notes?: string | null
          overall_rank?: number | null
          patrol_performance_score?: number
          performance_grade?:
            | Database["public"]["Enums"]["performance_grade"]
            | null
          punctuality_score?: number
          supervisor_reports_score?: number
          team_rank?: number | null
          total_raw_score?: number
          updated_at?: string
          weighted_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "guard_performance_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_performance_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
          {
            foreignKeyName: "guard_performance_evaluations_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_performance_evaluations_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
        ]
      }
      guard_satisfaction_ratings: {
        Row: {
          comments: string | null
          created_at: string
          guard_id: string
          id: string
          rating_date: string
          satisfaction_score: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          guard_id: string
          id?: string
          rating_date?: string
          satisfaction_score: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          guard_id?: string
          id?: string
          rating_date?: string
          satisfaction_score?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guard_upcoming_shifts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          created_at: string | null
          guard_id: string
          id: string
          schedule_id: string
          updated_at: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          created_at?: string | null
          guard_id: string
          id?: string
          schedule_id: string
          updated_at?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          created_at?: string | null
          guard_id?: string
          id?: string
          schedule_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guard_upcoming_shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "team_schedules"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "guard_work_stats_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
        ]
      }
      guardian_checkpoints: {
        Row: {
          active: boolean
          checkpoint_group_id: string | null
          created_at: string
          created_by: string
          description: string | null
          group_order: number | null
          id: string
          is_required: boolean | null
          location: string
          name: string
          site_id: string
        }
        Insert: {
          active?: boolean
          checkpoint_group_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          group_order?: number | null
          id?: string
          is_required?: boolean | null
          location: string
          name: string
          site_id: string
        }
        Update: {
          active?: boolean
          checkpoint_group_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          group_order?: number | null
          id?: string
          is_required?: boolean | null
          location?: string
          name?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_checkpoint_group"
            columns: ["checkpoint_group_id"]
            isOneToOne: false
            referencedRelation: "checkpoint_groups"
            referencedColumns: ["id"]
          },
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
          supervisor_id: string | null
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
          supervisor_id?: string | null
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
          supervisor_id?: string | null
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
      hr_workflow_stages: {
        Row: {
          assigned_to: string | null
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          stage_name: string
          started_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          stage_name: string
          started_at?: string | null
          status: string
        }
        Update: {
          assigned_to?: string | null
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          stage_name?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_workflow_stages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          candidate_id: string
          completed_at: string | null
          created_at: string
          evaluation_notes: string | null
          evaluation_score: number | null
          id: string
          interview_data: Json | null
          interview_type: string
          interviewer_id: string | null
          recommendation: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          interview_data?: Json | null
          interview_type: string
          interviewer_id?: string | null
          recommendation?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          interview_data?: Json | null
          interview_type?: string
          interviewer_id?: string | null
          recommendation?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      ipip_interpretation_templates: {
        Row: {
          areas_for_development: string | null
          created_at: string | null
          facet: string | null
          factor: string
          general_description: string
          id: string
          job_relevance: string
          percentile_range: string
          security_interpretation: string
          strengths: string | null
        }
        Insert: {
          areas_for_development?: string | null
          created_at?: string | null
          facet?: string | null
          factor: string
          general_description: string
          id?: string
          job_relevance: string
          percentile_range: string
          security_interpretation: string
          strengths?: string | null
        }
        Update: {
          areas_for_development?: string | null
          created_at?: string | null
          facet?: string | null
          factor?: string
          general_description?: string
          id?: string
          job_relevance?: string
          percentile_range?: string
          security_interpretation?: string
          strengths?: string | null
        }
        Relationships: []
      }
      ipip_neo_norms: {
        Row: {
          age_group: string
          created_at: string | null
          education_level: string
          facet: string | null
          factor: string
          gender: string | null
          id: string
          mean_score: number
          percentile_10: number | null
          percentile_25: number | null
          percentile_50: number | null
          percentile_75: number | null
          percentile_90: number | null
          sample_size: number
          std_deviation: number
          updated_at: string | null
        }
        Insert: {
          age_group: string
          created_at?: string | null
          education_level: string
          facet?: string | null
          factor: string
          gender?: string | null
          id?: string
          mean_score: number
          percentile_10?: number | null
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          sample_size: number
          std_deviation: number
          updated_at?: string | null
        }
        Update: {
          age_group?: string
          created_at?: string | null
          education_level?: string
          facet?: string | null
          factor?: string
          gender?: string | null
          id?: string
          mean_score?: number
          percentile_10?: number | null
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          sample_size?: number
          std_deviation?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ipip_neo_questions: {
        Row: {
          created_at: string | null
          facet: string
          factor: string
          id: string
          question_number: number
          question_text: string
          reverse_scored: boolean
        }
        Insert: {
          created_at?: string | null
          facet: string
          factor: string
          id?: string
          question_number: number
          question_text: string
          reverse_scored?: boolean
        }
        Update: {
          created_at?: string | null
          facet?: string
          factor?: string
          id?: string
          question_number?: number
          question_text?: string
          reverse_scored?: boolean
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
      leave_adjustments: {
        Row: {
          created_at: string
          created_by: string
          guard_id: string
          id: string
          no_work_delta: number
          notes: string | null
          previous_year_leave_delta: number
          regular_leave_delta: number
          sick_leave_delta: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          guard_id: string
          id?: string
          no_work_delta?: number
          notes?: string | null
          previous_year_leave_delta?: number
          regular_leave_delta?: number
          sick_leave_delta?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string
          guard_id?: string
          id?: string
          no_work_delta?: number
          notes?: string | null
          previous_year_leave_delta?: number
          regular_leave_delta?: number
          sick_leave_delta?: number
          updated_at?: string
          year?: number
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
      live_performance_calculations: {
        Row: {
          base_score: number | null
          behavior_score: number | null
          calculated_at: string
          calculation_period: string
          client_evaluations_count: number | null
          client_feedback_score: number | null
          created_at: string
          data_updated_at: string
          emergency_reporting_points: number | null
          emergency_reports_count: number | null
          evaluation_semester: string
          evaluation_year: number
          final_score: number | null
          guard_id: string
          guard_name: string
          has_behavior_records: boolean | null
          has_client_evaluations: boolean | null
          has_operational_activity: boolean | null
          has_ovit_evaluation: boolean | null
          has_supervisor_reports: boolean | null
          id: string
          negative_behaviors: number | null
          ovit_evaluations_count: number | null
          patrol_observations_count: number | null
          patrol_observations_points: number | null
          performance_details: Json | null
          performance_grade: string | null
          positive_behaviors: number | null
          punctuality_score: number | null
          supervisor_reports_count: number | null
          supervisor_reports_points: number | null
          team_id: string | null
          team_name: string | null
          total_shifts: number | null
          updated_at: string
        }
        Insert: {
          base_score?: number | null
          behavior_score?: number | null
          calculated_at?: string
          calculation_period: string
          client_evaluations_count?: number | null
          client_feedback_score?: number | null
          created_at?: string
          data_updated_at?: string
          emergency_reporting_points?: number | null
          emergency_reports_count?: number | null
          evaluation_semester: string
          evaluation_year: number
          final_score?: number | null
          guard_id: string
          guard_name: string
          has_behavior_records?: boolean | null
          has_client_evaluations?: boolean | null
          has_operational_activity?: boolean | null
          has_ovit_evaluation?: boolean | null
          has_supervisor_reports?: boolean | null
          id?: string
          negative_behaviors?: number | null
          ovit_evaluations_count?: number | null
          patrol_observations_count?: number | null
          patrol_observations_points?: number | null
          performance_details?: Json | null
          performance_grade?: string | null
          positive_behaviors?: number | null
          punctuality_score?: number | null
          supervisor_reports_count?: number | null
          supervisor_reports_points?: number | null
          team_id?: string | null
          team_name?: string | null
          total_shifts?: number | null
          updated_at?: string
        }
        Update: {
          base_score?: number | null
          behavior_score?: number | null
          calculated_at?: string
          calculation_period?: string
          client_evaluations_count?: number | null
          client_feedback_score?: number | null
          created_at?: string
          data_updated_at?: string
          emergency_reporting_points?: number | null
          emergency_reports_count?: number | null
          evaluation_semester?: string
          evaluation_year?: number
          final_score?: number | null
          guard_id?: string
          guard_name?: string
          has_behavior_records?: boolean | null
          has_client_evaluations?: boolean | null
          has_operational_activity?: boolean | null
          has_ovit_evaluation?: boolean | null
          has_supervisor_reports?: boolean | null
          id?: string
          negative_behaviors?: number | null
          ovit_evaluations_count?: number | null
          patrol_observations_count?: number | null
          patrol_observations_points?: number | null
          performance_details?: Json | null
          performance_grade?: string | null
          positive_behaviors?: number | null
          punctuality_score?: number | null
          supervisor_reports_count?: number | null
          supervisor_reports_points?: number | null
          team_id?: string | null
          team_name?: string | null
          total_shifts?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      manager_teams: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          manager_id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          manager_id: string
          team_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          manager_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_teams_team_id_fkey"
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
          expires_at: string | null
          id: string
          is_expired: boolean | null
          mission_type: string | null
          start_date: string | null
          starts_at: string | null
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
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          mission_type?: string | null
          start_date?: string | null
          starts_at?: string | null
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
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          mission_type?: string | null
          start_date?: string | null
          starts_at?: string | null
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
      occupational_tests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          passing_score: number | null
          questions: Json
          scoring_criteria: Json | null
          test_type: string
          time_limit_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          passing_score?: number | null
          questions?: Json
          scoring_criteria?: Json | null
          test_type: string
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          passing_score?: number | null
          questions?: Json
          scoring_criteria?: Json | null
          test_type?: string
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ovit_evaluation_criteria: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      ovit_evaluation_responses: {
        Row: {
          comments: string | null
          created_at: string | null
          criterion_id: string
          evaluation_id: string
          id: string
          score: number
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          criterion_id: string
          evaluation_id: string
          id?: string
          score: number
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          criterion_id?: string
          evaluation_id?: string
          id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ovit_evaluation_responses_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "ovit_evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ovit_evaluation_responses_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "ovit_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      ovit_evaluations: {
        Row: {
          created_at: string | null
          evaluation_date: string
          evaluation_period: string | null
          evaluation_year: number | null
          evaluator_id: string
          guard_id: string
          id: string
          notes: string | null
          overall_score: number
          status: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          evaluation_date?: string
          evaluation_period?: string | null
          evaluation_year?: number | null
          evaluator_id: string
          guard_id: string
          id?: string
          notes?: string | null
          overall_score?: number
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          evaluation_date?: string
          evaluation_period?: string | null
          evaluation_year?: number | null
          evaluator_id?: string
          guard_id?: string
          id?: string
          notes?: string | null
          overall_score?: number
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
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
          email_id: string | null
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
          email_id?: string | null
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
          email_id?: string | null
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
          checkpoint_group_id: string | null
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
          checkpoint_group_id?: string | null
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
          checkpoint_group_id?: string | null
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
            foreignKeyName: "patrol_sessions_checkpoint_group_id_fkey"
            columns: ["checkpoint_group_id"]
            isOneToOne: false
            referencedRelation: "checkpoint_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_sessions_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_sessions_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
      performance_cache_status: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_updated_at: string
          records_updated: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_updated_at?: string
          records_updated?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_updated_at?: string
          records_updated?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_metrics_config: {
        Row: {
          calculation_formula: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metric_name: string
          metric_type: Database["public"]["Enums"]["performance_metric_type"]
          points_per_unit: number
          threshold_value: number | null
          updated_at: string
          weight_percentage: number
        }
        Insert: {
          calculation_formula?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metric_name: string
          metric_type: Database["public"]["Enums"]["performance_metric_type"]
          points_per_unit?: number
          threshold_value?: number | null
          updated_at?: string
          weight_percentage?: number
        }
        Update: {
          calculation_formula?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metric_name?: string
          metric_type?: Database["public"]["Enums"]["performance_metric_type"]
          points_per_unit?: number
          threshold_value?: number | null
          updated_at?: string
          weight_percentage?: number
        }
        Relationships: []
      }
      performance_snapshots: {
        Row: {
          base_score: number
          behavior_points: number | null
          client_evaluation_points: number | null
          created_at: string | null
          details: Json | null
          emergency_reports_points: number | null
          final_score: number
          guard_id: string
          id: string
          ovit_evaluation_id: string | null
          patrol_activity_points: number | null
          performance_grade: string
          punctuality_points: number | null
          snapshot_date: string
          snapshot_type: string
          supervisor_reports_points: number | null
        }
        Insert: {
          base_score: number
          behavior_points?: number | null
          client_evaluation_points?: number | null
          created_at?: string | null
          details?: Json | null
          emergency_reports_points?: number | null
          final_score: number
          guard_id: string
          id?: string
          ovit_evaluation_id?: string | null
          patrol_activity_points?: number | null
          performance_grade: string
          punctuality_points?: number | null
          snapshot_date: string
          snapshot_type: string
          supervisor_reports_points?: number | null
        }
        Update: {
          base_score?: number
          behavior_points?: number | null
          client_evaluation_points?: number | null
          created_at?: string | null
          details?: Json | null
          emergency_reports_points?: number | null
          final_score?: number
          guard_id?: string
          id?: string
          ovit_evaluation_id?: string | null
          patrol_activity_points?: number | null
          performance_grade?: string
          punctuality_points?: number | null
          snapshot_date?: string
          snapshot_type?: string
          supervisor_reports_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_ovit_evaluation_id_fkey"
            columns: ["ovit_evaluation_id"]
            isOneToOne: false
            referencedRelation: "ovit_evaluations"
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
          gender: string | null
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
          gender?: string | null
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
          gender?: string | null
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
      psychological_evaluations: {
        Row: {
          candidate_id: string
          cognitive_interpretation: string | null
          created_at: string | null
          evaluation_date: string | null
          evaluator_id: string
          evaluator_name: string
          fitness_recommendation: string
          follow_up_required: boolean | null
          id: string
          ipip_neo_interpretation: string | null
          license_number: string
          overall_assessment: string
          recommendations: string | null
          risk_factors: Json | null
          strengths: Json | null
        }
        Insert: {
          candidate_id: string
          cognitive_interpretation?: string | null
          created_at?: string | null
          evaluation_date?: string | null
          evaluator_id: string
          evaluator_name: string
          fitness_recommendation: string
          follow_up_required?: boolean | null
          id?: string
          ipip_neo_interpretation?: string | null
          license_number: string
          overall_assessment: string
          recommendations?: string | null
          risk_factors?: Json | null
          strengths?: Json | null
        }
        Update: {
          candidate_id?: string
          cognitive_interpretation?: string | null
          created_at?: string | null
          evaluation_date?: string | null
          evaluator_id?: string
          evaluator_name?: string
          fitness_recommendation?: string
          follow_up_required?: boolean | null
          id?: string
          ipip_neo_interpretation?: string | null
          license_number?: string
          overall_assessment?: string
          recommendations?: string | null
          risk_factors?: Json | null
          strengths?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "psychological_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          id: string
          passed: boolean | null
          quiz_id: string
          score_percentage: number | null
          started_at: string
          status: string
          time_spent_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score_percentage?: number | null
          started_at?: string
          status?: string
          time_spent_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score_percentage?: number | null
          started_at?: string
          status?: string
          time_spent_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answers: Json
          created_at: string
          explanation_el: string | null
          explanation_en: string | null
          id: string
          is_active: boolean | null
          options: Json | null
          points: number | null
          question_text_el: string
          question_text_en: string
          question_type: string
          quiz_id: string
          sort_order: number | null
        }
        Insert: {
          correct_answers: Json
          created_at?: string
          explanation_el?: string | null
          explanation_en?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          points?: number | null
          question_text_el: string
          question_text_en: string
          question_type?: string
          quiz_id: string
          sort_order?: number | null
        }
        Update: {
          correct_answers?: Json
          created_at?: string
          explanation_el?: string | null
          explanation_en?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          points?: number | null
          question_text_el?: string
          question_text_en?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_training_sessions: {
        Row: {
          created_at: string
          created_by: string
          description_el: string | null
          description_en: string | null
          end_datetime: string
          id: string
          instructor_id: string | null
          location: string | null
          max_participants: number | null
          online_meeting_url: string | null
          session_type: string
          start_datetime: string
          status: string
          title_el: string
          title_en: string
          training_topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description_el?: string | null
          description_en?: string | null
          end_datetime: string
          id?: string
          instructor_id?: string | null
          location?: string | null
          max_participants?: number | null
          online_meeting_url?: string | null
          session_type?: string
          start_datetime: string
          status?: string
          title_el: string
          title_en: string
          training_topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description_el?: string | null
          description_en?: string | null
          end_datetime?: string
          id?: string
          instructor_id?: string | null
          location?: string | null
          max_participants?: number | null
          online_meeting_url?: string | null
          session_type?: string
          start_datetime?: string
          status?: string
          title_el?: string
          title_en?: string
          training_topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_training_sessions_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      security_assessment_criteria: {
        Row: {
          assessment_type: string
          created_at: string | null
          factor_or_domain: string
          id: string
          is_disqualifying: boolean | null
          maximum_percentile: number | null
          maximum_t_score: number | null
          minimum_percentile: number | null
          minimum_t_score: number | null
          position_type: string
          rationale: string | null
          research_basis: string | null
          updated_at: string | null
          weight_factor: number | null
        }
        Insert: {
          assessment_type: string
          created_at?: string | null
          factor_or_domain: string
          id?: string
          is_disqualifying?: boolean | null
          maximum_percentile?: number | null
          maximum_t_score?: number | null
          minimum_percentile?: number | null
          minimum_t_score?: number | null
          position_type: string
          rationale?: string | null
          research_basis?: string | null
          updated_at?: string | null
          weight_factor?: number | null
        }
        Update: {
          assessment_type?: string
          created_at?: string | null
          factor_or_domain?: string
          id?: string
          is_disqualifying?: boolean | null
          maximum_percentile?: number | null
          maximum_t_score?: number | null
          minimum_percentile?: number | null
          minimum_t_score?: number | null
          position_type?: string
          rationale?: string | null
          research_basis?: string | null
          updated_at?: string | null
          weight_factor?: number | null
        }
        Relationships: []
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
      session_participants: {
        Row: {
          attendance_status: string | null
          attended_at: string | null
          created_at: string
          feedback: string | null
          id: string
          invitation_status: string
          rating: number | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_status?: string | null
          attended_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          invitation_status?: string
          rating?: number | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_status?: string | null
          attended_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          invitation_status?: string
          rating?: number | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_training_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          change_reason: string | null
          change_type: Database["public"]["Enums"]["shift_change_type"]
          created_at: string
          created_by: string | null
          guard_id: string | null
          id: string
          new_data: Json | null
          previous_data: Json | null
          schedule_id: string | null
          team_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          change_reason?: string | null
          change_type: Database["public"]["Enums"]["shift_change_type"]
          created_at?: string
          created_by?: string | null
          guard_id?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          schedule_id?: string | null
          team_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          change_reason?: string | null
          change_type?: Database["public"]["Enums"]["shift_change_type"]
          created_at?: string
          created_by?: string | null
          guard_id?: string | null
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
            foreignKeyName: "shift_changes_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
            foreignKeyName: "site_guards_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
      site_supervisor_notification_settings: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string | null
          notify_for_severity: string[]
          site_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notify_for_severity?: string[]
          site_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notify_for_severity?: string[]
          site_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_supervisors: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean
          site_id: string
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          site_id: string
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          site_id?: string
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_supervisors_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supervisors_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
          {
            foreignKeyName: "site_supervisors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supervisors_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supervisors_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
        ]
      }
      supervisor_report_history: {
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
            foreignKeyName: "supervisor_report_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "supervisor_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_reports: {
        Row: {
          created_at: string
          description: Json | null
          email_id: string | null
          guard_id: string | null
          id: string
          image_url: string | null
          incident_time: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          site_id: string | null
          status: string
          supervisor_id: string
          supervisor_name: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json | null
          email_id?: string | null
          guard_id?: string | null
          id?: string
          image_url?: string | null
          incident_time?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          site_id?: string | null
          status?: string
          supervisor_id: string
          supervisor_name?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json | null
          email_id?: string | null
          guard_id?: string | null
          id?: string
          image_url?: string | null
          incident_time?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          site_id?: string | null
          status?: string
          supervisor_id?: string
          supervisor_name?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_site_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          monthly_target: number
          notes: string | null
          site_id: string
          supervisor_id: string
          updated_at: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_target?: number
          notes?: string | null
          site_id: string
          supervisor_id: string
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_target?: number
          notes?: string | null
          site_id?: string
          supervisor_id?: string
          updated_at?: string
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_site_targets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "guardian_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          monthly_target: number
          notes: string | null
          supervisor_id: string
          updated_at: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_target?: number
          notes?: string | null
          supervisor_id: string
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_target?: number
          notes?: string | null
          supervisor_id?: string
          updated_at?: string
          weekly_target?: number
        }
        Relationships: []
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
            foreignKeyName: "team_equipment_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
            foreignKeyName: "fk_team_members_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_team_members_profile_id"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
          },
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
            foreignKeyName: "team_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "supervisor_metrics"
            referencedColumns: ["supervisor_id"]
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
      test_results: {
        Row: {
          answers: Json
          candidate_id: string
          completed_at: string | null
          completion_time: number | null
          created_at: string
          id: string
          percentage_score: number | null
          personality_profile: Json | null
          recommendations: string | null
          score: number | null
          scores: Json | null
          started_at: string | null
          status: string
          test_id: string
          time_taken_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          answers?: Json
          candidate_id: string
          completed_at?: string | null
          completion_time?: number | null
          created_at?: string
          id?: string
          percentage_score?: number | null
          personality_profile?: Json | null
          recommendations?: string | null
          score?: number | null
          scores?: Json | null
          started_at?: string | null
          status?: string
          test_id: string
          time_taken_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          answers?: Json
          candidate_id?: string
          completed_at?: string | null
          completion_time?: number | null
          created_at?: string
          id?: string
          percentage_score?: number | null
          personality_profile?: Json | null
          recommendations?: string | null
          score?: number | null
          scores?: Json | null
          started_at?: string | null
          status?: string
          test_id?: string
          time_taken_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "occupational_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_by: string
          assigned_to_team_id: string | null
          assigned_to_user_id: string | null
          assignment_type: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string
          training_topic_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          assignment_type?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          training_topic_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          assignment_type?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          training_topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_to_team_id_fkey"
            columns: ["assigned_to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendance: {
        Row: {
          created_at: string
          id: string
          marked_at: string
          marked_by: string | null
          session_id: string
          updated_at: string
          user_id: string
          was_present: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id: string
          updated_at?: string
          user_id: string
          was_present?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
          was_present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string
          description_el: string | null
          description_en: string | null
          icon: string | null
          id: string
          name_el: string
          name_en: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: string
          description_el?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          name_el: string
          name_en: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string
          description_el?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          name_el?: string
          name_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_certificates: {
        Row: {
          assessment_result_id: string | null
          certificate_data: Json
          certificate_number: string
          created_at: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          module_id: string
          pdf_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_result_id?: string | null
          certificate_data: Json
          certificate_number: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          module_id: string
          pdf_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_result_id?: string | null
          certificate_data?: Json
          certificate_number?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          module_id?: string
          pdf_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_certifications: {
        Row: {
          certificate_data: Json | null
          certificate_number: string
          created_at: string
          expires_at: string | null
          id: string
          is_valid: boolean | null
          issued_at: string
          quiz_attempt_id: string | null
          training_topic_id: string
          user_id: string
        }
        Insert: {
          certificate_data?: Json | null
          certificate_number: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          issued_at?: string
          quiz_attempt_id?: string | null
          training_topic_id: string
          user_id: string
        }
        Update: {
          certificate_data?: Json | null
          certificate_number?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          issued_at?: string
          quiz_attempt_id?: string | null
          training_topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certifications_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          badge_level: string | null
          certificate_url: string | null
          completed_at: string
          created_at: string
          id: string
          module_id: string
          quiz_score: number | null
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_level?: string | null
          certificate_url?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          module_id: string
          quiz_score?: number | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_level?: string | null
          certificate_url?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          module_id?: string
          quiz_score?: number | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_content: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          module_id: string
          order_index: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string
          module_id: string
          order_index?: number
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          module_id?: string
          order_index?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_materials: {
        Row: {
          content_data: Json | null
          content_url: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          is_active: boolean | null
          language: string
          material_type: string
          mime_type: string | null
          sort_order: number | null
          title_el: string
          title_en: string
          training_topic_id: string
          updated_at: string
        }
        Insert: {
          content_data?: Json | null
          content_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean | null
          language: string
          material_type: string
          mime_type?: string | null
          sort_order?: number | null
          title_el: string
          title_en: string
          training_topic_id: string
          updated_at?: string
        }
        Update: {
          content_data?: Json | null
          content_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean | null
          language?: string
          material_type?: string
          mime_type?: string | null
          sort_order?: number | null
          title_el?: string
          title_en?: string
          training_topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_materials_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          created_at: string | null
          due_date: string | null
          id: string
          is_mandatory: boolean | null
          module_id: string
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          module_id: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          module_id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_module_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          category: string
          category_id: string | null
          certificate_template_id: string | null
          content_el: Json
          content_en: Json
          created_at: string
          created_by: string | null
          description_el: string | null
          description_en: string | null
          difficulty_level: string
          duration_minutes: number
          editable_by_admin: boolean | null
          id: string
          is_active: boolean
          last_edited_by: string | null
          tags: string[] | null
          title_el: string
          title_en: string
          updated_at: string
        }
        Insert: {
          category: string
          category_id?: string | null
          certificate_template_id?: string | null
          content_el?: Json
          content_en?: Json
          created_at?: string
          created_by?: string | null
          description_el?: string | null
          description_en?: string | null
          difficulty_level?: string
          duration_minutes?: number
          editable_by_admin?: boolean | null
          id?: string
          is_active?: boolean
          last_edited_by?: string | null
          tags?: string[] | null
          title_el: string
          title_en: string
          updated_at?: string
        }
        Update: {
          category?: string
          category_id?: string | null
          certificate_template_id?: string | null
          content_el?: Json
          content_en?: Json
          created_at?: string
          created_by?: string | null
          description_el?: string | null
          description_en?: string | null
          difficulty_level?: string
          duration_minutes?: number
          editable_by_admin?: boolean | null
          id?: string
          is_active?: boolean
          last_edited_by?: string | null
          tags?: string[] | null
          title_el?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_training_modules_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "training_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_notification_settings: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email_notifications: boolean | null
          id: string
          push_notifications: boolean | null
          reminder_before_due_days: number | null
          reminder_before_session_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          push_notifications?: boolean | null
          reminder_before_due_days?: number | null
          reminder_before_session_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          push_notifications?: boolean | null
          reminder_before_due_days?: number | null
          reminder_before_session_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_quizzes: {
        Row: {
          created_at: string
          description_el: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          max_attempts: number | null
          passing_score_percentage: number | null
          randomize_questions: boolean | null
          time_limit_minutes: number | null
          title_el: string
          title_en: string
          training_topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_el?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          passing_score_percentage?: number | null
          randomize_questions?: boolean | null
          time_limit_minutes?: number | null
          title_el: string
          title_en: string
          training_topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_el?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          passing_score_percentage?: number | null
          randomize_questions?: boolean | null
          time_limit_minutes?: number | null
          title_el?: string
          title_en?: string
          training_topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sections: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          module_id: string
          order_index: number
          presentation_file_path: string | null
          section_type: string
          title_el: string
          title_en: string
          updated_at: string | null
          video_file_path: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          order_index: number
          presentation_file_path?: string | null
          section_type: string
          title_el: string
          title_en: string
          updated_at?: string | null
          video_file_path?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          order_index?: number
          presentation_file_path?: string | null
          section_type?: string
          title_el?: string
          title_en?: string
          updated_at?: string | null
          video_file_path?: string | null
        }
        Relationships: []
      }
      training_session_participants: {
        Row: {
          attendance_status: string | null
          completion_status: string | null
          created_at: string | null
          enrollment_date: string | null
          feedback: string | null
          id: string
          score: number | null
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_status?: string | null
          completion_status?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_status?: string | null
          completion_status?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          instructor: string
          location: string
          max_participants: number
          start_date: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          instructor: string
          location: string
          max_participants?: number
          start_date: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          instructor?: string
          location?: string
          max_participants?: number
          start_date?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_topics: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description_el: string | null
          description_en: string | null
          difficulty_level: number | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title_el: string
          title_en: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description_el?: string | null
          description_en?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_el: string
          title_en: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description_el?: string | null
          description_en?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_el?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_assessment_results: {
        Row: {
          answers: Json
          certificate_generated: boolean | null
          certificate_path: string | null
          completed_at: string | null
          form_id: string
          id: string
          module_id: string
          passed: boolean
          score_percentage: number
          user_id: string
        }
        Insert: {
          answers: Json
          certificate_generated?: boolean | null
          certificate_path?: string | null
          completed_at?: string | null
          form_id: string
          id?: string
          module_id: string
          passed: boolean
          score_percentage: number
          user_id: string
        }
        Update: {
          answers?: Json
          certificate_generated?: boolean | null
          certificate_path?: string | null
          completed_at?: string | null
          form_id?: string
          id?: string
          module_id?: string
          passed?: boolean
          score_percentage?: number
          user_id?: string
        }
        Relationships: []
      }
      user_biometric_credentials: {
        Row: {
          active: boolean
          counter: number
          created_at: string
          credential_id: string
          id: string
          last_used: string | null
          public_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          counter?: number
          created_at?: string
          credential_id: string
          id?: string
          last_used?: string | null
          public_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          counter?: number
          created_at?: string
          credential_id?: string
          id?: string
          last_used?: string | null
          public_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credentials: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          notes: string | null
          password_hash: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          notes?: string | null
          password_hash: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          notes?: string | null
          password_hash?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_material_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          last_position_seconds: number | null
          time_spent_seconds: number | null
          training_material_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          time_spent_seconds?: number | null
          training_material_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          time_spent_seconds?: number | null
          training_material_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_material_progress_training_material_id_fkey"
            columns: ["training_material_id"]
            isOneToOne: false
            referencedRelation: "training_materials"
            referencedColumns: ["id"]
          },
        ]
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
      user_section_progress: {
        Row: {
          completed_at: string | null
          id: string
          module_id: string
          section_id: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          module_id: string
          section_id: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          module_id?: string
          section_id?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      user_training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          progress_percentage: number | null
          started_at: string | null
          status: string
          total_time_spent_seconds: number | null
          training_topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          total_time_spent_seconds?: number | null
          training_topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          total_time_spent_seconds?: number | null
          training_topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_training_topic_id_fkey"
            columns: ["training_topic_id"]
            isOneToOne: false
            referencedRelation: "training_topics"
            referencedColumns: ["id"]
          },
        ]
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
      complaint_resolution_stats: {
        Row: {
          satisfaction_percentage: number | null
          satisfied_resolutions: number | null
          total_resolved_complaints: number | null
          unsatisfied_resolutions: number | null
        }
        Relationships: []
      }
      supervisor_metrics: {
        Row: {
          active_assignments_count: number | null
          assigned_sites_count: number | null
          monthly_achievement_percentage: number | null
          monthly_reports_count: number | null
          monthly_target: number | null
          supervisor_email: string | null
          supervisor_id: string | null
          supervisor_name: string | null
          weekly_achievement_percentage: number | null
          weekly_reports_count: number | null
          weekly_target: number | null
        }
        Relationships: []
      }
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
      auto_checkout_guards: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      bulk_update_live_performance_calculations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      bulk_update_live_performance_calculations_with_failover: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      calculate_assessment_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          details: Json
          excellent_count: number
          fair_count: number
          good_count: number
          poor_count: number
          total_score: number
        }[]
      }
      calculate_behavior_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          details: Json
          negative_count: number
          negative_score: number
          positive_count: number
          positive_score: number
          total_score: number
        }[]
      }
      calculate_client_evaluation_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          average_professionalism: number
          average_reliability: number
          average_satisfaction: number
          details: Json
          evaluation_count: number
          total_score: number
        }[]
      }
      calculate_guard_performance_with_base_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          base_score: number
          behavior_details: Json
          behavior_distinction: boolean
          behavior_points: number
          behavior_score: number
          client_distinction: boolean
          client_evaluation_details: Json
          client_evaluation_points: number
          client_evaluation_score: number
          client_evaluations_count: number
          details: Json
          emergency_reports_points: number
          final_score: number
          guard_id: string
          has_behavior_records: boolean
          has_client_evaluations: boolean
          has_operational_activity: boolean
          has_ovit_evaluation: boolean
          has_supervisor_reports: boolean
          latest_ovit_score: number
          negative_behaviors: number
          operational_activity_details: Json
          operational_activity_points: number
          operational_activity_score: number
          operational_distinction: boolean
          ovit_evaluations_count: number
          patrol_observations_count: number
          patrol_observations_points: number
          performance_grade: string
          positive_behaviors: number
          punctuality_details: Json
          punctuality_distinction: boolean
          punctuality_points: number
          punctuality_score: number
          supervisor_distinction: boolean
          supervisor_reports_count: number
          supervisor_reports_details: Json
          supervisor_reports_points: number
          supervisor_reports_score: number
          total_shifts: number
        }[]
      }
      calculate_patrol_performance_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          checkpoint_efficiency: number
          completion_rate: number
          details: Json
          on_time_percentage: number
          patrol_consistency: number
          total_score: number
        }[]
      }
      calculate_punctuality_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          details: Json
          early_count: number
          late_count: number
          on_time_count: number
          total_score: number
        }[]
      }
      calculate_supervisor_reports_score: {
        Args: { p_end_date: string; p_guard_id: string; p_start_date: string }
        Returns: {
          details: Json
          negative_score: number
          positive_score: number
          report_count: number
          score: number
        }[]
      }
      can_access_guard_performance: {
        Args: { p_guard_id: string }
        Returns: boolean
      }
      check_and_close_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_if_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_user_manager_status: {
        Args: { user_id: string }
        Returns: Json
      }
      cleanup_orphaned_workflow_stages: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_certificate_templates_table: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_service_account: {
        Args: { p_api_key: string; p_name: string }
        Returns: {
          api_key: string
          created_at: string
          id: string
          name: string
          permissions: string[] | null
        }
      }
      cron_auto_checkout: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      debug_manager_access: {
        Args: { team_id: string; user_id: string }
        Returns: Json
      }
      delete_candidate_with_dependencies: {
        Args: { candidate_uuid: string }
        Returns: Json
      }
      delete_service_account: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_team_with_dependencies: {
        Args: { team_id_param: string }
        Returns: Json
      }
      disable_team_welcome_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_team_welcome_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_candidate_workflow: {
        Args: { candidate_uuid: string }
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
          end_time: string
          guard_avatar_url: string
          guard_first_name: string
          guard_id: string
          guard_last_name: string
          id: string
          site_id: string
          site_name: string
          start_time: string
          status: string
        }[]
      }
      get_available_employees_for_session: {
        Args: { session_end: string; session_start: string }
        Returns: {
          avatar_url: string
          email: string
          first_name: string
          full_name: string
          is_available: boolean
          last_name: string
          mobile_phone: string
          team_id: string
          team_name: string
          user_id: string
        }[]
      }
      get_badge_level: {
        Args: { score: number }
        Returns: string
      }
      get_current_semester_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          end_date: string
          period: string
          semester: string
          start_date: string
          year: number
        }[]
      }
      get_geocoding_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          failed_geocodes: number
          pending_geocodes: number
          processing_geocodes: number
          successful_geocodes: number
          total_guardians: number
          with_address: number
          with_coordinates: number
          without_address: number
          without_coordinates: number
        }[]
      }
      get_guard_productivity_metrics: {
        Args: {
          p_end_date?: string
          p_guard_id?: string
          p_start_date?: string
        }
        Returns: {
          avg_checkpoints_per_patrol: number
          avg_incidents_per_patrol: number
          avg_patrol_duration_minutes: number
          completed_patrols: number
          guard_id: string
          guard_name: string
          on_time_percentage: number
          response_efficiency_score: number
          total_checkpoints_visited: number
          total_incidents_reported: number
          total_patrol_hours: number
          total_patrols: number
        }[]
      }
      get_latest_fatigue_levels: {
        Args: { days_limit?: number; guard_ids: string[] }
        Returns: {
          fatigue_level: number
          guard_id: string
          shift_date: string
        }[]
      }
      get_latest_satisfaction_ratings: {
        Args: { days_limit?: number; guard_ids: string[] }
        Returns: {
          guard_id: string
          rating_date: string
          satisfaction_score: number
        }[]
      }
      get_pending_shift_notifications: {
        Args: { minutes_ahead?: number }
        Returns: {
          guard_email: string
          guard_id: string
          guard_name: string
          id: string
          schedule_id: string
          shift_start_time: string
          shift_title: string
          team_id: string
        }[]
      }
      get_performance_cron_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          jobname: string
          schedule: string
        }[]
      }
      get_schedule_history_simple: {
        Args: { p_limit?: number; p_schedule_id?: string; p_team_id?: string }
        Returns: {
          action_by: string
          action_by_name: string
          action_timestamp: string
          action_type: string
          assigned_guard_names: string[]
          change_reason: string
          duration_hours: number
          field_changed: string
          id: string
          new_value: string
          old_value: string
          schedule_id: string
          shift_description: string
          shift_end_date: string
          shift_location: string
          shift_start_date: string
          shift_title: string
          team_name: string
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
          first_name: string
          full_name: string
          last_name: string
          member_id: string
          profile_id: string
        }[]
      }
      get_team_name: {
        Args: { team_id_param: string }
        Returns: string
      }
      get_user_assigned_modules: {
        Args: { user_uuid?: string }
        Returns: {
          assigned_at: string
          assignment_id: string
          due_date: string
          is_mandatory: boolean
          module_id: string
        }[]
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
      get_workflow_inconsistencies: {
        Args: Record<PropertyKey, never>
        Returns: {
          candidate_id: string
          candidate_name: string
          description: string
          issue_type: string
        }[]
      }
      has_role: {
        Args:
          | { _role: Database["public"]["Enums"]["app_role"]; user_id: string }
          | { _role: string; user_id: string }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_admin_or_super_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_client_for_team: {
        Args: { team_id: string; user_id?: string }
        Returns: boolean
      }
      is_client_for_team_mission: {
        Args: { current_user_id?: string; mission_team_id: string }
        Returns: boolean
      }
      is_manager: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_id: string }
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
      manager_has_team_access: {
        Args: { team_id: string; user_id: string }
        Returns: boolean
      }
      manual_sync_workflow_stages: {
        Args: { candidate_uuid: string }
        Returns: undefined
      }
      mark_expired_missions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_cache_status: {
        Args: {
          p_error_message?: string
          p_records_updated: number
          p_status?: string
        }
        Returns: undefined
      }
      update_leave_request_status: {
        Args: { new_status: string; request_id: string }
        Returns: boolean
      }
      update_live_performance_calculation: {
        Args: { p_guard_id: string; p_semester?: string; p_year?: number }
        Returns: undefined
      }
      update_notification_status: {
        Args: {
          email_sent?: boolean
          new_status: string
          notification_id: string
          push_sent?: boolean
        }
        Returns: boolean
      }
      upsert_device_token: {
        Args: { p_token: string; p_user_id: string }
        Returns: undefined
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      validate_workflow_consistency: {
        Args: { candidate_uuid: string }
        Returns: boolean
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
        | "INSUFFICIENT_HOURS"
        | "UNASSIGNED_SCHEDULE"
      app_role:
        | "admin"
        | "guard"
        | "client"
        | "super_admin"
        | "guardian"
        | "manager"
      equipment_status: "active" | "archived" | "inactive"
      patrol_status: "active" | "completed" | "interrupted" | "leave_tracking"
      performance_grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F"
      performance_metric_type:
        | "patrol_performance"
        | "supervisor_reports"
        | "punctuality"
        | "assessment_results"
      shift_change_type:
        | "added"
        | "removed"
        | "modified"
        | "assignment_added"
        | "assignment_removed"
      test_type: "personality" | "aptitude" | "cognitive" | "mmpi2"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      alert_type: [
        "insufficient_hours",
        "missing_guard",
        "night_morning_shift",
        "insufficient_rest",
        "visibility_status",
        "unassigned_schedule",
        "missing_template_shifts",
        "early_checkout",
        "INSUFFICIENT_HOURS",
        "UNASSIGNED_SCHEDULE",
      ],
      app_role: [
        "admin",
        "guard",
        "client",
        "super_admin",
        "guardian",
        "manager",
      ],
      equipment_status: ["active", "archived", "inactive"],
      patrol_status: ["active", "completed", "interrupted", "leave_tracking"],
      performance_grade: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
      performance_metric_type: [
        "patrol_performance",
        "supervisor_reports",
        "punctuality",
        "assessment_results",
      ],
      shift_change_type: [
        "added",
        "removed",
        "modified",
        "assignment_added",
        "assignment_removed",
      ],
      test_type: ["personality", "aptitude", "cognitive", "mmpi2"],
    },
  },
} as const
