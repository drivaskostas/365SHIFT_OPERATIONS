
export interface PatrolSession {
  id: string
  guard_id: string
  site_id: string
  team_id?: string
  checkpoint_group_id?: string
  start_time: string
  end_time?: string
  status: 'active' | 'completed' | 'cancelled'
  latitude?: number
  longitude?: number
  created_at: string
  updated_at: string
}

export interface GuardianSite {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  geofence_radius?: number
  team_id: string
  active?: boolean
  description?: string
  created_at: string
  created_by: string
}

export interface GuardianCheckpoint {
  id: string
  site_id: string
  name: string
  location: string
  description?: string
  active: boolean
  created_at: string
  created_by: string
}

export interface PatrolCheckpointVisit {
  id: string
  patrol_id: string
  checkpoint_id: string
  timestamp: string
  status: 'completed' | 'incomplete' | 'skipped'
  notes?: string
  latitude?: number
  longitude?: number
  created_at: string
}

export interface PatrolObservation {
  id: string
  guard_id: string
  patrol_id?: string
  team_id?: string
  title: string
  description?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'investigating' | 'resolved'
  image_url?: string
  latitude?: number
  longitude?: number
  timestamp: string
  created_at: string
  updated_at: string
  resolved_at?: string
  resolved_by?: string
  guard_name?: string
}

export interface EmergencyReport {
  id: string
  guard_id: string
  patrol_id?: string
  team_id?: string
  title: string
  description?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'investigating' | 'resolved'
  image_url?: string
  location?: string
  latitude?: number
  longitude?: number
  incident_time?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  resolved_by?: string
  guard_name?: string
  involved_persons?: string
  notes?: any
}

export interface Profile {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  full_name?: string
  avatar_url?: string
  Role?: 'guard' | 'admin' | 'super_admin' | 'client'
  status?: string
  mobile_phone?: string
  created_at: string
  updated_at: string
}

// Obligation Types
export interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

export interface ContractObligation {
  id: string
  contract_id: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  specific_days?: number[] // [1,3,5] for Mon,Wed,Fri
  requires_checklist: boolean
  checklist_items?: ChecklistItem[]
  requires_photo_proof: boolean
  requires_signature: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  service_contracts?: {
    id: string
    site_id: string
    client_id: string
    guardian_sites?: {
      id: string
      name: string
    }
  }
}

export interface ObligationCompletion {
  id: string
  obligation_id: string
  scheduled_date: string
  completed_by?: string
  completed_by_name?: string
  completed_at?: string
  status: 'pending' | 'completed' | 'missed' | 'excused'
  notes?: string
  checklist_responses?: Record<string, boolean>
  photo_urls?: string[]
  signature_url?: string
  issues_found?: string
  verified_by?: string
  verified_at?: string
  verification_status?: string
  verification_notes?: string
  tenant_id?: string
  created_at: string
  updated_at: string
  // Joined fields
  contract_obligations?: ContractObligation
  profiles?: Profile
}

export interface TenantFeatureSettings {
  id: string
  tenant_id: string
  // Tenant Branding
  tenant_name?: string
  app_name?: string
  app_subtitle?: string
  logo_url?: string
  theme?: 'default' | 'dark' | 'blue' | 'green' | 'purple' | 'red'
  primary_color?: string
  // Quick Actions visibility
  show_scan_button: boolean
  show_tasks_button: boolean
  show_observations_button: boolean
  show_report_button: boolean
  // Cards visibility
  show_supervisor_report: boolean
  show_todays_tasks: boolean
  show_patrol_status: boolean
  // Feature modules
  show_emergency_reports: boolean
  show_location_tracking: boolean
  show_team_observations: boolean
  show_patrol_sessions: boolean
  // Obligation requirements visibility
  show_photo_requirement: boolean
  show_signature_requirement: boolean
  show_checklist_requirement: boolean
  show_notes_field: boolean
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}
