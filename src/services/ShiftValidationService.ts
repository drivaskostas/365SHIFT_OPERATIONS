
import { supabase } from '@/lib/supabase'

export class ShiftValidationService {
  static async validateGuardShiftAccess(guardId: string): Promise<{
    canLogin: boolean
    message?: string
    currentShift?: any
  }> {
    const now = new Date()
    const currentTime = now.toISOString()
    
    try {
      // Check for active shifts within a 30-minute window before shift start
      const { data: activeShifts, error } = await supabase
        .from('team_schedules')
        .select(`
          id,
          title,
          start_date,
          end_date,
          location,
          assigned_guards
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
        const shiftStart = new Date(currentShift.start_date)
        const shiftEnd = new Date(currentShift.end_date)
        
        if (now < shiftStart) {
          const minutesUntilStart = Math.ceil((shiftStart.getTime() - now.getTime()) / (1000 * 60))
          return {
            canLogin: true,
            message: `Your shift "${currentShift.title}" starts in ${minutesUntilStart} minutes at ${shiftStart.toLocaleTimeString()}.`,
            currentShift
          }
        } else {
          return {
            canLogin: true,
            message: `Welcome to your shift "${currentShift.title}" at ${currentShift.location}.`,
            currentShift
          }
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
}
