
import { supabase } from '@/lib/supabase'
import type { PatrolObservation } from '@/types/database'

export class ObservationService {
  static async getLatestGuardLocation(guardId: string): Promise<{ latitude: number; longitude: number } | null> {
    console.log('🔄 ObservationService: Getting latest guard location from database for guard:', guardId);
    
    try {
      const { data, error } = await supabase
        .from('guard_locations')
        .select('latitude, longitude, created_at')
        .eq('guard_id', guardId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('❌ Error fetching guard location:', error);
        return null;
      }

      if (data && data.latitude && data.longitude) {
        console.log('✅ Latest guard location retrieved from database:', {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.created_at
        });
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude)
        };
      }

      console.warn('⚠️ No location data found in database for guard:', guardId);
      return null;
    } catch (error) {
      console.error('❌ Exception while fetching guard location:', error);
      return null;
    }
  }

  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    console.log('🔄 ObservationService: Getting current location...');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      // First try with high accuracy and short timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ High accuracy location obtained for observation:', {
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
          console.warn('⚠️ High accuracy location failed for observation, trying with lower accuracy:', error);
          
          // Fallback to lower accuracy with longer timeout
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ Fallback location obtained for observation:', {
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
              console.error('❌ All location attempts failed for observation:', fallbackError);
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

  static async createObservation(
    guardId: string,
    patrolId: string | undefined,
    teamId: string | undefined,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' | 'technical_issue',
    images?: string[],
    location?: { latitude: number; longitude: number }
  ): Promise<PatrolObservation> {
    console.log('📝📝📝 createObservation called with:', { guardId, title, severity });
    console.log('📝 Creating observation with data:', {
      guardId,
      patrolId,
      teamId,
      title,
      description,
      severity,
      images: images ? `${images.length} photos` : 'none',
      location: location ? `${location.latitude}, ${location.longitude}` : 'none'
    });

    // Priority order for location:
    // 1. Use provided location if available
    // 2. Try to get latest location from database
    // 3. Try to get fresh location from device
    let finalLocation = location;
    
    if (!finalLocation) {
      console.log('🔄 No location provided, fetching latest from database...');
      finalLocation = await this.getLatestGuardLocation(guardId);
    }
    
    if (!finalLocation) {
      console.log('🔄 No database location found, attempting to get fresh location...');
      finalLocation = await this.getCurrentLocation();
    }

    console.log('📍 Final location for observation:', finalLocation);

    // Get site and team from patrol session or team membership
    let resolvedTeamId = teamId;
    let siteId = null;

    // First try to get team_id and site_id from the active patrol session if available
    if (patrolId) {
      const { data: patrol } = await supabase
        .from('patrol_sessions')
        .select('team_id, site_id')
        .eq('id', patrolId)
        .maybeSingle();
      
      if (patrol) {
        resolvedTeamId = patrol.team_id;
        siteId = patrol.site_id;
        console.log('Found team and site from patrol session:', { siteId, teamId: resolvedTeamId });
      }
    }

    // If no patrol session, try to get from team membership and find an active site
    if (!resolvedTeamId) {
      const { data: teamMembership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', guardId)
        .limit(1)
        .maybeSingle();
      
      if (teamMembership) {
        resolvedTeamId = teamMembership.team_id;
      }
    }

    // If we have a teamId but no siteId, get the active site for this team
    if (resolvedTeamId && !siteId) {
      const { data: site } = await supabase
        .from('guardian_sites')
        .select('id, name')
        .eq('team_id', resolvedTeamId)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      
      if (site) {
        siteId = site.id;
        console.log('Found active site for team:', { siteId, teamId: resolvedTeamId, siteName: site.name });
      }
    }

    // Fetch guard's name for notification
    const { data: guardProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, full_name')
      .eq('id', guardId)
      .single();

    const guardName = guardProfile?.full_name || 
                    (guardProfile?.first_name && guardProfile?.last_name ? 
                     `${guardProfile.first_name} ${guardProfile.last_name}` : 
                     'Unknown Guard');

    const observationData = {
      guard_id: guardId,
      patrol_id: patrolId,
      team_id: resolvedTeamId,
      site_id: siteId, // Include the site_id in the database insert
      title,
      description,
      severity,
      status: 'pending',
      image_url: images?.[0] || null,
      latitude: finalLocation?.latitude || null,
      longitude: finalLocation?.longitude || null,
      timestamp: new Date().toISOString(),
      guard_name: guardName
    };

    console.log('💾 Inserting observation data:', observationData);

    const { data, error } = await supabase
      .from('patrol_observations')
      .insert(observationData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error creating observation:', error);
      throw error;
    }

    console.log('✅ Observation created successfully:', data);

    // Send observation notification using existing edge function
    try {
      console.log('🔔 Attempting to send observation notification...');
      await this.sendObservationNotification(data, guardName, finalLocation, siteId, images);
      console.log('✅ Observation notification sent successfully');
    } catch (notificationError) {
      console.error('❌ Failed to send observation notification:', notificationError);
      console.error('Error details:', JSON.stringify(notificationError, null, 2));
    }

    return data
  }

  private static async sendObservationNotification(
    observation: PatrolObservation,
    guardName: string,
    location: { latitude: number; longitude: number } | null,
    siteId: string | null,
    images?: string[]
  ): Promise<void> {
    try {
      // Call the existing observation notification edge function
      console.log('Calling observation notification with params:', {
        observationId: observation.id,
        title: observation.title,
        severity: observation.severity,
        teamId: observation.team_id,
        siteId: siteId,
        guardName: guardName
      });
      
      await supabase.functions.invoke('send-observation-email', {
        body: {
          observationId: observation.id,
          title: observation.title,
          description: observation.description,
          severity: observation.severity,
          guardName: guardName,
          timestamp: observation.created_at,
          teamId: observation.team_id,
          siteId: siteId,
          guardId: observation.guard_id,
          images: images || [],
          location: location ? `${location.latitude}, ${location.longitude}` : undefined,
          testMode: false
        }
      });

      console.log('Observation notification sent successfully');
    } catch (error) {
      console.error('Failed to send observation notification:', error);
      throw error;
    }
  }

  static async getObservations(guardId: string): Promise<PatrolObservation[]> {
    const { data, error } = await supabase
      .from('patrol_observations')
      .select('*')
      .eq('guard_id', guardId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
