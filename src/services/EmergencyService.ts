
import { supabase } from '@/lib/supabase'
import type { EmergencyReport } from '@/types/database'

export class EmergencyService {
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
          console.log('Emergency location obtained:', {
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
          console.warn('High accuracy location failed for emergency, trying with lower accuracy:', error);
          // Fallback to lower accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Fallback emergency location obtained:', {
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
              console.error('Emergency location access denied or failed:', fallbackError);
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

  static async createEmergencyReport(
    guardId: string,
    patrolId: string | undefined,
    teamId: string | undefined,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    imageUrl?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<EmergencyReport> {
    // Always get fresh location if not provided
    console.log('Attempting to get location for emergency report...');
    const currentLocation = location || await this.getCurrentLocation();
    console.log('Location for emergency report:', currentLocation);

    // Get team_id if not provided
    let resolvedTeamId = teamId;
    if (!resolvedTeamId) {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', guardId)
        .single();
      
      resolvedTeamId = teamMember?.team_id;
    }

    // Get site_id from guardian_sites for the team
    let siteId = null;
    if (resolvedTeamId) {
      const { data: site } = await supabase
        .from('guardian_sites')
        .select('id')
        .eq('team_id', resolvedTeamId)
        .eq('active', true)
        .limit(1)
        .single();
      
      siteId = site?.id;
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

    const { data, error } = await supabase
      .from('emergency_reports')
      .insert({
        guard_id: guardId,
        patrol_id: patrolId,
        team_id: resolvedTeamId,
        title,
        description,
        severity,
        status: 'pending',
        image_url: imageUrl,
        location: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : undefined,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        incident_time: new Date().toISOString(),
        guard_name: guardName
      })
      .select()
      .single()

    if (error) throw error

    // Send emergency notification using existing edge function
    try {
      await this.sendEmergencyNotification(data, guardName, currentLocation);
    } catch (notificationError) {
      console.warn('Failed to send emergency notification:', notificationError);
    }

    return data
  }

  private static async sendEmergencyNotification(
    report: EmergencyReport,
    guardName: string,
    location: { latitude: number; longitude: number } | null
  ): Promise<void> {
    try {
      // Get site_id from active patrol if available, or find closest site
      let siteId = null;
      if (report.patrol_id) {
        const { data: patrol } = await supabase
          .from('patrol_sessions')
          .select('site_id')
          .eq('id', report.patrol_id)
          .single();
        
        siteId = patrol?.site_id;
      } else if (report.team_id && location) {
        // Find closest active site for the team
        const { data: sites } = await supabase
          .from('guardian_sites')
          .select('id')
          .eq('team_id', report.team_id)
          .eq('active', true)
          .limit(1);
        
        if (sites && sites.length > 0) {
          siteId = sites[0].id;
        }
      }

      // Call the existing emergency notification edge function
      await supabase.functions.invoke('send-emergency-notification', {
        body: {
          reportId: report.id,
          emergencyType: 'general_emergency',
          title: report.title,
          description: report.description,
          severity: report.severity,
          locationDescription: report.location || 'Location not available',
          guardName: guardName,
          timestamp: report.created_at,
          teamId: report.team_id,
          siteId: siteId,
          guardId: report.guard_id,
          imageUrl: report.image_url,
          images: report.image_url ? [report.image_url] : [],
          testMode: false
        }
      });

      console.log('Emergency notification sent successfully to existing notification system');
    } catch (error) {
      console.error('Failed to send emergency notification:', error);
      throw error;
    }
  }

  static async getEmergencyReports(guardId: string): Promise<EmergencyReport[]> {
    const { data, error } = await supabase
      .from('emergency_reports')
      .select('*')
      .eq('guard_id', guardId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
