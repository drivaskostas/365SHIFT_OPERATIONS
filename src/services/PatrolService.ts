
import { supabase } from '@/lib/supabase'
import type { PatrolSession, GuardianSite, PatrolCheckpointVisit, GuardianCheckpoint } from '@/types/database'

export class PatrolService {
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      // First try with high accuracy
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('High accuracy location failed, trying with lower accuracy:', error);
          // Fallback to lower accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Fallback location obtained:', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (fallbackError) => {
              console.error('Location access denied or failed:', fallbackError);
              resolve(null);
            },
            { 
              timeout: 15000,
              enableHighAccuracy: false,
              maximumAge: 300000 // 5 minutes
            }
          );
        },
        { 
          timeout: 8000,
          enableHighAccuracy: true,
          maximumAge: 60000 // 1 minute
        }
      );
    });
  }

  static async startPatrol(siteId: string, guardId: string, teamId?: string): Promise<PatrolSession> {
    console.log('Starting patrol for guard:', guardId, 'at site:', siteId);
    
    // First verify the guard is assigned to this site
    const { data: siteGuard, error: assignmentError } = await supabase
      .from('site_guards')
      .select('*')
      .eq('guard_id', guardId)
      .eq('site_id', siteId)
      .maybeSingle()

    if (assignmentError) {
      console.error('Error checking site assignment:', assignmentError);
      throw assignmentError;
    }
    
    if (!siteGuard) {
      console.error('Guard not assigned to site:', { guardId, siteId });
      throw new Error('You are not assigned to this site. Please contact your supervisor.');
    }

    console.log('Guard assignment verified:', siteGuard);

    // Get the guard's team assignment if teamId is not provided
    let resolvedTeamId = teamId;
    if (!resolvedTeamId) {
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', guardId)
        .maybeSingle()

      if (teamError) {
        console.error('Error fetching team assignment:', teamError)
        // Continue without team_id rather than failing
      } else if (teamMember) {
        resolvedTeamId = teamMember.team_id
        console.log('Resolved team ID:', resolvedTeamId);
      }
    }

    // Get current location with retries
    console.log('Attempting to get location for patrol start...');
    const location = await this.getCurrentLocation();
    console.log('Location for patrol start:', location);

    const { data, error } = await supabase
      .from('patrol_sessions')
      .insert({
        guard_id: guardId,
        site_id: siteId,
        team_id: resolvedTeamId,
        start_time: new Date().toISOString(),
        status: 'active',
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating patrol session:', error);
      throw error;
    }
    
    console.log('Patrol session created:', data);
    return data;
  }

  static async endPatrol(patrolId: string): Promise<PatrolSession> {
    // Get current location for end patrol
    console.log('Attempting to get location for patrol end...');
    const location = await this.getCurrentLocation();
    console.log('Location for patrol end:', location);

    const { data, error } = await supabase
      .from('patrol_sessions')
      .update({
        end_time: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString(),
        // Update location for end patrol (you might want separate end_latitude/end_longitude fields)
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      .eq('id', patrolId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getActivePatrol(guardId: string): Promise<PatrolSession | null> {
    console.log('Checking for active patrol for guard:', guardId);
    
    const { data, error } = await supabase
      .from('patrol_sessions')
      .select('*')
      .eq('guard_id', guardId)
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active patrol:', error);
      throw error;
    }
    
    console.log('Active patrol result:', data);
    return data;
  }

  static async getAvailableSites(guardId: string): Promise<GuardianSite[]> {
    console.log('Getting available sites for guard:', guardId);
    
    // First get the site IDs assigned to the guard
    const { data: siteAssignments, error: assignmentError } = await supabase
      .from('site_guards')
      .select('site_id')
      .eq('guard_id', guardId)

    if (assignmentError) {
      console.error('Error fetching site assignments:', assignmentError);
      throw assignmentError;
    }
    
    console.log('Site assignments:', siteAssignments);
    
    if (!siteAssignments || siteAssignments.length === 0) {
      console.log('No site assignments found');
      return [];
    }

    const siteIds = siteAssignments.map(assignment => assignment.site_id);
    console.log('Site IDs:', siteIds);

    // Then get the actual site details
    const { data, error } = await supabase
      .from('guardian_sites')
      .select('*')
      .eq('active', true)
      .in('id', siteIds)
      .order('name')

    if (error) {
      console.error('Error fetching site details:', error);
      throw error;
    }
    
    console.log('Available sites:', data);
    return data || [];
  }

  static async recordCheckpointVisit(
    patrolId: string,
    checkpointId: string,
    location?: { latitude: number; longitude: number }
  ): Promise<PatrolCheckpointVisit> {
    console.log('Recording checkpoint visit:', { patrolId, checkpointId, location });
    
    // Always get fresh location for checkpoint visits
    console.log('Attempting to get location for checkpoint visit...');
    const currentLocation = location || await this.getCurrentLocation();
    console.log('Location for checkpoint visit:', currentLocation);

    const { data, error } = await supabase
      .from('patrol_checkpoint_visits')
      .insert({
        patrol_id: patrolId,
        checkpoint_id: checkpointId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording checkpoint visit:', error);
      throw error;
    }
    
    console.log('Checkpoint visit recorded:', data);
    return data;
  }

  static async validateCheckpoint(checkpointId: string, siteId: string): Promise<GuardianCheckpoint | null> {
    console.log('Validating checkpoint:', { checkpointId, siteId });
    
    // First, let's check if the checkpoint exists at all
    const { data: allCheckpoints, error: allError } = await supabase
      .from('guardian_checkpoints')
      .select('*')
      .eq('id', checkpointId);
    
    console.log('All checkpoints with this ID:', allCheckpoints);
    
    // Now check if it belongs to the specific site
    const { data, error } = await supabase
      .from('guardian_checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .eq('site_id', siteId)
      .eq('active', true)
      .maybeSingle()

    if (error) {
      console.error('Error validating checkpoint:', error);
      throw error;
    }
    
    if (!data) {
      console.error('Checkpoint validation failed:', {
        checkpointId,
        siteId,
        foundCheckpoints: allCheckpoints,
        reason: allCheckpoints?.length === 0 ? 'Checkpoint ID not found' : 'Checkpoint belongs to different site or is inactive'
      });
    } else {
      console.log('Checkpoint validation successful:', data);
    }
    
    return data;
  }

  static async getPatrolProgress(patrolId: string): Promise<{
    totalCheckpoints: number
    visitedCheckpoints: number
    progress: number
  }> {
    // Get site from patrol session
    const { data: patrol } = await supabase
      .from('patrol_sessions')
      .select('site_id')
      .eq('id', patrolId)
      .single()

    if (!patrol) return { totalCheckpoints: 0, visitedCheckpoints: 0, progress: 0 }

    // Get total checkpoints for the site
    const { count: totalCheckpoints } = await supabase
      .from('guardian_checkpoints')
      .select('*', { count: 'exact' })
      .eq('site_id', patrol.site_id)
      .eq('active', true)

    // Get visited checkpoints for this patrol
    const { count: visitedCheckpoints } = await supabase
      .from('patrol_checkpoint_visits')
      .select('*', { count: 'exact' })
      .eq('patrol_id', patrolId)
      .eq('status', 'completed')

    const progress = totalCheckpoints ? Math.round((visitedCheckpoints || 0) / totalCheckpoints * 100) : 0

    return {
      totalCheckpoints: totalCheckpoints || 0,
      visitedCheckpoints: visitedCheckpoints || 0,
      progress
    }
  }

  // New debugging methods
  static async debugGetAllCheckpoints(siteId?: string): Promise<GuardianCheckpoint[]> {
    console.log('Getting all checkpoints for debugging:', siteId);
    
    let query = supabase.from('guardian_checkpoints').select('*');
    
    if (siteId) {
      query = query.eq('site_id', siteId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting checkpoints:', error);
      throw error;
    }
    
    console.log('All checkpoints:', data);
    return data || [];
  }

  static async debugGetSiteInfo(siteId: string): Promise<GuardianSite | null> {
    console.log('Getting site info for debugging:', siteId);
    
    const { data, error } = await supabase
      .from('guardian_sites')
      .select('*')
      .eq('id', siteId)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting site info:', error);
      throw error;
    }
    
    console.log('Site info:', data);
    return data;
  }
}
