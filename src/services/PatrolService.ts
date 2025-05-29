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

      // Reduced timeouts for mobile devices
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
          console.warn('Location access failed, will use fallback method:', error);
          resolve(null);
        },
        { 
          timeout: 3000, // Reduced from 8000ms
          enableHighAccuracy: false, // Changed to false for faster response
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  static async getLastKnownLocation(guardId: string, patrolId?: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      console.log('🔍 Getting last known location for guard:', guardId, 'patrol:', patrolId);
      
      let query = supabase
        .from('guard_locations')
        .select('latitude, longitude, created_at')
        .eq('guard_id', guardId)
        .order('created_at', { ascending: false })
        .limit(1);

      // If we have a specific patrol, try to get location from that patrol first
      if (patrolId) {
        const patrolQuery = supabase
          .from('guard_locations')
          .select('latitude, longitude, created_at')
          .eq('guard_id', guardId)
          .eq('patrol_id', patrolId)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: patrolLocation, error: patrolError } = await patrolQuery;
        
        if (!patrolError && patrolLocation && patrolLocation.length > 0) {
          console.log('✅ Found location from current patrol:', patrolLocation[0]);
          return {
            latitude: Number(patrolLocation[0].latitude),
            longitude: Number(patrolLocation[0].longitude)
          };
        }
      }

      // Fallback to any recent location from the guard
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching last known location:', error);
        return null;
      }

      if (data && data.length > 0) {
        console.log('✅ Found last known location:', data[0]);
        return {
          latitude: Number(data[0].latitude),
          longitude: Number(data[0].longitude)
        };
      }

      console.log('⚠️ No location found in guard_locations table');
      return null;
    } catch (error) {
      console.error('❌ Error in getLastKnownLocation:', error);
      return null;
    }
  }

  static async getLocationWithFallback(guardId: string, patrolId?: string): Promise<{ latitude: number; longitude: number } | null> {
    console.log('📍 Attempting to get location with fallback strategy...');
    
    // Try to get current location first (with reduced timeout)
    const currentLocation = await this.getCurrentLocation();
    if (currentLocation) {
      console.log('✅ Got current GPS location');
      return currentLocation;
    }

    // Fallback to last known location from database
    console.log('🔄 GPS failed, trying last known location from database...');
    const lastKnownLocation = await this.getLastKnownLocation(guardId, patrolId);
    if (lastKnownLocation) {
      console.log('✅ Using last known location from database');
      return lastKnownLocation;
    }

    console.log('❌ No location available from any source');
    return null;
  }

  static async startPatrol(siteId: string, guardId: string, teamId?: string): Promise<PatrolSession> {
    // If teamId is provided, validate that the guard is assigned to the correct site for this team
    let resolvedSiteId = siteId;
    let resolvedTeamId = teamId;
    
    if (teamId) {
      console.log('🔍 Looking up site for team:', teamId);
      
      // Get the site assigned to this specific team
      const { data: teamSite, error: teamSiteError } = await supabase
        .from('guardian_sites')
        .select('id, name, team_id')
        .eq('team_id', teamId)
        .eq('active', true)
        .maybeSingle();

      if (teamSiteError) {
        console.error('❌ Error fetching team site:', teamSiteError);
        throw new Error('Failed to validate team site assignment');
      }

      if (teamSite) {
        resolvedSiteId = teamSite.id;
        console.log('✅ Resolved site ID for team:', teamSite.name, '- Site ID:', resolvedSiteId);
      } else {
        console.log('⚠️ No active site found for team:', teamId);
        throw new Error('No active site found for your current team assignment');
      }
    }

    // Verify the guard is assigned to this specific site
    const { data: siteGuard, error: assignmentError } = await supabase
      .from('site_guards')
      .select('*')
      .eq('guard_id', guardId)
      .eq('site_id', resolvedSiteId)
      .maybeSingle()

    if (assignmentError) throw assignmentError
    
    if (!siteGuard) {
      throw new Error(`You are not assigned to this site. Please contact your supervisor. Expected site: ${resolvedSiteId}`)
    }

    // Get the guard's team assignment if teamId is not provided
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
      }
    }

    // Get current location with retries
    console.log('📍 Attempting to get location for patrol start...');
    const location = await this.getCurrentLocation();
    console.log('📍 Location for patrol start:', location);

    console.log('🚀 Starting patrol with resolved site ID:', resolvedSiteId, 'and team ID:', resolvedTeamId);

    const { data, error } = await supabase
      .from('patrol_sessions')
      .insert({
        guard_id: guardId,
        site_id: resolvedSiteId, // Use the resolved site ID
        team_id: resolvedTeamId,
        start_time: new Date().toISOString(),
        status: 'active',
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      .select()
      .single()

    if (error) throw error
    
    console.log('✅ Patrol started successfully:', data);
    return data
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
    const { data, error } = await supabase
      .from('patrol_sessions')
      .select('*')
      .eq('guard_id', guardId)
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async getAvailableSites(guardId: string): Promise<GuardianSite[]> {
    // Get shift information to determine the correct site
    const shiftInfo = localStorage.getItem('guardShiftInfo');
    
    if (shiftInfo) {
      try {
        const parsedShiftInfo = JSON.parse(shiftInfo);
        console.log('📋 Using shift info to determine available site:', parsedShiftInfo);
        
        // Return only the site assigned for the current shift
        const { data: assignedSite, error } = await supabase
          .from('guardian_sites')
          .select('*')
          .eq('id', parsedShiftInfo.siteId)
          .eq('active', true)
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching assigned site:', error);
          throw error;
        }

        if (assignedSite) {
          console.log('✅ Returning assigned site for current shift:', assignedSite.name);
          return [assignedSite];
        }
      } catch (error) {
        console.error('❌ Error parsing shift info:', error);
      }
    }

    // Fallback to original logic if no shift info available
    console.log('⚠️ No shift info found, falling back to all assigned sites');
    
    // First get the site IDs assigned to the guard
    const { data: siteAssignments, error: assignmentError } = await supabase
      .from('site_guards')
      .select('site_id')
      .eq('guard_id', guardId)

    if (assignmentError) throw assignmentError
    
    if (!siteAssignments || siteAssignments.length === 0) {
      return []
    }

    const siteIds = siteAssignments.map(assignment => assignment.site_id)

    // Then get the actual site details
    const { data, error } = await supabase
      .from('guardian_sites')
      .select('*')
      .eq('active', true)
      .in('id', siteIds)
      .order('name')

    if (error) throw error
    return data || []
  }

  static async recordCheckpointVisit(
    patrolId: string,
    checkpointId: string,
    location?: { latitude: number; longitude: number },
    guardId?: string
  ): Promise<PatrolCheckpointVisit> {
    console.log('📍 Recording checkpoint visit - attempting to get location...');
    
    let finalLocation = location;
    
    if (!finalLocation) {
      // Use the new fallback strategy
      if (guardId) {
        finalLocation = await this.getLocationWithFallback(guardId, patrolId);
      } else {
        // Legacy fallback
        finalLocation = await this.getCurrentLocation();
      }
    }
    
    console.log('📍 Final location for checkpoint visit:', finalLocation);

    const { data, error } = await supabase
      .from('patrol_checkpoint_visits')
      .insert({
        patrol_id: patrolId,
        checkpoint_id: checkpointId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        latitude: finalLocation?.latitude,
        longitude: finalLocation?.longitude
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async validateCheckpoint(checkpointId: string, siteId: string): Promise<GuardianCheckpoint | null> {
    const { data, error } = await supabase
      .from('guardian_checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .eq('site_id', siteId)
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    return data
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
}
