import { useState, useEffect, useCallback } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, User, TrendingUp, Play, Square, FileText, Target, Calendar, ClipboardList, QrCode, CheckCircle, Circle, ArrowLeft, Eye, PenTool, CheckSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckpointGroupSelector } from '@/components/CheckpointGroupSelector';
import { Badge } from '@/components/ui/badge';
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
import TenantFeatureManager from '@/components/TenantFeatureManager';
import { useToast } from '@/components/ui/use-toast';
import { useOfflinePatrol } from '@/hooks/useOfflinePatrol';
import { usePersistentPatrol } from '@/hooks/usePersistentPatrol';
import { useLanguage } from '@/hooks/useLanguage';
import { TenantFeatureService } from '@/services/TenantFeatureService';
import { format } from 'date-fns';

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

interface TodayObligation {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  category?: string;
  priority?: string;
  site_name?: string;
  requires_photo_proof?: boolean;
  requires_signature?: boolean;
  requires_checklist?: boolean;
  is_completed: boolean;
  completed_at?: string;
  completed_by_name?: string;
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
    restoreOfflinePatrols,
    clearPersistentPatrol
  } = usePersistentPatrol(profile?.id);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showObservations, setShowObservations] = useState(false);
  const [showPatrolSessions, setShowPatrolSessions] = useState(false);
  const [showEmergencyReports, setShowEmergencyReports] = useState(false);
  const [showSupervisorReport, setShowSupervisorReport] = useState(false);
  const [showTodayTasks, setShowTodayTasks] = useState(false);
  const [showFeatureManager, setShowFeatureManager] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [todayObligations, setTodayObligations] = useState<TodayObligation[]>([]);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [featureSettings, setFeatureSettings] = useState<{
    show_scan_button: boolean;
    show_tasks_button: boolean;
    show_observations_button: boolean;
    show_report_button: boolean;
    show_supervisor_report: boolean;
    show_todays_tasks: boolean;
    show_patrol_status: boolean;
  } | null>(null);
  const [legacyActivePatrol, setLegacyActivePatrol] = useState<PatrolSession | null>(null);
  const [showCheckpointGroupSelector, setShowCheckpointGroupSelector] = useState(false);
  const [pendingPatrolSiteId, setPendingPatrolSiteId] = useState<string | null>(null);
  // Use persistent patrol instead of local state, but prioritize database state
  const currentActivePatrol = legacyActivePatrol || persistentPatrol;
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
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [currentMission, setCurrentMission] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Computed value: prefer current database shift over stale localStorage
  const activeShiftInfo = currentShift ? {
    siteId: currentShift.site_id,
    teamId: currentShift.team_id,
    siteName: currentShift.site_name || currentShift.location,
    teamName: currentShift.team_name,
    shift: currentShift
  } : guardShiftInfo;
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (profile?.id) {
      fetchDashboardStats();
      fetchRecentActivities();
      checkActivePatrol();
      fetchCurrentShift(); // Fetch current shift first
      fetchCurrentMission();
      checkLocationPermission();
      fetchUserRoles();
      restoreOfflinePatrols(); // Restore any offline patrol sessions
      fetchTodayObligations(); // Fetch today's obligations for supervisors
      fetchFeatureSettings(); // Fetch tenant feature settings
    }
  }, [profile?.id, restoreOfflinePatrols]);

  // Fetch tenant feature settings
  const fetchFeatureSettings = async () => {
    try {
      const settings = await TenantFeatureService.getCurrentUserSettings();
      console.log('Raw settings from DB:', settings);
      const effective = TenantFeatureService.getEffectiveSettings(settings);
      console.log('Effective settings:', effective);
      console.log('show_patrol_status value:', effective.show_patrol_status);
      setFeatureSettings(effective);
    } catch (error) {
      console.error('Error fetching feature settings:', error);
      // Use defaults if error
      setFeatureSettings({
        show_scan_button: true,
        show_tasks_button: true,
        show_observations_button: true,
        show_report_button: true,
        show_supervisor_report: true,
        show_todays_tasks: true,
        show_patrol_status: true,
      });
    }
  };

  // Re-fetch mission when current shift changes
  useEffect(() => {
    if (profile?.id && currentShift) {
      fetchCurrentMission();
    }
  }, [currentShift?.id, profile?.id]);
  
  // Add a useEffect to sync states and refresh data periodically  
  useEffect(() => {
    if (!profile?.id) return;
    
    // Set up real-time subscription for patrol sessions
    const channel = supabase
      .channel('patrol-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patrol_sessions',
          filter: `guard_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('🔄 Patrol session changed:', payload);
          // Immediately update the local state when patrol changes
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            if (newData && newData.status === 'completed') {
              // Patrol was ended - force immediate state update
              setLegacyActivePatrol(null);
              if (isPatrolPersistent) {
                clearPersistentPatrol();
              }
              // Force immediate re-render by updating key state
              setTimeout(() => setLegacyActivePatrol(null), 0);
            } else if (newData && newData.status === 'active') {
              // Patrol was started or updated
              setLegacyActivePatrol(newData as PatrolSession);
            }
          } else if (payload.eventType === 'DELETE') {
            // Patrol was deleted
            setLegacyActivePatrol(null);
            if (isPatrolPersistent) {
              clearPersistentPatrol();
            }
          }
          // Refresh dashboard stats
          fetchDashboardStats();
          fetchRecentActivities();
          fetchCurrentMission(); // Also refresh mission data
        }
      )
      .subscribe();
    
    const interval = setInterval(() => {
      // Only check active patrol, don't constantly refresh other data
      checkActivePatrol();
    }, 10000); // Check every 10 seconds instead of 5
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [profile?.id, isPatrolPersistent, clearPersistentPatrol]);
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

  const fetchTodayObligations = async () => {
    if (!profile?.id) return;
    
    try {
      setLoadingObligations(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      console.log('Fetching today obligations for user:', profile.id);
      console.log('Today:', today, 'Day of week:', dayOfWeek);
      console.log('Profile Role:', profile?.Role);
      
      // Check if user is admin/super_admin - they see ALL obligations
      const userRole = profile?.Role?.toLowerCase() || '';
      const isAdmin = userRole === 'admin' || userRole === 'super_admin';
      console.log('Is Admin:', isAdmin, 'User Role:', userRole);
      
      let obligations: any[] = [];
      let error: any = null;
      
      if (isAdmin) {
        // Admins see ALL active obligations
        console.log('User is admin - fetching ALL obligations');
        const { data: obligationsData, error: obligationsError } = await supabase
          .from('contract_obligations')
          .select('*')
          .eq('is_active', true);
        
        console.log('Admin obligations query result:', obligationsData, 'Error:', obligationsError);
        
        obligations = obligationsData || [];
        error = obligationsError;
      } else {
        // Non-admins see only their team's obligations
        const { data: teamMemberships, error: teamError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', profile.id);
        
        const userTeamIds = teamMemberships?.map(tm => tm.team_id) || [];
        console.log('User team IDs:', userTeamIds);
        
        if (userTeamIds.length > 0) {
          // Get service contracts for user's teams
          const { data: contracts, error: contractError } = await supabase
            .from('service_contracts')
            .select('id')
            .in('team_id', userTeamIds);
          
          const contractIds = contracts?.map(c => c.id) || [];
          console.log('Contract IDs for user teams:', contractIds);
          
          if (contractIds.length > 0) {
            const { data: obligationsData, error: obligationsError } = await supabase
              .from('contract_obligations')
              .select(`
                id,
                title,
                description,
                frequency,
                specific_days,
                day_of_month,
                month_of_year,
                category,
                priority,
                requires_photo_proof,
                requires_signature,
                requires_checklist,
                contract_id,
                service_contracts (
                  id,
                  team_id,
                  site_id,
                  guardian_sites (
                    id,
                    name
                  )
                )
              `)
              .in('contract_id', contractIds)
              .eq('is_active', true);
            
            obligations = obligationsData || [];
            error = obligationsError;
          }
        }
      }
      
      console.log('Obligations fetched:', obligations?.length, 'Error:', error);
      
      // If table doesn't exist or error, try simpler approach
      if (error) {
        console.error('Error fetching obligations:', error);
        setTodayObligations([]);
        return;
      }
      
      // If no obligations found
      if (!obligations || obligations.length === 0) {
        console.log('No obligations found');
        setTodayObligations([]);
        return;
      }
      
      // Filter obligations that should be done today
      const currentDayOfMonth = new Date().getDate();
      const currentMonth = new Date().getMonth() + 1; // 1-12
      
      const todaysObligations = (obligations || []).filter((obligation: any) => {
        if (obligation.frequency === 'daily') return true;
        
        if (obligation.frequency === 'weekly') {
          // Check specific_days array for day of week (0-6)
          return obligation.specific_days?.includes(dayOfWeek);
        }
        
        if (obligation.frequency === 'monthly') {
          // Check day_of_month or specific_days
          if (obligation.day_of_month) {
            return obligation.day_of_month === currentDayOfMonth;
          }
          return obligation.specific_days?.includes(currentDayOfMonth);
        }
        
        if (obligation.frequency === 'yearly') {
          // Check month_of_year and day_of_month
          if (obligation.month_of_year && obligation.day_of_month) {
            return obligation.month_of_year === currentMonth && obligation.day_of_month === currentDayOfMonth;
          }
          return false;
        }
        
        // If no frequency specified, show it
        if (!obligation.frequency) return true;
        return false;
      });
      
      console.log('Today obligations after filter:', todaysObligations.length);
      
      // Get completions for today
      const obligationIds = todaysObligations.map((o: any) => o.id);
      
      let completions: any[] = [];
      if (obligationIds.length > 0) {
        const { data: completionData, error: completionError } = await supabase
          .from('obligation_completions')
          .select(`
            obligation_id,
            completed_at,
            completed_by_name,
            status
          `)
          .in('obligation_id', obligationIds)
          .eq('scheduled_date', today)
          .eq('status', 'completed');
        
        console.log('Completions:', completionData?.length, 'Error:', completionError);
        completions = completionData || [];
      }
      
      // Map obligations with completion status
      const mappedObligations: TodayObligation[] = todaysObligations.map((obligation: any) => {
        const completion = completions.find((c: any) => c.obligation_id === obligation.id);
        const siteName = obligation.service_contracts?.guardian_sites?.name || 
                        (Array.isArray(obligation.service_contracts?.guardian_sites) 
                          ? obligation.service_contracts.guardian_sites[0]?.name 
                          : undefined);
        
        return {
          id: obligation.id,
          title: obligation.title,
          description: obligation.description,
          frequency: obligation.frequency,
          category: obligation.category,
          priority: obligation.priority,
          site_name: siteName,
          requires_photo_proof: obligation.requires_photo_proof,
          requires_signature: obligation.requires_signature,
          requires_checklist: obligation.requires_checklist,
          is_completed: !!completion,
          completed_at: completion?.completed_at,
          completed_by_name: completion?.profiles?.full_name || 
                            (Array.isArray(completion?.profiles) ? completion.profiles[0]?.full_name : undefined)
        };
      });
      
      // Sort: incomplete first, then by priority, then by title
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      mappedObligations.sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        const priorityA = priorityOrder[a.priority || 'medium'] ?? 1;
        const priorityB = priorityOrder[b.priority || 'medium'] ?? 1;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.title.localeCompare(b.title);
      });
      
      setTodayObligations(mappedObligations);
    } catch (error) {
      console.error('Error fetching today obligations:', error);
    } finally {
      setLoadingObligations(false);
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

  const fetchCurrentShift = async () => {
    if (!profile?.id) return;
    
    try {
      const { data: shifts, error } = await supabase
        .from('team_schedules')
        .select(`
          *,
          teams:team_id (
            id,
            name
          )
        `)
        .contains('assigned_guards', [profile.id])
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (shifts && shifts.length > 0) {
        const shift = shifts[0];
        
        // Get the site for this team
        const { data: site } = await supabase
          .from('guardian_sites')
          .select('*')
          .eq('team_id', shift.team_id)
          .eq('active', true)
          .single();
        
        setCurrentShift({
          ...shift,
          team_name: shift.teams?.name,
          site_id: site?.id,
          site_name: site?.name
        });
      } else {
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
    }
  };

  const fetchCurrentMission = async () => {
    if (!profile?.id) return;
    
    try {
      // First get all teams the user belongs to
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', profile.id);
      
      if (teamError) {
        console.error('Error fetching user teams:', teamError);
        return;
      }
      
      if (!teamMembers || teamMembers.length === 0) {
        console.log('No teams found for user');
        return;
      }
      
      const teamIds = teamMembers.map(tm => tm.team_id);
      console.log('Fetching missions for teams:', teamIds);
      
      // Then get current missions for any of those teams (pending or active)
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .in('team_id', teamIds)
        .in('status', ['pending', 'active'])
        .eq('is_expired', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching missions:', error);
        return;
      }
      
      console.log('Found missions:', missions);
      
      if (missions && missions.length > 0) {
        setCurrentMission(missions[0]);
        console.log('Set current mission:', missions[0]);
      } else {
        console.log('No active missions found');
        setCurrentMission(null);
      }
    } catch (error) {
      console.error('Error fetching current mission:', error);
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
    
    // Don't check if we're in the middle of ending a patrol
    if (!legacyActivePatrol && !persistentPatrol) {
      return; // Already no active patrol, no need to check
    }
    
    try {
      const patrol = await PatrolService.getActivePatrol(profile.id);
      
      // Only update state if there's actually an active patrol in the database
      if (patrol && patrol.status === 'active') {
        setLegacyActivePatrol(patrol);
      } else if (!patrol) {
        // Only clear if we had an active patrol before
        if (legacyActivePatrol || persistentPatrol) {
          setLegacyActivePatrol(null);
          if (isPatrolPersistent) {
            clearPersistentPatrol();
          }
        }
      }
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

    // Check if site has multiple checkpoint groups
    try {
      const { data: checkpointGroups, error } = await supabase
        .from('checkpoint_groups')
        .select('id, name')
        .eq('site_id', shiftValidation.assignedSite.id);

      if (error) throw error;

      // If multiple groups exist, show selector
      if (checkpointGroups && checkpointGroups.length > 1) {
        setPendingPatrolSiteId(shiftValidation.assignedSite.id);
        setShowCheckpointGroupSelector(true);
        return;
      }

      // If only one or no groups, start patrol normally
      await startPatrolWithGroup(shiftValidation.assignedSite.id, shiftValidation.assignedTeam?.id, null);
      
    } catch (error) {
      console.error('Error checking checkpoint groups:', error);
      // Continue with normal patrol start if there's an error
      await startPatrolWithGroup(shiftValidation.assignedSite.id, shiftValidation.assignedTeam?.id, null);
    }
  };

  const startPatrolWithGroup = async (siteId: string, teamId?: string, checkpointGroupId?: string | null) => {
    try {
      const patrol = await startPersistentPatrol(siteId, teamId, checkpointGroupId || undefined);
      
      const modeText = isOnline ? "online" : "offline";
      toast({
        title: "Patrol Started",
        description: `Persistent patrol started ${modeText}. ${isOnline ? 'Location tracking will begin shortly.' : 'Data will sync when connection is restored. Session will persist even if app is restarted.'}`
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

  const handleCheckpointGroupSelected = (groupId: string | null) => {
    setShowCheckpointGroupSelector(false);
    if (pendingPatrolSiteId) {
      // Get team ID from shift validation
      ShiftValidationService.validateGuardShiftAccess(profile?.id || '').then(shiftValidation => {
        startPatrolWithGroup(pendingPatrolSiteId, shiftValidation.assignedTeam?.id, groupId);
      });
    }
    setPendingPatrolSiteId(null);
  };

  const handleCheckpointGroupCancel = () => {
    setShowCheckpointGroupSelector(false);
    setPendingPatrolSiteId(null);
  };
  const handleEndPatrol = async () => {
    if (!currentActivePatrol) return;
    
    try {
      console.log('🛑 Ending patrol:', currentActivePatrol.id);
      
      // Use persistent patrol end logic to ensure proper cleanup
      const endedPatrol = await endPersistentPatrol(true);
      
      if (endedPatrol) {
        console.log('✅ Patrol ended successfully:', endedPatrol.id);
        
        // Force immediate state cleanup
        setLegacyActivePatrol(null);
        
        const modeText = isOnline ? "online" : "offline";
        toast({
          title: "Patrol Ended",
          description: `Patrol completed ${modeText}. ${isOnline ? 'Location tracking stopped.' : 'Data will sync when connection is restored.'}`
        });
        
        // Force refresh the dashboard data
        await fetchDashboardStats();
        await fetchRecentActivities();
      }
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

      // Fetch patrol sessions count for this guard
      const {
        count: patrolCount
      } = await supabase.from('patrol_sessions').select('*', {
        count: 'exact'
      }).eq('guard_id', profile.id);

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

      // Fetch recent patrol sessions for this guard
      const {
        data: recentPatrols
      } = await supabase.from('patrol_sessions').select(`
          *,
          profiles!patrol_sessions_guard_id_fkey (
            first_name,
            last_name,
            full_name
          )
        `).eq('guard_id', profile.id).order('created_at', {
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
  // Filter quick actions based on tenant feature settings
  const allQuickActions = [{
    id: 'scanner',
    title: t('nav.scan'),
    description: t('dashboard.scan_description'),
    icon: Camera,
    color: 'bg-blue-500',
    action: () => onNavigate('scanner'),
    visible: featureSettings?.show_scan_button ?? true
  }, {
    id: 'tasks',
    title: language === 'el' ? 'Εργασίες' : 'Tasks',
    description: language === 'el' ? 'Σάρωση QR εργασιών' : 'Scan task QR codes',
    icon: ClipboardList,
    color: 'bg-purple-500',
    action: () => onNavigate('taskScanner'),
    visible: featureSettings?.show_tasks_button ?? true
  }, {
    id: 'observation',
    title: t('nav.report'),
    description: t('dashboard.report_description'),
    icon: AlertTriangle,
    color: 'bg-yellow-500',
    action: () => onNavigate('observation'),
    visible: featureSettings?.show_observations_button ?? true
  }, {
    id: 'emergency',
    title: t('dashboard.emergency'),
    description: t('dashboard.emergency_description'),
    icon: Shield,
    color: 'bg-red-500',
    action: () => onNavigate('emergency'),
    visible: featureSettings?.show_report_button ?? true
  }];
  
  const quickActions = allQuickActions.filter(action => action.visible);
  // Check both user_roles table and profile.Role for admin/manager access
  const profileRole = profile?.Role?.toLowerCase() || '';
  const isAdminOrManager = userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('manager') || userRoles.includes('supervisor') ||
    profileRole === 'admin' || profileRole === 'super_admin' || profileRole === 'manager' || profileRole === 'supervisor';

  if (showSupervisorReport) {
    return <SupervisorReportForm onClose={() => setShowSupervisorReport(false)} />;
  }

  if (showFeatureManager) {
    return <TenantFeatureManager onBack={() => setShowFeatureManager(false)} />;
  }

  if (showTodayTasks) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowTodayTasks(false)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ClipboardList className="h-6 w-6 text-purple-600" />
                  {language === 'el' ? 'Σημερινές Εργασίες' : "Today's Tasks"}
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 text-lg px-3 py-1">
                {todayObligations.filter(o => o.is_completed).length}/{todayObligations.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2 ml-12">
              {language === 'el' ? 'Παρακολούθηση και ενημέρωση ημερήσιων εργασιών' : 'Track and update daily obligations'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingObligations ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-sm text-purple-600 mt-3">{language === 'el' ? 'Φόρτωση εργασιών...' : 'Loading tasks...'}</p>
              </div>
            ) : todayObligations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {language === 'el' ? 'Όλα έτοιμα!' : 'All done!'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {language === 'el' ? 'Δεν υπάρχουν εργασίες προγραμματισμένες για σήμερα' : 'No tasks scheduled for today'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayObligations.map((obligation) => (
                  <Card 
                    key={obligation.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      obligation.is_completed 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700 hover:border-purple-400'
                    }`}
                    onClick={() => onNavigate('taskScanner')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {obligation.is_completed ? (
                            <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
                              <Circle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold text-base ${
                              obligation.is_completed ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'
                            }`}>
                              {obligation.title}
                            </p>
                            {obligation.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                {obligation.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {/* Category badge */}
                              {obligation.category && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                  {obligation.category}
                                </span>
                              )}
                              {/* Priority badge */}
                              {obligation.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  obligation.priority === 'high' 
                                    ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' 
                                    : obligation.priority === 'medium'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {obligation.priority === 'high' ? '🔴' : obligation.priority === 'medium' ? '🟡' : '🟢'} {obligation.priority}
                                </span>
                              )}
                              {/* Frequency badge */}
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full capitalize">
                                {obligation.frequency}
                              </span>
                              {/* Site name */}
                              {obligation.site_name && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {obligation.site_name}
                                </span>
                              )}
                            </div>
                            {/* Requirements icons */}
                            <div className="flex items-center gap-2 mt-2">
                              {obligation.requires_photo_proof && (
                                <span className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                  <Camera className="h-3.5 w-3.5" />
                                  {language === 'el' ? 'Φωτο' : 'Photo'}
                                </span>
                              )}
                              {obligation.requires_signature && (
                                <span className="text-xs flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                  <PenTool className="h-3.5 w-3.5" />
                                  {language === 'el' ? 'Υπογραφή' : 'Sign'}
                                </span>
                              )}
                              {obligation.requires_checklist && (
                                <span className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  {language === 'el' ? 'Λίστα' : 'Checklist'}
                                </span>
                              )}
                            </div>
                            {obligation.is_completed && obligation.completed_at && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {language === 'el' ? 'Ολοκληρώθηκε στις' : 'Completed at'} {format(new Date(obligation.completed_at), 'HH:mm')}
                                {obligation.completed_by_name && ` ${language === 'el' ? 'από' : 'by'} ${obligation.completed_by_name}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {!obligation.is_completed && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0 text-purple-600 border-purple-300 hover:bg-purple-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('taskScanner');
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            {language === 'el' ? 'Σάρωση' : 'Scan'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Refresh button */}
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => fetchTodayObligations()}
              >
                <Clock className="h-4 w-4 mr-2" />
                {language === 'el' ? 'Ανανέωση' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
      <div className="mb-8">
        <div className="p-6 surface-tech">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4 font-mono">
            OPERATIVE {profile?.last_name?.toUpperCase()}
          </h1>
          
          {/* Tabs for Overview and Mission */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview" className="font-mono">OVERVIEW</TabsTrigger>
              <TabsTrigger value="mission" className="font-mono" disabled={!currentMission}>
                {t('mission.title').toUpperCase()} {currentMission ? '●' : ''}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {/* High-tech status indicators */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-primary font-mono text-sm">{currentTime.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span className="text-accent font-mono text-sm truncate">{currentActivePatrol ? 'PATROL.ACTIVE' : 'STANDBY'}</span>
                </div>
                {activeShiftInfo && (
                  <>
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 col-span-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 font-mono text-sm truncate">
                        SHIFT: {(activeShiftInfo.shift?.title || activeShiftInfo.teamName)?.toUpperCase() || 'NOT ASSIGNED'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 col-span-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 font-mono text-sm truncate">
                        SITE: {activeShiftInfo.teamName?.toUpperCase() || activeShiftInfo.shift?.location?.toUpperCase() || 'NOT ASSIGNED'}
                      </span>
                    </div>
                  </>
                )}
                {isTracking && <div className="flex items-center space-x-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 col-span-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-mono text-sm">GPS.TRACKING.ACTIVE</span>
                  </div>}
                <div className="flex items-center space-x-2 p-3 rounded-lg col-span-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`font-mono text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnline ? 'NETWORK.ONLINE' : 'NETWORK.OFFLINE'}
                  </span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="mission" className="space-y-4">
              {currentMission ? (
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <Target className="h-5 w-5 text-orange-400" />
                    <h3 className="text-orange-400 font-mono font-semibold">ACTIVE MISSION</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-white font-semibold mb-1">{currentMission.title}</div>
                      <div className="text-sm text-gray-300 mb-2">Category: {currentMission.category}</div>
                    </div>
                    
                    {currentMission.description && (
                      <div className="p-3 bg-gray-800 rounded text-sm text-gray-300">
                        {currentMission.description}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {currentMission.start_date && (
                        <div>
                          <span className="text-gray-400">Start:</span>
                          <div className="text-white">{new Date(currentMission.start_date).toLocaleDateString()}</div>
                        </div>
                      )}
                      {currentMission.end_date && (
                        <div>
                          <span className="text-gray-400">End:</span>
                          <div className="text-white">{new Date(currentMission.end_date).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                    
                    {currentMission.attachment_url && (
                      <div>
                        <a 
                          href={currentMission.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 text-sm underline"
                        >
                          View Attachment
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No active mission assigned
                </div>
              )}
            </TabsContent>
          </Tabs>
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

      {/* Patrol Control - Controlled by feature settings */}
      {(featureSettings?.show_patrol_status ?? true) && (
        <div className="mb-6">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    Patrol Status {!isOnline && '(Offline Mode)'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                    {currentActivePatrol ? `Patrol started at ${new Date(currentActivePatrol.start_time).toLocaleTimeString()}` : activeShiftInfo ? `Ready to patrol at ${activeShiftInfo.siteName}` : 'No active shift assigned'}
                  </p>
                  {activeShiftInfo && !currentActivePatrol && <p className="text-xs text-blue-600 mt-1 break-words">
                      📍 Current shift: {activeShiftInfo.shift?.title || activeShiftInfo.teamName} - {activeShiftInfo.siteName}
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
                    disabled={!currentActivePatrol && !activeShiftInfo}
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
      )}

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

      {/* Supervisor Actions for Admin/Manager */}
      {isAdminOrManager && (
        <div className="mb-6 space-y-4">
          {/* Supervisor Report Card - Controlled by feature settings */}
          {(featureSettings?.show_supervisor_report ?? true) && (
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
          )}

          {/* Today's Obligations Card - Controlled by feature settings */}
          {(featureSettings?.show_todays_tasks ?? true) && (
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowTodayTasks(true)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-500 p-2 rounded-full">
                      <ClipboardList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-purple-800 dark:text-purple-200">
                        {language === 'el' ? 'Σημερινές Εργασίες' : "Today's Tasks"}
                      </h3>
                      <p className="text-sm text-purple-600 dark:text-purple-300">
                        {language === 'el' ? 'Παρακολούθηση ημερήσιων υποχρεώσεων' : 'Track daily obligations'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200">
                      {todayObligations.filter(o => o.is_completed).length}/{todayObligations.length}
                    </Badge>
                    <Button 
                      variant="glass"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTodayTasks(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      {language === 'el' ? 'Προβολή' : 'View'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feature Manager Card - Only for super_admin */}
          {profileRole === 'super_admin' && (
            <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowFeatureManager(true)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-600 p-2 rounded-full">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        {language === 'el' ? 'Διαχείριση Features' : 'Feature Management'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'el' ? 'Ρύθμιση ορατότητας features ανά tenant' : 'Configure feature visibility per tenant'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFeatureManager(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    {language === 'el' ? 'Ρυθμίσεις' : 'Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-tech cursor-pointer hover:scale-105" onClick={() => setShowPatrolSessions(true)}>
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <p className="text-sm font-mono text-primary/80">
                PATROLS
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold font-mono text-primary">{stats.totalPatrols}</p>
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-tech cursor-pointer hover:scale-105" onClick={() => setShowObservations(true)}>
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <p className="text-sm font-mono text-accent/80">
                REPORTS
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold font-mono text-accent">{stats.totalObservations}</p>
                <AlertTriangle className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-tech cursor-pointer hover:scale-105 transition-shadow overflow-hidden" onClick={() => setShowEmergencyReports(true)}>
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <p className="text-sm font-mono text-destructive/80">
                {t('dashboard.incidents').toUpperCase()}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold font-mono text-destructive">{stats.totalIncidents}</p>
                <Shield className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-tech overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <p className="text-sm font-mono text-secondary/80">
                {t('dashboard.status').toUpperCase()}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-bold font-mono text-green-400">{currentActivePatrol ? 'ON PATROL' : t('dashboard.active').toUpperCase()}</p>
                <User className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
      </Card>

      {showCheckpointGroupSelector && pendingPatrolSiteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <CheckpointGroupSelector
            siteId={pendingPatrolSiteId}
            onSelectGroup={handleCheckpointGroupSelected}
            onCancel={handleCheckpointGroupCancel}
          />
        </div>
      )}
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
