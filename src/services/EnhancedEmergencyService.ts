import { supabase } from '@/lib/supabase'
import type { EmergencyReport } from '@/types/database'
import type { EmergencyReportData, EmergencyReportHistory } from '@/types/emergency'

// Helper function to convert base64 to blob
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

export class EnhancedEmergencyService {
  private static async uploadImageToStorage(base64Image: string, guardId: string): Promise<string> {
    try {
      // Convert base64 to blob
      const blob = base64ToBlob(base64Image);
      
      // Generate unique filename
      const timestamp = new Date().getTime();
      const filename = `emergency-${guardId}-${timestamp}.jpg`;
      const filePath = `emergency-reports/${filename}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

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
              maximumAge: 300000
            }
          );
        },
        { 
          timeout: 8000,
          enableHighAccuracy: true,
          maximumAge: 60000
        }
      );
    });
  }

  static async createEmergencyReport(
    guardId: string,
    patrolId: string | undefined,
    teamId: string | undefined,
    reportData: EmergencyReportData
  ): Promise<EmergencyReport> {
    const currentLocation = await this.getCurrentLocation();
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
        .limit(1)
        .maybeSingle();
      
      if (site) {
        siteId = site.id;
        console.log('Found current shift site:', { siteId, teamId: resolvedTeamId, siteName: site.name });
      }
    }

    // Upload images to storage if any
    let uploadedImageUrl: string | null = null;
    if (reportData.images && reportData.images.length > 0) {
      try {
        uploadedImageUrl = await this.uploadImageToStorage(reportData.images[0], guardId);
        console.log('Image uploaded successfully:', uploadedImageUrl);
      } catch (uploadError) {
        console.error('Failed to upload image:', uploadError);
        // Continue without image if upload fails
      }
    }

    // Fetch guard's name
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
        title: reportData.title,
        description: reportData.description,
        severity: reportData.severity,
        status: 'pending',
        location: reportData.location_description,
        involved_persons: reportData.involved_persons_details,
        image_url: uploadedImageUrl,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        incident_time: new Date().toISOString(),
        guard_name: guardName
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating emergency report:', error);
      throw error;
    }

    console.log('Emergency report created successfully:', data);

    // Log creation in history
    try {
      await this.addReportHistory(data.id, 'created', undefined, undefined, 'Emergency report created');
    } catch (historyError) {
      console.warn('Failed to log report history:', historyError);
    }

    // Send emergency notification
    try {
      await this.sendEmergencyNotification(data, reportData, siteId);
    } catch (notificationError) {
      console.warn('Failed to send emergency notification:', notificationError);
    }

    return data
  }

  private static async sendEmergencyNotification(
    report: EmergencyReport,
    reportData: EmergencyReportData,
    siteId: string | null
  ): Promise<void> {
    try {
      // Get guard name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name')
        .eq('id', report.guard_id)
        .single();

      const guardName = profile?.full_name || 
                      (profile?.first_name && profile?.last_name ? 
                       `${profile.first_name} ${profile.last_name}` : 
                       'Unknown Guard');

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
      
      const result = await supabase.functions.invoke('send-emergency-notification', {
        body: {
          reportId: report.id,
          emergencyType: reportData.emergency_type,
          title: report.title,
          description: report.description,
          severity: report.severity,
          locationDescription: report.location || reportData.location_description,
          involvedPersons: report.involved_persons,
          guardName: guardName,
          timestamp: report.created_at,
          teamId: report.team_id,
          siteId: finalSiteId,
          guardId: report.guard_id,
          imageUrl: report.image_url,
          testMode: false
        }
      });

      console.log('Edge function result:', result);
      console.log('Emergency notification sent successfully to existing notification system');
    } catch (error) {
      console.error('Failed to send emergency notification:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      // Don't throw error - report was still created successfully
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

  static async getAllEmergencyReports(): Promise<EmergencyReport[]> {
    const { data, error } = await supabase
      .from('emergency_reports')
      .select(`
        *,
        profiles!emergency_reports_guard_id_fkey(first_name, last_name, full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateReportStatus(
    reportId: string,
    newStatus: string,
    note?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('emergency_reports')
      .update({ 
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', reportId)

    if (error) throw error

    if (note) {
      await this.addReportHistory(reportId, 'note_added', undefined, undefined, note);
    }
  }

  static async addReportNote(reportId: string, note: string): Promise<void> {
    // Get current notes
    const { data: report, error: fetchError } = await supabase
      .from('emergency_reports')
      .select('notes')
      .eq('id', reportId)
      .single()

    if (fetchError) throw fetchError

    const currentNotes = report.notes || []
    const newNote = {
      text: note,
      author_id: (await supabase.auth.getUser()).data.user?.id,
      timestamp: new Date().toISOString()
    }

    const { error } = await supabase
      .from('emergency_reports')
      .update({ notes: [...currentNotes, newNote] })
      .eq('id', reportId)

    if (error) throw error

    await this.addReportHistory(reportId, 'note_added', undefined, undefined, note);
  }

  static async getReportHistory(reportId: string): Promise<EmergencyReportHistory[]> {
    const { data, error } = await supabase
      .from('emergency_report_history')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async deleteReport(reportId: string): Promise<void> {
    await this.addReportHistory(reportId, 'deleted', undefined, undefined, 'Emergency report deleted');

    const { error } = await supabase
      .from('emergency_reports')
      .delete()
      .eq('id', reportId)

    if (error) throw error
  }

  private static async addReportHistory(
    reportId: string,
    actionType: string,
    previousStatus?: string,
    newStatus?: string,
    note?: string
  ): Promise<void> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, full_name')
      .eq('id', user.user.id)
      .single()

    const userName = profile?.full_name || 
                   (profile?.first_name && profile?.last_name ? 
                    `${profile.first_name} ${profile.last_name}` : 
                    user.user.email || 'Unknown User')

    const { error } = await supabase
      .from('emergency_report_history')
      .insert({
        report_id: reportId,
        action_type: actionType,
        previous_status: previousStatus,
        new_status: newStatus,
        note: note,
        user_id: user.user.id,
        user_name: userName
      })

    if (error) console.error('Error adding report history:', error)
  }
}
