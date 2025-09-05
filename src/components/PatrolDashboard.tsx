import { useState, useEffect, useCallback } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, User, TrendingUp, Play, Square, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { supabase } from '@/integrations/supabase/client';
import { PatrolService } from '@/services/PatrolService';
import { ShiftValidationService } from '@/services/ShiftValidationService';
import TeamObservations from '@/components/TeamObservations';
import PatrolSessions from '@/components/PatrolSessions';
import TeamEmergencyReports from '@/components/TeamEmergencyReports';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SupervisorReportForm from '@/components/SupervisorReportForm';
import { useToast } from '@/components/ui/use-toast';
import { useOfflinePatrol } from '@/hooks/useOfflinePatrol';
import { usePersistentPatrol } from '@/hooks/usePersistentPatrol';

interface PatrolDashboardProps {
  onNavigate: (screen: string) => void;
}
interface DashboardStats {
  totalPatrols: number;
  totalObservations: number;
  totalIncidents: number;
}
interface RecentActivity {
  id: string;
  type: 'checkpoint' | 'observation' | 'patrol' | 'emergency';
  title: string;
  description: string;
  timestamp: string;
  color: string;
}
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
}
const PatrolDashboard = ({
  onNavigate
}: PatrolDashboardProps) => {
  const {
    t,
    language
  } = useLanguage();
  const {
    profile
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    isTracking
  } = useLocationTracking();
  
  // Add offline patrol hook
  const { isOnline, syncStatus, unsyncedCount, hasUnsyncedData, syncOfflineData } = useOfflinePatrol(profile?.id);
  
  // Add persistent patrol hook
  const { 
    activePatrol: persistentPatrol, 
    isPatrolPersistent, 
    startPersistentPatrol, 
    endPersistentPatrol,
    restoreOfflinePatrols 
  } = usePersistentPatrol(profile?.id);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showObservations, setShowObservations] = useState(false);
  const [showPatrolSessions, setShowPatrolSessions] = useState(false);
  const [showEmergencyReports, setShowEmergencyReports] = useState(false);
  const [showSupervisorReport, setShowSupervisorReport] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [legacyActivePatrol, setLegacyActivePatrol] = useState<PatrolSession | null>(null);
  // Use persistent patrol instead of local state
  const currentActivePatrol = persistentPatrol || legacyActivePatrol;
  const [availableSites, setAvailableSites] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatrols: 0,
    totalObservations: 0,
    totalIncidents: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [browserInstructions, setBrowserInstructions] = useState<{
    browser: string;
    instructions: string[];
  } | null>(null);
  const [guardShiftInfo, setGuardShiftInfo] = useState<any>(null);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (profile?.id) {
      fetchDashboardStats();
      fetchRecentActivities();
      checkActivePatrol();
      loadGuardShiftInfo();
      checkLocationPermission();
      fetchUserRoles();
      restoreOfflinePatrols(); // Restore any offline patrol sessions
    }
  }, [profile?.id, restoreOfflinePatrols]);
  const fetchUserRoles = async () => {
    if (!profile?.id) return;
    
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);
      
      if (error) throw error;
      setUserRoles(roles?.map(r => r.role) || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const loadGuardShiftInfo = () => {
    const shiftInfo = localStorage.getItem('guardShiftInfo');
    if (shiftInfo) {
      try {
        setGuardShiftInfo(JSON.parse(shiftInfo));
      } catch (error) {
        console.error('Error parsing shift info:', error);
      }
    }
  };
  const checkLocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({
          name: 'geolocation'
        });
        setLocationPermissionStatus(permission.state);

        // Listen for permission changes
        permission.addEventListener('change', () => {
          setLocationPermissionStatus(permission.state);
        });
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    }
  };
  const checkActivePatrol = async () => {
    if (!profile?.id) return;
    try {
      const patrol = await PatrolService.getActivePatrol(profile.id);
      setLegacyActivePatrol(patrol);
    } catch (error) {
      console.error('Error checking active patrol:', error);
    }
  };
  const fetchAvailableSites = async () => {
    if (!profile?.id) return;

    // Check if guard has shift-based site assignment
    const shiftInfo = await ShiftValidationService.getGuardActiveShiftSite(profile.id);
    if (shiftInfo.siteId) {
      // Get only the site where the guard has an active shift
      try {
        const {
          data: site,
          error
        } = await supabase.from('guardian_sites').select('*').eq('id', shiftInfo.siteId).eq('active', true).single();
        if (error) {
          console.error('Error fetching shift-assigned site:', error);
          setAvailableSites([]);
        } else {
          setAvailableSites([site]);
        }
      } catch (error) {
        console.error('Error fetching available sites:', error);
        setAvailableSites([]);
      }
    } else {
      // Fallback to old logic if no active shift
      try {
        const sites = await PatrolService.getAvailableSites(profile.id);
        setAvailableSites(sites);
      } catch (error) {
        console.error('Error fetching available sites:', error);
        setAvailableSites([]);
      }
    }
  };
  const handleStartPatrol = async () => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Please log in to start a patrol",
        variant: "destructive"
      });
      return;
    }

    // Check for active shift and get site assignment
    const shiftValidation = await ShiftValidationService.validateGuardShiftAccess(profile.id);
    if (!shiftValidation.canLogin) {
      toast({
        title: "No Active Shift",
        description: shiftValidation.message || "You don't have an active shift to start a patrol.",
        variant: "destructive"
      });
      return;
    }
    if (!shiftValidation.assignedSite) {
      toast({
        title: "No Site Assignment",
        description: "No site is assigned for your current shift. Please contact your supervisor.",
        variant: "destructive"
      });
      return;
    }
    try {
      const patrol = await startPersistentPatrol(shiftValidation.assignedSite.id, shiftValidation.assignedTeam?.id);
      
      const modeText = isOnline ? "online" : "offline";
      toast({
        title: "Patrol Started",
        description: `Persistent patrol started ${modeText} at ${shiftValidation.assignedSite.name}. ${isOnline ? 'Location tracking will begin shortly.' : 'Data will sync when connection is restored. Session will persist even if app is restarted.'}`
      });
      
      fetchDashboardStats();
      fetchRecentActivities();
    } catch (error) {
      console.error('Error starting patrol:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start patrol",
        variant: "destructive"
      });
    }
  };
  const handleEndPatrol = async () => {
    if (!currentActivePatrol) return;
    try {
      await endPersistentPatrol(true); // User-initiated end
      
      const modeText = isOnline ? "online" : "offline";
      toast({
        title: "Patrol Ended",
        description: `Persistent patrol completed ${modeText}. ${isOnline ? 'Location tracking stopped.' : 'Data will sync when connection is restored.'}`
      });
      
      fetchDashboardStats();
      fetchRecentActivities();
    } catch (error) {
      console.error('Error ending patrol:', error);
      toast({
        title: "Error",
        description: "Failed to end patrol",
        variant: "destructive"
      });
    }
  };
  const handleForcePermissionReset = async () => {
    console.log('🔄 User requested force permission reset...');
    setIsTestingLocation(true);
    try {
      const {
        LocationTrackingService
      } = await import('@/services/LocationTrackingService');
      toast({
        title: "🔄 Resetting Location Permissions",
        description: "Attempting to clear cached permissions and request fresh access..."
      });
      const success = await LocationTrackingService.forcePermissionReset();
      if (success) {
        setLocationPermissionStatus('granted');
        toast({
          title: "✅ Permission Reset Successful!",
          description: "Location access has been restored. Location tracking should now work properly."
        });

        // Also test location to verify
        const testResult = await LocationTrackingService.testLocationNow();
        if (testResult.success && profile?.id) {
          const locations = await LocationTrackingService.getRecentLocations(profile.id, 5);
          setRecentLocations(locations);
        }
      } else {
        setLocationPermissionStatus('denied');
        const instructions = LocationTrackingService.getBrowserResetInstructions();
        setBrowserInstructions(instructions);
        toast({
          title: "❌ Automatic Reset Failed",
          description: `Please try the manual steps for ${instructions.browser}. Instructions are shown below.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error in force reset:', error);
      toast({
        title: "❌ Reset Error",
        description: "Failed to reset permissions. Please try the manual browser steps.",
        variant: "destructive"
      });
    } finally {
      setIsTestingLocation(false);
    }
  };
  const handleTestLocation = async () => {
    console.log('🧪 User requested location test...');
    setIsTestingLocation(true);
    try {
      const {
        LocationTrackingService
      } = await import('@/services/LocationTrackingService');
      const result = await LocationTrackingService.testLocationNow();
      console.log('Test result:', result);
      if (result.success) {
        toast({
          title: "✅ Location Test Successful!",
          description: `Got location: ${result.position?.coords.latitude.toFixed(6)}, ${result.position?.coords.longitude.toFixed(6)} (accuracy: ${result.position?.coords.accuracy}m)`
        });
        setLocationPermissionStatus('granted');
        if (profile?.id) {
          const locations = await LocationTrackingService.getRecentLocations(profile.id, 5);
          setRecentLocations(locations);
          if (locations.length > 0) {
            toast({
              title: "✅ Database Check Passed",
              description: `Found ${locations.length} recent location records. Latest: ${new Date(locations[0]?.created_at).toLocaleTimeString()}`
            });
          } else {
            toast({
              title: "⚠️ Database Issue",
              description: "Location access works but no records are being saved to database. This might be a backend issue.",
              variant: "destructive"
            });
          }
        }
      } else {
        setLocationPermissionStatus('denied');
        const errorMessage = result.error?.code === 1 ? "Permission denied by user" : result.error?.code === 2 ? "Position unavailable" : result.error?.code === 3 ? "Request timeout" : "Unknown error";
        toast({
          title: "❌ Location Test Failed",
          description: `${errorMessage}: ${result.error?.message || 'Unknown error'}`,
          variant: "destructive"
        });
        if (result.recommendations) {
          setBrowserInstructions({
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser',
            instructions: result.recommendations
          });
        }
      }
    } catch (error) {
      console.error('Error testing location:', error);
      toast({
        title: "❌ Test Error",
        description: "Failed to test location access",
        variant: "destructive"
      });
    } finally {
      setIsTestingLocation(false);
    }
  };
  const handleRequestPermission = async () => {
    try {
      console.log('🔄 Requesting location permission...');
      const {
        LocationTrackingService
      } = await import('@/services/LocationTrackingService');
      const success = await LocationTrackingService.requestLocationPermission();
      if (success) {
        setLocationPermissionStatus('granted');
        toast({
          title: "Location Access Granted! ✅",
          description: "Location tracking is now available. Try testing location again."
        });
      } else {
        toast({
          title: "Permission Still Denied ❌",
          description: "Please manually enable location in your browser settings. Chrome: Settings → Privacy → Site Settings → Location → Allow this site",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Permission request failed:', error);
      toast({
        title: "Permission Request Failed ❌",
        description: "Please manually enable location in your browser settings and reload the page.",
        variant: "destructive"
      });
    }
  };
  const fetchDashboardStats = async () => {
    try {
      // Get user's team memberships
      const {
        data: teamMemberships
      } = await supabase.from('team_members').select('team_id').eq('profile_id', profile?.id);
      if (!teamMemberships || teamMemberships.length === 0) {
        return;
      }
      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Fetch patrol sessions count
      const {
        count: patrolCount
      } = await supabase.from('patrol_sessions').select('*', {
        count: 'exact'
      }).in('team_id', teamIds);

      // Fetch observations count
      const {
        count: observationsCount
      } = await supabase.from('patrol_observations').select('*', {
        count: 'exact'
      }).in('team_id', teamIds);

      // Fetch emergency reports count
      const {
        count: incidentsCount
      } = await supabase.from('emergency_reports').select('*', {
        count: 'exact'
      }).in('team_id', teamIds);
      setStats({
        totalPatrols: patrolCount || 0,
        totalObservations: observationsCount || 0,
        totalIncidents: incidentsCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };
  const fetchRecentActivities = async () => {
    try {
      // Get user's team memberships
      const {
        data: teamMemberships
      } = await supabase.from('team_members').select('team_id').eq('profile_id', profile?.id);
      if (!teamMemberships || teamMemberships.length === 0) {
        return;
      }
      const teamIds = teamMemberships.map(tm => tm.team_id);
      const activities: RecentActivity[] = [];

      // Fetch recent patrol sessions with guard info
      const {
        data: recentPatrols
      } = await supabase.from('patrol_sessions').select(`
          *,
          profiles!patrol_sessions_guard_id_fkey (
            first_name,
            last_name,
            full_name
          )
        `).in('team_id', teamIds).order('created_at', {
        ascending: false
      }).limit(3);
      if (recentPatrols) {
        recentPatrols.forEach(patrol => {
          const guardProfile = patrol.profiles as any;
          const guardName = guardProfile?.full_name || (guardProfile?.first_name && guardProfile?.last_name ? `${guardProfile.first_name} ${guardProfile.last_name}` : `${guardProfile?.first_name || guardProfile?.last_name || 'Unknown Guard'}`);
          activities.push({
            id: patrol.id,
            type: 'patrol',
            title: patrol.status === 'active' ? 'Patrol Started' : 'Patrol Completed',
            description: `${guardName} - Status: ${patrol.status}`,
            timestamp: patrol.created_at,
            color: 'bg-blue-500'
          });
        });
      }

      // Fetch recent observations with guard info
      const {
        data: recentObservations
      } = await supabase.from('patrol_observations').select(`
          *,
          profiles!patrol_observations_guard_id_fkey (
            first_name,
            last_name,
            full_name
          )
        `).in('team_id', teamIds).order('created_at', {
        ascending: false
      }).limit(3);
      if (recentObservations) {
        recentObservations.forEach(observation => {
          const guardProfile = observation.profiles as any;
          const guardName = guardProfile?.full_name || (guardProfile?.first_name && guardProfile?.last_name ? `${guardProfile.first_name} ${guardProfile.last_name}` : `${guardProfile?.first_name || guardProfile?.last_name || 'Unknown Guard'}`);
          activities.push({
            id: observation.id,
            type: 'observation',
            title: 'Observation Logged',
            description: `${guardName} - ${observation.title || 'New observation recorded'}`,
            timestamp: observation.created_at,
            color: 'bg-yellow-500'
          });
        });
      }

      // Fetch recent emergency reports with guard info
      const {
        data: recentEmergencies
      } = await supabase.from('emergency_reports').select(`
          *,
          profiles!emergency_reports_guard_id_fkey (
            first_name,
            last_name,
            full_name
          )
        `).in('team_id', teamIds).order('created_at', {
        ascending: false
      }).limit(2);
      if (recentEmergencies) {
        recentEmergencies.forEach(emergency => {
          const guardProfile = emergency.profiles as any;
          const guardName = guardProfile?.full_name || (guardProfile?.first_name && guardProfile?.last_name ? `${guardProfile.first_name} ${guardProfile.last_name}` : `${guardProfile?.first_name || guardProfile?.last_name || 'Unknown Guard'}`);
          activities.push({
            id: emergency.id,
            type: 'emergency',
            title: 'Emergency Report',
            description: `${guardName} - ${emergency.title}`,
            timestamp: emergency.created_at,
            color: 'bg-red-500'
          });
        });
      }

      // Sort all activities by timestamp and take the most recent 5
      const sortedActivities = activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('dashboard.minutes_ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('dashboard.hour_ago')}`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };
  const quickActions = [{
    id: 'scanner',
    title: t('nav.scan'),
    description: t('dashboard.scan_description'),
    icon: Camera,
    color: 'bg-blue-500',
    action: () => onNavigate('scanner')
  }, {
    id: 'observation',
    title: t('nav.report'),
    description: t('dashboard.report_description'),
    icon: AlertTriangle,
    color: 'bg-yellow-500',
    action: () => onNavigate('observation')
  }, {
    id: 'emergency',
    title: t('dashboard.emergency'),
    description: t('dashboard.emergency_description'),
    icon: Shield,
    color: 'bg-red-500',
    action: () => onNavigate('emergency')
  }];
  const isAdminOrManager = userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('manager');

  if (showSupervisorReport) {
    return <SupervisorReportForm onClose={() => setShowSupervisorReport(false)} />;
  }

  if (showObservations) {
    return <TeamObservations onBack={() => setShowObservations(false)} />;
  }
  if (showPatrolSessions) {
    return <PatrolSessions onBack={() => setShowPatrolSessions(false)} />;
  }
  if (showEmergencyReports) {
    return <TeamEmergencyReports onBack={() => setShowEmergencyReports(false)} />;
  }
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Offline Status Banner */}
      {(!isOnline || hasUnsyncedData) && <div className="mb-4">
          <Card className={`border-2 ${isOnline ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <div>
                    <h3 className={`font-semibold ${isOnline ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'}`}>
                      {isOnline ? '📡 Connection Issues' : '📴 Offline Mode'}
                    </h3>
                    <p className={`text-sm ${isOnline ? 'text-yellow-600 dark:text-yellow-300' : 'text-red-600 dark:text-red-300'}`}>
                      {isOnline 
                        ? `${unsyncedCount} items waiting to sync`
                        : 'Working offline. Patrol activities will sync when connection is restored.'
                      }
                    </p>
                  </div>
                </div>
                {isOnline && hasUnsyncedData && <Button 
                    onClick={syncOfflineData}
                    disabled={syncStatus === 'syncing'}
                    size="sm"
                    variant="outline"
                  >
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </Button>}
              </div>
            </CardContent>
          </Card>
        </div>}

      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('dashboard.welcome_simple')}
        </h1>
        {/* Mobile-optimized status indicators */}
        <div className="grid grid-cols-2 lg:flex lg:items-center lg:space-x-4 gap-2 lg:gap-0 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{currentActivePatrol ? 'On Patrol' : t('dashboard.on_duty')}</span>
          </div>
          {guardShiftInfo && <div className="flex items-center space-x-1 text-green-600 col-span-2 lg:col-span-1">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span className="truncate font-medium">{guardShiftInfo.siteName}</span>
            </div>}
          {isTracking && <div className="flex items-center space-x-1 text-green-600 col-span-2 lg:col-span-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="truncate">Location Tracking Active</span>
            </div>}
          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="truncate">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Location Permission Alert */}
      {(locationPermissionStatus === 'denied' || locationPermissionStatus === 'unknown') && <div className="mb-6">
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    🚨 Location Access Required
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-2">
                    Location tracking is essential for patrol functionality. Current status: <strong>{locationPermissionStatus}</strong>
                  </p>
                  {recentLocations.length > 0 && <p className="text-sm text-green-600 mb-2">
                      ✅ Database: {recentLocations.length} recent location records found
                    </p>}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  
                  
                </div>
                
                {browserInstructions && <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      📋 Manual Fix for {browserInstructions.browser}:
                    </h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {browserInstructions.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}
                    </ul>
                  </div>}
                
                <div className="text-xs text-red-500 space-y-1">
                  <div>💡 If location still doesn't work, try opening this page in an incognito/private window</div>
                  <div>💡 Ensure you're using HTTPS (not HTTP) - location requires secure connection</div>
                  <div>💡 Some corporate networks may block location services</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

      {/* Show location success when permission is granted */}
      {locationPermissionStatus === 'granted' && <div className="mb-6">
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  ✅ Location Access Enabled
                </h3>
              </div>
              {recentLocations.length > 0 ? <div className="text-sm text-green-600 dark:text-green-300 space-y-1">
                  <p>Database: {recentLocations.length} recent location records found</p>
                  <p className="break-words">Latest: {new Date(recentLocations[0]?.created_at).toLocaleString()}</p>
                  <p className="break-all">Coordinates: {recentLocations[0]?.latitude?.toFixed(6)}, {recentLocations[0]?.longitude?.toFixed(6)}</p>
                </div> : <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Location access works, but no database records found. Location tracking will create records during patrols.
                </p>}
            </CardContent>
          </Card>
        </div>}

      {/* Patrol Control */}
      <div className="mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  Patrol Status {!isOnline && '(Offline Mode)'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                  {currentActivePatrol ? `Patrol started at ${new Date(currentActivePatrol.start_time).toLocaleTimeString()}` : guardShiftInfo ? `Ready to patrol at ${guardShiftInfo.siteName}` : 'No active shift assigned'}
                </p>
                {guardShiftInfo && !currentActivePatrol && <p className="text-xs text-blue-600 mt-1 break-words">
                    📍 Current shift: {guardShiftInfo.teamName} - {guardShiftInfo.siteName}
                  </p>}
                {isTracking && <p className="text-xs text-green-600 mt-1">
                    📍 Location updates every minute
                  </p>}
                {!isOnline && <p className="text-xs text-orange-600 mt-1 break-words">
                    📴 Patrol activities will be saved locally and synced when online
                  </p>}
              </div>
              <div className="flex justify-center lg:justify-end">
                <Button 
                  onClick={currentActivePatrol ? handleEndPatrol : handleStartPatrol} 
                  className={currentActivePatrol ? 'bg-red-500 hover:bg-red-600 w-full lg:w-auto' : 'bg-green-500 hover:bg-green-600 w-full lg:w-auto'} 
                  disabled={!currentActivePatrol && !guardShiftInfo}
                  size="lg"
                >
                  {currentActivePatrol ? <>
                      <Square className="h-4 w-4 mr-2" />
                      End Patrol
                    </> : <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Patrol
                    </>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {quickActions.map(action => <Card key={action.id} className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden">
            <CardContent className="p-4 lg:p-6" onClick={action.action}>
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className={`${action.color} p-2 lg:p-3 rounded-full flex-shrink-0`}>
                  <action.icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base truncate">
                    {action.title}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300 break-words">
                    {action.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* Supervisor Report Button for Admin/Manager */}
      {isAdminOrManager && (
        <div className="mb-6">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                      {language === 'el' ? 'Αναφορά Εποπτείας' : 'Supervisor Report'}
                    </h3>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {language === 'el' ? 'Υποβάλετε αναφορά εποπτείας για έργα και φύλακες' : 'Submit supervisor reports for sites and guards'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowSupervisorReport(true)}
                  variant="glass"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {language === 'el' ? 'Νέα Αναφορά' : 'New Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => setShowPatrolSessions(true)}>
          <CardContent className="p-3 lg:p-4">
            <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                  {t('dashboard.patrol_rounds')}
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPatrols}</p>
              </div>
              <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-green-500 flex-shrink-0 self-end lg:self-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => setShowObservations(true)}>
          <CardContent className="p-3 lg:p-4">
            <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                  {t('dashboard.observations')}
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalObservations}</p>
              </div>
              <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500 flex-shrink-0 self-end lg:self-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => setShowEmergencyReports(true)}>
          <CardContent className="p-3 lg:p-4">
            <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                  {t('dashboard.incidents')}
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalIncidents}</p>
              </div>
              <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-red-500 flex-shrink-0 self-end lg:self-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 lg:p-4">
            <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                  {t('dashboard.status')}
                </p>
                <p className="text-sm lg:text-base font-bold text-green-600 truncate">{currentActivePatrol ? 'On Patrol' : t('dashboard.active')}</p>
              </div>
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500 flex-shrink-0 self-end lg:self-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length === 0 ? <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity found
                </p>
              </div> : recentActivities.map(activity => <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div className={`w-2 h-2 ${activity.color} rounded-full flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500 break-words">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{getTimeAgo(activity.timestamp)}</span>
                </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default PatrolDashboard;
