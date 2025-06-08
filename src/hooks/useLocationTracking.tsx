
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import { PatrolService } from '@/services/PatrolService';

export const useLocationTracking = () => {
  const { profile } = useAuth();
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!profile?.id) {
      console.log('No profile ID available for location tracking');
      return;
    }

    console.log('Setting up location tracking for profile:', profile.id);

    const checkAndStartTracking = async () => {
      // Check if component is still mounted before proceeding
      if (!isMountedRef.current) {
        return;
      }

      try {
        // Check if user has an active patrol
        const activePatrol = await PatrolService.getActivePatrol(profile.id);
        
        // Double-check mount status after async operation
        if (!isMountedRef.current) {
          return;
        }
        
        console.log('Active patrol check result:', activePatrol);
        
        if (activePatrol && !LocationTrackingService.isCurrentlyTracking()) {
          console.log('Active patrol found, attempting to start location tracking');
          
          // Try to start tracking directly - let the service handle permission checking
          if ('geolocation' in navigator) {
            console.log('Geolocation API is available, starting tracking...');
            LocationTrackingService.startTracking(profile.id);
          } else {
            console.error('Geolocation not supported in this browser');
          }
        } else if (!activePatrol && LocationTrackingService.isCurrentlyTracking()) {
          console.log('No active patrol, stopping location tracking');
          LocationTrackingService.stopTracking();
        } else {
          console.log('Location tracking status:', {
            hasActivePatrol: !!activePatrol,
            isTracking: LocationTrackingService.isCurrentlyTracking()
          });
        }
      } catch (error) {
        console.error('Error checking patrol status for location tracking:', error);
      }
    };

    // Check immediately
    checkAndStartTracking();

    // Set up interval to check patrol status every 2 minutes
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        checkAndStartTracking();
      }
    }, 120000);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Stop location tracking when component unmounts
      LocationTrackingService.stopTracking();
    };
  }, [profile?.id]);

  return {
    isTracking: LocationTrackingService.isCurrentlyTracking(),
    startTracking: () => {
      if (isMountedRef.current && profile?.id) {
        return LocationTrackingService.startTracking(profile.id);
      }
      return false;
    },
    stopTracking: () => {
      if (isMountedRef.current) {
        LocationTrackingService.stopTracking();
      }
    }
  };
};
