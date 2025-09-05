import { useState, useEffect, useCallback, useRef } from 'react';
import { PatrolService } from '@/services/PatrolService';
import { ShiftValidationService } from '@/services/ShiftValidationService';
import { OfflineStorageService } from '@/services/OfflineStorageService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PatrolSession {
  id: string;
  guard_id: string;
  site_id: string;
  team_id?: string;
  start_time: string;
  end_time?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  auto_ended?: boolean; // Flag to indicate if patrol was ended automatically
}

export const usePersistentPatrol = (guardId?: string) => {
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
  const [isPatrolPersistent, setIsPatrolPersistent] = useState(false);
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const shiftCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save patrol session to persistent storage
  const savePatrolToPersistentStorage = useCallback((patrol: PatrolSession) => {
    try {
      localStorage.setItem(`persistent_patrol_${guardId}`, JSON.stringify(patrol));
      console.log('💾 Patrol saved to persistent storage:', patrol.id);
    } catch (error) {
      console.error('Error saving patrol to persistent storage:', error);
    }
  }, [guardId]);

  // Load patrol session from persistent storage
  const loadPatrolFromPersistentStorage = useCallback((): PatrolSession | null => {
    try {
      const stored = localStorage.getItem(`persistent_patrol_${guardId}`);
      if (stored) {
        const patrol = JSON.parse(stored);
        console.log('📱 Loaded patrol from persistent storage:', patrol.id);
        return patrol;
      }
    } catch (error) {
      console.error('Error loading patrol from persistent storage:', error);
    }
    return null;
  }, [guardId]);

  // Clear patrol from persistent storage
  const clearPersistentPatrol = useCallback(() => {
    try {
      localStorage.removeItem(`persistent_patrol_${guardId}`);
      console.log('🗑️ Cleared persistent patrol storage');
    } catch (error) {
      console.error('Error clearing persistent storage:', error);
    }
  }, [guardId]);

  // Check if patrol should be auto-ended due to shift end
  const checkPatrolAutoEnd = useCallback(async () => {
    if (!activePatrol || !guardId || !isMountedRef.current) return;

    try {
      const shiftValidation = await ShiftValidationService.validateGuardShiftAccess(guardId);
      
      // If no active shift, auto-end the patrol
      if (!shiftValidation.canLogin && activePatrol.status === 'active') {
        console.log('⏰ Auto-ending patrol due to shift end');
        
        // End patrol with auto-end flag
        let endedPatrol: PatrolSession;
        
        if (OfflineStorageService.isOnline()) {
          const { data, error } = await supabase
            .from('patrol_sessions')
            .update({
              end_time: new Date().toISOString(),
              status: 'completed',
              updated_at: new Date().toISOString(),
              auto_ended: true
            })
            .eq('id', activePatrol.id)
            .select()
            .single();

          if (error) throw error;
          endedPatrol = data;
        } else {
          // Save offline auto-end
          OfflineStorageService.savePatrolActivity(activePatrol.id, guardId, {
            type: 'patrol_auto_end',
            data: {
              end_time: new Date().toISOString(),
              auto_ended: true
            },
            timestamp: new Date().toISOString()
          });
          
          endedPatrol = {
            ...activePatrol,
            end_time: new Date().toISOString(),
            status: 'completed',
            auto_ended: true,
            updated_at: new Date().toISOString()
          };
        }

        setActivePatrol(endedPatrol);
        clearPersistentPatrol();
        
        toast({
          title: "⏰ Patrol Auto-Ended",
          description: "Your patrol was automatically ended due to shift completion.",
        });
      }
    } catch (error) {
      console.error('Error checking patrol auto-end:', error);
    }
  }, [activePatrol, guardId, clearPersistentPatrol, toast]);

  // Initialize patrol persistence
  useEffect(() => {
    if (!guardId) return;

    isMountedRef.current = true;

    // Load existing persistent patrol
    const existingPatrol = loadPatrolFromPersistentStorage();
    if (existingPatrol && existingPatrol.status === 'active') {
      setActivePatrol(existingPatrol);
      setIsPatrolPersistent(true);
      console.log('🔄 Restored persistent patrol session:', existingPatrol.id);
      
      toast({
        title: "📱 Patrol Restored",
        description: "Your previous patrol session has been restored.",
      });
    }

    // Set up shift monitoring for auto-end
    shiftCheckIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        checkPatrolAutoEnd();
      }
    }, 60000); // Check every minute

    return () => {
      isMountedRef.current = false;
      if (shiftCheckIntervalRef.current) {
        clearInterval(shiftCheckIntervalRef.current);
        shiftCheckIntervalRef.current = null;
      }
    };
  }, [guardId, loadPatrolFromPersistentStorage, checkPatrolAutoEnd, toast]);

  // Enhanced start patrol with persistence
  const startPersistentPatrol = useCallback(async (siteId: string, teamId?: string) => {
    if (!guardId) throw new Error('Guard ID required');

    const patrol = await PatrolService.startPatrol(siteId, guardId, teamId);
    
    // Enhanced patrol object with persistence flag
    const persistentPatrol = {
      ...patrol,
      auto_ended: false
    };

    setActivePatrol(persistentPatrol);
    setIsPatrolPersistent(true);
    savePatrolToPersistentStorage(persistentPatrol);
    
    return persistentPatrol;
  }, [guardId, savePatrolToPersistentStorage]);

  // Enhanced end patrol with persistence cleanup
  const endPersistentPatrol = useCallback(async (userInitiated: boolean = true) => {
    if (!activePatrol) return null;

    const patrol = await PatrolService.endPatrol(activePatrol.id);
    
    // Mark as user-initiated or auto-ended
    const endedPatrol = {
      ...patrol,
      auto_ended: !userInitiated
    };

    setActivePatrol(endedPatrol);
    setIsPatrolPersistent(false);
    clearPersistentPatrol();
    
    return endedPatrol;
  }, [activePatrol, clearPersistentPatrol]);

  // Force patrol session to be persistent (survive app restarts)
  const makePersistent = useCallback(() => {
    if (activePatrol) {
      setIsPatrolPersistent(true);
      savePatrolToPersistentStorage(activePatrol);
    }
  }, [activePatrol, savePatrolToPersistentStorage]);

  // Check for offline patrol sessions and restore them
  const restoreOfflinePatrols = useCallback(async () => {
    if (!guardId) return;

    try {
      const offlineData = OfflineStorageService.getOfflineData();
      const unendedPatrols = offlineData.filter(p => 
        p.guardId === guardId && 
        !p.activities.some(a => a.type === 'patrol_end' || a.type === 'patrol_auto_end')
      );

      if (unendedPatrols.length > 0) {
        const latestPatrol = unendedPatrols[unendedPatrols.length - 1];
        const restoredPatrol: PatrolSession = {
          id: latestPatrol.patrolId,
          guard_id: latestPatrol.guardId,
          site_id: '',
          start_time: latestPatrol.lastSync,
          status: 'active',
          created_at: latestPatrol.lastSync,
          updated_at: new Date().toISOString(),
          auto_ended: false
        };

        setActivePatrol(restoredPatrol);
        setIsPatrolPersistent(true);
        savePatrolToPersistentStorage(restoredPatrol);

        toast({
          title: "📴 Offline Patrol Restored",
          description: "Your offline patrol session has been restored.",
        });
      }
    } catch (error) {
      console.error('Error restoring offline patrols:', error);
    }
  }, [guardId, savePatrolToPersistentStorage, toast]);

  // Update active patrol in persistent storage
  useEffect(() => {
    if (activePatrol && isPatrolPersistent) {
      savePatrolToPersistentStorage(activePatrol);
    }
  }, [activePatrol, isPatrolPersistent, savePatrolToPersistentStorage]);

  return {
    activePatrol,
    isPatrolPersistent,
    startPersistentPatrol,
    endPersistentPatrol,
    makePersistent,
    restoreOfflinePatrols,
    clearPersistentPatrol
  };
};