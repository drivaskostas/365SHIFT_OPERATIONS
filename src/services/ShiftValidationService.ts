
import { supabase } from '@/lib/supabase'

export class ShiftValidationService {
  // Roles that can bypass shift validation
  private static readonly BYPASS_SHIFT_ROLES = ['admin', 'super_admin', 'supervisor', 'manager'];

  static async validateGuardShiftAccess(guardId: string): Promise<{
    canLogin: boolean
    message?: string
    currentShift?: any
    assignedSite?: any
    assignedTeam?: any
    bypassedShiftCheck?: boolean
  }> {
    const now = new Date()
    const currentTime = now.toISOString()
    
    try {
      // First, check if user has a role that bypasses shift validation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('Role')
        .eq('id', guardId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // If user is admin, super_admin, supervisor, or manager - allow access without shift
      if (profile?.Role && this.BYPASS_SHIFT_ROLES.includes(profile.Role)) {
        console.log(`User ${guardId} has role ${profile.Role} - bypassing shift validation`);
        
        // Try to get a default site/team for the user
        const { data: userTeams } = await supabase
          .from('team_members')
          .select(`
            team_id,
            teams:team_id (
              id,
              name
            )
          `)
          .eq('user_id', guardId)
          .limit(1);

        let assignedSite = null;
        const teamData = userTeams?.[0]?.teams;
        const assignedTeam = Array.isArray(teamData) ? teamData[0] : teamData;

        if (assignedTeam?.id) {
          const { data: siteData } = await supabase
            .from('guardian_sites')
            .select('*')
            .eq('team_id', assignedTeam.id)
            .eq('active', true)
            .limit(1)
            .maybeSingle();
          
          assignedSite = siteData;
        }

        return {
          canLogin: true,
          message: `Welcome! You have ${profile.Role} access - no shift required.`,
          assignedSite,
          assignedTeam,
          bypassedShiftCheck: true
        };
      }

      // For regular guards, check for active shifts within a 30-minute window before shift start
      const { data: activeShifts, error } = await supabase
        .from('team_schedules')
        .select(`
          id,
          title,
          start_date,
          end_date,
          location,
          assigned_guards,
          team_id,
          teams:team_id (
            id,
            name
          )
        `)
        .contains('assigned_guards', [guardId])
        .lte('start_date', new Date(now.getTime() + 30 * 60 * 1000).toISOString()) // 30 min grace period
        .gte('end_date', currentTime)
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error checking shift access:', error)
        return {
          canLogin: false,
          message: 'Unable to verify shift access. Please contact your supervisor.'
        }
      }

      if (!activeShifts || activeShifts.length === 0) {
        return {
          canLogin: false,
          message: 'You do not have any active shifts scheduled. Please contact your supervisor for shift assignments.'
        }
      }

      // Find the most relevant shift (current or upcoming within grace period)
      const currentShift = activeShifts.find(shift => {
        const shiftStart = new Date(shift.start_date)
        const shiftEnd = new Date(shift.end_date)
        const graceStart = new Date(shiftStart.getTime() - 30 * 60 * 1000) // 30 min before
        
        return now >= graceStart && now <= shiftEnd
      })

      if (currentShift) {
        // Get the site information for this team
        const { data: siteData, error: siteError } = await supabase
          .from('guardian_sites')
          .select('*')
          .eq('team_id', currentShift.team_id)
          .eq('active', true)
          .single()

        if (siteError && siteError.code !== 'PGRST116') {
          console.error('Error fetching site data:', siteError)
        }

        const shiftStart = new Date(currentShift.start_date)
        const shiftEnd = new Date(currentShift.end_date)
        
        let message = ''
        if (now < shiftStart) {
          const minutesUntilStart = Math.ceil((shiftStart.getTime() - now.getTime()) / (1000 * 60))
          message = `Your shift "${currentShift.title}" starts in ${minutesUntilStart} minutes at ${shiftStart.toLocaleTimeString()}.`
        } else {
          message = `Welcome to your shift "${currentShift.title}" at ${currentShift.location}.`
        }

        if (siteData) {
          message += ` You can start patrols at ${siteData.name}.`
        }

        return {
          canLogin: true,
          message,
          currentShift,
          assignedSite: siteData,
          assignedTeam: currentShift.teams
        }
      }

      return {
        canLogin: false,
        message: 'You do not have any active shifts at this time. Please check your schedule or contact your supervisor.'
      }
    } catch (error) {
      console.error('Shift validation error:', error)
      return {
        canLogin: false,
        message: 'Unable to verify shift access. Please try again or contact your supervisor.'
      }
    }
  }

  static async getGuardActiveShiftSite(guardId: string): Promise<{
    siteId?: string
    teamId?: string
    shiftInfo?: any
  }> {
    const validation = await this.validateGuardShiftAccess(guardId)
    
    if (validation.canLogin && validation.assignedSite) {
      return {
        siteId: validation.assignedSite.id,
        teamId: validation.assignedTeam?.id,
        shiftInfo: validation.currentShift
      }
    }
    
    return {}
  }
}
