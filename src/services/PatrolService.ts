import { supabase } from '@/lib/supabase'
import type { PatrolSession, GuardianSite, PatrolCheckpointVisit, GuardianCheckpoint } from '@/types/database'
import { OfflineStorageService } from './OfflineStorageService'
import { OfflineSyncService } from './OfflineSyncService'

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
          timeout: 3000,
          enableHighAccuracy: false,
          maximumAge: 300000
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
    
    const currentLocation = await this.getCurrentLocation();
    if (currentLocation) {
      console.log('✅ Got current GPS location');
      return currentLocation;
    }

    console.log('🔄 GPS failed, trying last known location from database...');
    const lastKnownLocation = await this.getLastKnownLocation(guardId, patrolId);
    if (lastKnownLocation) {
      console.log('✅ Using last known location from database');
      return lastKnownLocation;
    }

    console.log('❌ No location available from any source');
    return null;
  }

  static async startPatrol(siteId: string, guardId: string, teamId?: string, checkpointGroupId?: string): Promise<PatrolSession> {
    console.log('🚀 Starting patrol...', { siteId, guardId, teamId, checkpointGroupId });
    
    // First verify the guard is assigned to this site (allow shift-based assignments)
    const { data: siteGuard, error: assignmentError } = await supabase
      .from('site_guards')
      .select('*')
      .eq('guard_id', guardId)
      .eq('site_id', siteId)
      .maybeSingle()

    console.log('📋 Site guard assignment check:', { siteGuard, assignmentError });
    
    if (assignmentError) throw assignmentError
    
    // If no direct site assignment, check if guard has a valid shift for this team's site
    if (!siteGuard && teamId) {
      console.log('🔍 No direct site assignment, checking shift for team:', teamId);
      
      // First verify the site belongs to this team
      const { data: site, error: siteError } = await supabase
        .from('guardian_sites')
        .select('id, team_id')
        .eq('id', siteId)
        .eq('team_id', teamId)
        .single();

      console.log('🏢 Site-team check:', { site, siteError });

      if (siteError || !site) {
        console.error('❌ Error checking site-team assignment:', siteError);
        throw new Error('You are not assigned to this site. Please contact your supervisor.');
      }

      // Check if guard has an active shift for this team
      const { data: shiftAssignment, error: shiftError } = await supabase
        .from('team_schedules')
        .select('id, assigned_guards')
        .eq('team_id', teamId)
        .contains('assigned_guards', [guardId])
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date(Date.now() + 30 * 60 * 1000).toISOString()) // 30 min grace
        .maybeSingle();

      console.log('📅 Shift assignment check:', { shiftAssignment, shiftError });

      if (shiftError) {
        console.error('❌ Error checking shift assignment:', shiftError);
      }

      if (!shiftAssignment) {
        console.error('❌ No shift assignment found');
        throw new Error('You are not assigned to this site. Please contact your supervisor.');
      }
      
      console.log('✅ Shift validation passed');
    } else if (!siteGuard && !teamId) {
      console.error('❌ No site guard and no team ID provided');
      throw new Error('You are not assigned to this site. Please contact your supervisor.');
    } else {
      console.log('✅ Direct site assignment found');
    }

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
      } else if (teamMember) {
        resolvedTeamId = teamMember.team_id
      }
    }

    // Get current location
    console.log('Attempting to get location for patrol start...');
    const location = await this.getCurrentLocation();
    console.log('Location for patrol start:', location);

    let patrol: PatrolSession;

    if (OfflineStorageService.isOnline()) {
      const { data, error } = await supabase
        .from('patrol_sessions')
        .insert({
          guard_id: guardId,
          site_id: siteId,
          start_time: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error
      patrol = data;
      console.log('✅ Patrol started online:', patrol.id);
      
      // Store checkpoint group ID in localStorage for QRScanner to access
      if (checkpointGroupId) {
        localStorage.setItem(`checkpoint_group_${patrol.id}`, checkpointGroupId);
        console.log(`💾 Stored checkpoint group ${checkpointGroupId} for patrol ${patrol.id}`);
      }
      
      // Log location to guard_locations table
      if (location) {
        await supabase
          .from('guard_locations')
          .insert({
            guard_id: guardId,
            patrol_id: patrol.id,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          });
        console.log('📍 Location logged for patrol start');
      }
    } else {
      // Create offline patrol session
      patrol = {
        id: `offline_${Date.now()}`,
        guard_id: guardId,
        site_id: siteId,
        start_time: new Date().toISOString(),
        status: 'active',
        latitude: location?.latitude,
        longitude: location?.longitude,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PatrolSession;

      // Save to offline storage
      OfflineStorageService.savePatrolActivity(patrol.id, guardId, {
        type: 'patrol_start',
        data: patrol,
        timestamp: new Date().toISOString()
      });
      
      // Store checkpoint group ID in localStorage for QRScanner to access
      if (checkpointGroupId) {
        localStorage.setItem(`checkpoint_group_${patrol.id}`, checkpointGroupId);
        console.log(`💾 Stored checkpoint group ${checkpointGroupId} for offline patrol ${patrol.id}`);
      }

      console.log('📴 Patrol started offline:', patrol.id);
    }

    return patrol;
  }

  static async endPatrol(patrolId: string): Promise<PatrolSession> {
    console.log('Attempting to end patrol:', patrolId);
    
    // Use a timeout wrapper for location to prevent hanging
    let location: { latitude: number; longitude: number } | null = null;
    try {
      location = await Promise.race([
        this.getCurrentLocation(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 second timeout
      ]);
      console.log('Location for patrol end:', location);
    } catch (error) {
      console.warn('Location failed for patrol end:', error);
      location = null;
    }

    if (OfflineStorageService.isOnline()) {
      const { data, error } = await supabase
        .from('patrol_sessions')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', patrolId)
        .select()
        .single()

      if (error) throw error
      console.log('✅ Patrol ended online:', data.id);
      
      // Clean up checkpoint group from localStorage
      localStorage.removeItem(`checkpoint_group_${patrolId}`);
      console.log(`🗑️ Cleaned up checkpoint group for patrol ${patrolId}`);
      
      // Log location to guard_locations table
      if (location) {
        await supabase
          .from('guard_locations')
          .insert({
            guard_id: data.guard_id,
            patrol_id: patrolId,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          });
        console.log('📍 Location logged for patrol end');
      }
      
      return data;
    } else {
      // Handle offline patrol end
      const offlineData = OfflineStorageService.getOfflineData();
      const patrolData = offlineData.find(p => p.patrolId === patrolId);

      if (!patrolData) {
        throw new Error('Patrol session not found in offline storage');
      }

      // Save end patrol activity
      OfflineStorageService.savePatrolActivity(patrolId, patrolData.guardId, {
        type: 'patrol_end',
        data: {
          end_time: new Date().toISOString(),
          latitude: location?.latitude,
          longitude: location?.longitude
        },
        timestamp: new Date().toISOString()
      });

      console.log('📴 Patrol ended offline:', patrolId);
      
      // Clean up checkpoint group from localStorage
      localStorage.removeItem(`checkpoint_group_${patrolId}`);
      console.log(`🗑️ Cleaned up checkpoint group for offline patrol ${patrolId}`);
      
      // Return mock completed patrol
      return {
        id: patrolId,
        guard_id: patrolData.guardId,
        site_id: '',
        start_time: patrolData.lastSync,
        end_time: new Date().toISOString(),
        status: 'completed',
        created_at: patrolData.lastSync,
        updated_at: new Date().toISOString()
      } as PatrolSession;
    }
  }

  static async getActivePatrol(guardId: string): Promise<PatrolSession | null> {
    try {
      if (OfflineStorageService.isOnline()) {
        const { data, error } = await supabase
          .from('patrol_sessions')
          .select('*')
          .eq('guard_id', guardId)
          .eq('status', 'active')
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') throw error
        return data;
      } else {
        // Check offline storage for active patrol
        const offlineData = OfflineStorageService.getOfflineData();
        const activePatrol = offlineData.find(p => 
          p.guardId === guardId && 
          !p.activities.some(a => a.type === 'patrol_end')
        );

        if (activePatrol) {
          return {
            id: activePatrol.patrolId,
            guard_id: activePatrol.guardId,
            site_id: '',
            start_time: activePatrol.lastSync,
            status: 'active',
            created_at: activePatrol.lastSync,
            updated_at: new Date().toISOString()
          } as PatrolSession;
        }

        return null;
      }
    } catch (error) {
      console.error('Error getting active patrol:', error);
      return null;
    }
  }

  static async getAvailableSites(guardId: string): Promise<GuardianSite[]> {
    if (!OfflineStorageService.isOnline()) {
      console.log('📴 Offline mode: returning cached sites (if any)');
      // In a real implementation, you might cache sites in localStorage
      return [];
    }

    const { data: siteAssignments, error: assignmentError } = await supabase
      .from('site_guards')
      .select('site_id')
      .eq('guard_id', guardId)

    if (assignmentError) throw assignmentError
    
    if (!siteAssignments || siteAssignments.length === 0) {
      return []
    }

    const siteIds = siteAssignments.map(assignment => assignment.site_id)

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
      if (guardId) {
        finalLocation = await this.getLocationWithFallback(guardId, patrolId);
      } else {
        finalLocation = await this.getCurrentLocation();
      }
    }
    
    console.log('📍 Final location for checkpoint visit:', finalLocation);

    if (OfflineStorageService.isOnline()) {
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
      console.log('✅ Checkpoint visit recorded online');
      return data;
    } else {
      // Save checkpoint visit offline
      const offlineId = OfflineStorageService.savePatrolActivity(patrolId, guardId!, {
        type: 'checkpoint_visit',
        data: {
          patrolId,
          checkpointId,
          latitude: finalLocation?.latitude,
          longitude: finalLocation?.longitude
        },
        timestamp: new Date().toISOString()
      });

      console.log('📴 Checkpoint visit recorded offline:', offlineId);

      // Return mock checkpoint visit
      return {
        id: offlineId || 'offline_temp',
        patrol_id: patrolId,
        checkpoint_id: checkpointId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        latitude: finalLocation?.latitude,
        longitude: finalLocation?.longitude,
        created_at: new Date().toISOString()
      } as PatrolCheckpointVisit;
    }
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
      .select('site_id, checkpoint_group_id')
      .eq('id', patrolId)
      .single()

    if (!patrol) return { totalCheckpoints: 0, visitedCheckpoints: 0, progress: 0 }

    // Get total checkpoints for the site (filtered by checkpoint group if specified)
    let checkpointsCountQuery = supabase
      .from('guardian_checkpoints')
      .select('*', { count: 'exact' })
      .eq('site_id', patrol.site_id)
      .eq('active', true);
    
    // Filter by checkpoint group if specified in patrol
    if (patrol.checkpoint_group_id) {
      checkpointsCountQuery = checkpointsCountQuery.eq('checkpoint_group_id', patrol.checkpoint_group_id);
    }
    
    const { count: totalCheckpoints } = await checkpointsCountQuery;

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

  static async syncOfflineData(guardId: string): Promise<boolean> {
    return OfflineSyncService.syncAllData(guardId);
  }

  static hasUnsyncedData(): boolean {
    const unsyncedActivities = OfflineStorageService.getUnsyncedActivities();
    const unsyncedLocations = OfflineStorageService.getUnsyncedLocations();
    return unsyncedActivities.length > 0 || unsyncedLocations.length > 0;
  }

  static getOfflineStatus() {
    const unsyncedActivities = OfflineStorageService.getUnsyncedActivities();
    const unsyncedLocations = OfflineStorageService.getUnsyncedLocations();
    
    return {
      isOnline: OfflineStorageService.isOnline(),
      unsyncedActivities: unsyncedActivities.length,
      unsyncedLocations: unsyncedLocations.length,
      totalUnsynced: unsyncedActivities.length + unsyncedLocations.length
    };
  }
}
