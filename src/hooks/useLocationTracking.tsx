
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import { PatrolService } from '@/services/PatrolService';

export const useLocationTracking = () => {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) {
      console.log('No profile ID available for location tracking');
      return;
    }

    console.log('Setting up location tracking for profile:', profile.id);

    const checkAndStartTracking = async () => {
      try {
        // Check if user has an active patrol
        const activePatrol = await PatrolService.getActivePatrol(profile.id);
        console.log('Active patrol check result:', activePatrol);
        
        if (activePatrol && !LocationTrackingService.isCurrentlyTracking()) {
          console.log('Active patrol found, starting location tracking');
          
          // Check if location is available before starting tracking
          if ('geolocation' in navigator) {
            // Request permission explicitly before starting tracking
            navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
              console.log('Geolocation permission status:', permission.state);
              
              if (permission.state === 'granted' || permission.state === 'prompt') {
                LocationTrackingService.startTracking(profile.id);
              } else {
                console.warn('Geolocation permission denied');
              }
            }).catch(() => {
              // Fallback for browsers that don't support permissions API
              console.log('Permissions API not supported, attempting to start tracking anyway');
              LocationTrackingService.startTracking(profile.id);
            });
          } else {
            console.error('Geolocation not supported');
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
