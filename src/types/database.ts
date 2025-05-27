
export interface PatrolSession {
  id: string
  guard_id: string
  site_id: string
  team_id?: string
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
  created_at: string
  updated_at: string
}
