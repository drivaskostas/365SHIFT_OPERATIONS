
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import { PatrolService } from '@/services/PatrolService';

export const useLocationTracking = () => {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    const checkAndStartTracking = async () => {
      try {
        // Check if user has an active patrol
        const activePatrol = await PatrolService.getActivePatrol(profile.id);
        
        if (activePatrol && !LocationTrackingService.isCurrentlyTracking()) {
          console.log('Active patrol found, starting location tracking');
          await LocationTrackingService.startTracking(profile.id);
        } else if (!activePatrol && LocationTrackingService.isCurrentlyTracking()) {
          console.log('No active patrol, stopping location tracking');
          LocationTrackingService.stopTracking();
        }
      } catch (error) {
        console.error('Error checking patrol status for location tracking:', error);
      }
    };

    // Check immediately
    checkAndStartTracking();

    // Set up interval to check patrol status every 2 minutes
    const interval = setInterval(checkAndStartTracking, 120000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      LocationTrackingService.stopTracking();
    };
  }, [profile?.id]);

  return {
    isTracking: LocationTrackingService.isCurrentlyTracking(),
    startTracking: () => profile?.id && LocationTrackingService.startTracking(profile.id),
    stopTracking: LocationTrackingService.stopTracking
  };
};
