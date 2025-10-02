
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
    severity: 'low' | 'medium' | 'high' | 'critical' | 'technical_issue',
    imageUrl?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<EmergencyReport> {
    // Always get fresh location if not provided
    console.log('Attempting to get location for emergency report...');
    const currentLocation = location || await this.getCurrentLocation();
    console.log('Location for emergency report:', currentLocation);

    // Get site from current scheduled shift (guard can only login if has active shift)
    let resolvedTeamId = teamId;
    let siteId = null;

    const now = new Date().toISOString();
    const { data: currentSchedule } = await supabase
      .from('team_schedules')
      .select('team_id')
      .contains('assigned_guards', [guardId])
      .lte('start_date', now)
      .gte('end_date', now)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (currentSchedule?.team_id) {
      resolvedTeamId = currentSchedule.team_id;
      
      // Get the site for this team
      const { data: site } = await supabase
        .from('guardian_sites')
        .select('id, name')
        .eq('team_id', resolvedTeamId)
        .eq('active', true)
        .limit(1)
        .single();
      
      if (site) {
        siteId = site.id;
        console.log('Found current shift site:', { siteId, teamId: resolvedTeamId, siteName: site.name });
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
      await this.sendEmergencyNotification(data, guardName, currentLocation, siteId);
    } catch (notificationError) {
      console.warn('Failed to send emergency notification:', notificationError);
    }

    return data
  }

  private static async sendEmergencyNotification(
    report: EmergencyReport,
    guardName: string,
    location: { latitude: number; longitude: number } | null,
    siteId: string | null
  ): Promise<void> {
    try {
      // Use the siteId passed from the calling function
      const finalSiteId = siteId;

      // Call the existing emergency notification edge function
      console.log('Calling emergency notification with params:', {
        reportId: report.id,
        title: report.title,
        severity: report.severity,
        teamId: report.team_id,
        siteId: finalSiteId,
        guardName: guardName
      });
      
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
          siteId: finalSiteId,
          guardId: report.guard_id,
          imageUrl: report.image_url,
          images: report.image_url ? [report.image_url] : [],
          testMode: false
        }
      });

      console.log('Emergency notification sent successfully');
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
