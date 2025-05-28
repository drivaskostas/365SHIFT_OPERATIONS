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
    console.log('🔍 VALIDATION START - Enhanced Debug Logging for JSON QR');
    console.log('📍 Input Parameters:', { 
      checkpointId: checkpointId,
      checkpointIdType: typeof checkpointId,
      checkpointIdLength: checkpointId?.length,
      siteId: siteId,
      siteIdType: typeof siteId,
      siteIdLength: siteId?.length
    });
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(checkpointId)) {
      console.error('❌ VALIDATION FAILED - Invalid checkpoint UUID format:', checkpointId);
      console.log('Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      return null;
    }
    
    if (!uuidRegex.test(siteId)) {
      console.error('❌ VALIDATION FAILED - Invalid site UUID format:', siteId);
      console.log('Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      return null;
    }
    
    try {
      // Step 1: Enhanced checkpoint existence check
      console.log('🔍 Step 1: Checking if checkpoint exists globally...');
      const { data: globalCheckpoint, error: globalError, count: globalCount } = await supabase
        .from('guardian_checkpoints')
        .select('*', { count: 'exact' })
        .eq('id', checkpointId)
        .maybeSingle();
      
      console.log('🔍 Global checkpoint query result:', {
        data: globalCheckpoint,
        error: globalError,
        count: globalCount,
        found: !!globalCheckpoint,
        queryCheckpointId: checkpointId
      });
      
      if (globalError) {
        console.error('❌ Database error in global checkpoint check:', globalError);
        throw globalError;
      }
      
      if (!globalCheckpoint) {
        console.error('❌ VALIDATION FAILED - Checkpoint does not exist in database');
        console.log('🔍 Debugging: Let me check if there are ANY checkpoints with similar IDs...');
        
        // Debug: Check for similar checkpoint IDs
        const { data: similarCheckpoints } = await supabase
          .from('guardian_checkpoints')
          .select('id, name, location, site_id, active')
          .ilike('id', `%${checkpointId.slice(-8)}%`);
        
        console.log('🔍 Checkpoints with similar ending:', similarCheckpoints);
        return null;
      }
      
      // Step 2: Enhanced site validation
      console.log('🔍 Step 2: Validating checkpoint belongs to correct site...');
      console.log('Checkpoint site_id:', globalCheckpoint.site_id);
      console.log('Expected site_id:', siteId);
      console.log('Site IDs match:', globalCheckpoint.site_id === siteId);
      console.log('Site ID comparison (strict):', {
        checkpointSiteId: globalCheckpoint.site_id,
        expectedSiteId: siteId,
        bothAreStrings: typeof globalCheckpoint.site_id === 'string' && typeof siteId === 'string',
        exactMatch: globalCheckpoint.site_id === siteId
      });
      
      if (globalCheckpoint.site_id !== siteId) {
        console.error('❌ VALIDATION FAILED - Checkpoint belongs to different site');
        console.log('Checkpoint belongs to site:', globalCheckpoint.site_id);
        console.log('Expected site:', siteId);
        
        // Debug: Get site names for better understanding
        const { data: checkpointSite } = await supabase
          .from('guardian_sites')
          .select('name')
          .eq('id', globalCheckpoint.site_id)
          .maybeSingle();
          
        const { data: expectedSite } = await supabase
          .from('guardian_sites')
          .select('name')
          .eq('id', siteId)
          .maybeSingle();
          
        console.log('Site details:', {
          checkpointSiteName: checkpointSite?.name,
          expectedSiteName: expectedSite?.name
        });
        
        return null;
      }
      
      // Step 3: Enhanced active status check
      console.log('🔍 Step 3: Checking if checkpoint is active...');
      console.log('Checkpoint active status:', globalCheckpoint.active);
      console.log('Active status type:', typeof globalCheckpoint.active);
      
      if (!globalCheckpoint.active) {
        console.error('❌ VALIDATION FAILED - Checkpoint is inactive');
        return null;
      }
      
      // Step 4: Final comprehensive validation
      console.log('🔍 Step 4: Final comprehensive validation...');
      const { data: validatedCheckpoint, error: validationError } = await supabase
        .from('guardian_checkpoints')
        .select('*')
        .eq('id', checkpointId)
        .eq('site_id', siteId)
        .eq('active', true)
        .maybeSingle();
      
      console.log('🔍 Final validation result:', {
        data: validatedCheckpoint,
        error: validationError,
        found: !!validatedCheckpoint,
        finalQuery: {
          checkpointId,
          siteId,
          active: true
        }
      });
      
      if (validationError) {
        console.error('❌ Database error in final validation:', validationError);
        throw validationError;
      }
      
      if (validatedCheckpoint) {
        console.log('✅ VALIDATION SUCCESS - Checkpoint is valid!');
        console.log('✅ Validated checkpoint details:', {
          id: validatedCheckpoint.id,
          name: validatedCheckpoint.name,
          location: validatedCheckpoint.location,
          site_id: validatedCheckpoint.site_id,
          active: validatedCheckpoint.active,
          created_at: validatedCheckpoint.created_at
        });
      } else {
        console.error('❌ VALIDATION FAILED - Final query returned no results');
        console.log('❌ This indicates a logic error - previous steps passed but final validation failed');
      }
      
      return validatedCheckpoint;
      
    } catch (error) {
      console.error('❌ VALIDATION ERROR - Exception during validation:', error);
      throw error;
    }
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

  // Enhanced debugging methods
  static async debugGetAllCheckpoints(siteId?: string): Promise<GuardianCheckpoint[]> {
    console.log('🔧 DEBUG: Getting all checkpoints for site:', siteId);
    
    let query = supabase.from('guardian_checkpoints').select('*');
    
    if (siteId) {
      query = query.eq('site_id', siteId);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) {
      console.error('❌ Failed to get checkpoints:', error);
      throw error;
    }
    
    console.log('🔧 DEBUG: All checkpoints found:', data?.length || 0);
    console.table(data?.map(cp => ({
      id: cp.id,
      name: cp.name,
      location: cp.location,
      site_id: cp.site_id,
      active: cp.active,
      created_at: cp.created_at
    })));
    
    return data || [];
  }

  static async debugGetSiteInfo(siteId: string): Promise<GuardianSite | null> {
    console.log('🔧 DEBUG: Getting site info for:', siteId);
    
    const { data, error } = await supabase
      .from('guardian_sites')
      .select('*')
      .eq('id', siteId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Failed to get site info:', error);
      throw error;
    }
    
    console.log('🔧 DEBUG: Site info:', data);
    return data;
  }

  static async debugValidationStep(checkpointId: string, siteId: string): Promise<void> {
    console.log('🔧 DEBUG: Running step-by-step validation debug...');
    
    try {
      // Get site info
      const site = await this.debugGetSiteInfo(siteId);
      console.log('🔧 Site exists:', !!site, site?.name);
      
      // Get all checkpoints for site
      const siteCheckpoints = await this.debugGetAllCheckpoints(siteId);
      console.log('🔧 Checkpoints in site:', siteCheckpoints.length);
      
      // Check if our checkpoint is in the list
      const foundCheckpoint = siteCheckpoints.find(cp => cp.id === checkpointId);
      console.log('🔧 Target checkpoint found in site:', !!foundCheckpoint);
      
      if (foundCheckpoint) {
        console.log('🔧 Found checkpoint details:', {
          id: foundCheckpoint.id,
          name: foundCheckpoint.name,
          location: foundCheckpoint.location,
          active: foundCheckpoint.active,
          site_id: foundCheckpoint.site_id
        });
      } else {
        console.log('🔧 Available checkpoint IDs in site:');
        siteCheckpoints.forEach(cp => console.log(`  - ${cp.id} (${cp.name})`));
        
        // Also check if the checkpoint exists in any other site
        console.log('🔧 Checking if checkpoint exists in other sites...');
        const { data: globalCheckpoint } = await supabase
          .from('guardian_checkpoints')
          .select('id, name, location, site_id, active')
          .eq('id', checkpointId)
          .maybeSingle();
          
        if (globalCheckpoint) {
          console.log('🔧 Checkpoint found in different site:', {
            id: globalCheckpoint.id,
            name: globalCheckpoint.name,
            site_id: globalCheckpoint.site_id,
            active: globalCheckpoint.active
          });
        } else {
          console.log('🔧 Checkpoint not found anywhere in database');
        }
      }
      
    } catch (error) {
      console.error('❌ Validation debug failed:', error);
    }
  }

  // New method to parse and validate QR JSON data
  static parseQRData(qrData: string): { checkpointId: string; siteId: string; additionalData?: any } | null {
    console.log('🔧 QR Data Parsing - Raw input:', qrData);
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrData);
      console.log('🔧 QR Data Parsing - Parsed JSON:', parsed);
      
      // Check if it's a checkpoint QR code with the expected structure
      if (parsed.type === 'checkpoint' && parsed.checkpointId && parsed.siteId) {
        console.log('🔧 QR Data Parsing - Valid checkpoint QR detected');
        return {
          checkpointId: parsed.checkpointId,
          siteId: parsed.siteId,
          additionalData: {
            name: parsed.name,
            location: parsed.location,
            type: parsed.type
          }
        };
      } else {
        console.log('🔧 QR Data Parsing - JSON missing required fields');
        console.log('Required: type="checkpoint", checkpointId, siteId');
        console.log('Found:', Object.keys(parsed));
        return null;
      }
    } catch (e) {
      // Not JSON, try other formats
      console.log('🔧 QR Data Parsing - Not JSON, trying as plain text');
      
      // Check if it's a plain UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(qrData.trim())) {
        console.log('🔧 QR Data Parsing - Plain UUID detected');
        return {
          checkpointId: qrData.trim(),
          siteId: '', // Will need to be provided separately
        };
      }
      
      console.log('🔧 QR Data Parsing - Unrecognized format');
      return null;
    }
  }
}
