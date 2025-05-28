import { useState, useEffect } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, User, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import TeamObservations from '@/components/TeamObservations';
import PatrolSessions from '@/components/PatrolSessions';
import TeamEmergencyReports from '@/components/TeamEmergencyReports';

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

const PatrolDashboard = ({ onNavigate }: PatrolDashboardProps) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showObservations, setShowObservations] = useState(false);
  const [showPatrolSessions, setShowPatrolSessions] = useState(false);
  const [showEmergencyReports, setShowEmergencyReports] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatrols: 0,
    totalObservations: 0,
    totalIncidents: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardStats();
      fetchRecentActivities();
    }
  }, [profile?.id]);

  const fetchDashboardStats = async () => {
    try {
      // Get user's team memberships
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', profile?.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        return;
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Fetch patrol sessions count
      const { count: patrolCount } = await supabase
        .from('patrol_sessions')
        .select('*', { count: 'exact' })
        .in('team_id', teamIds);

      // Fetch observations count
      const { count: observationsCount } = await supabase
        .from('patrol_observations')
        .select('*', { count: 'exact' })
        .in('team_id', teamIds);

      // Fetch emergency reports count
      const { count: incidentsCount } = await supabase
        .from('emergency_reports')
        .select('*', { count: 'exact' })
        .in('team_id', teamIds);

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
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', profile?.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        return;
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);
      const activities: RecentActivity[] = [];

      // Fetch recent patrol sessions
      const { data: recentPatrols } = await supabase
        .from('patrol_sessions')
        .select('*')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentPatrols) {
        recentPatrols.forEach(patrol => {
          activities.push({
            id: patrol.id,
            type: 'patrol',
            title: patrol.status === 'active' ? 'Patrol Started' : 'Patrol Completed',
            description: `Status: ${patrol.status}`,
            timestamp: patrol.created_at,
            color: 'bg-blue-500'
          });
        });
      }

      // Fetch recent observations
      const { data: recentObservations } = await supabase
        .from('patrol_observations')
        .select('*')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentObservations) {
        recentObservations.forEach(observation => {
          activities.push({
            id: observation.id,
            type: 'observation',
            title: 'Observation Logged',
            description: observation.title || 'New observation recorded',
            timestamp: observation.created_at,
            color: 'bg-yellow-500'
          });
        });
      }

      // Fetch recent emergency reports
      const { data: recentEmergencies } = await supabase
        .from('emergency_reports')
        .select('*')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentEmergencies) {
        recentEmergencies.forEach(emergency => {
          activities.push({
            id: emergency.id,
            type: 'emergency',
            title: 'Emergency Report',
            description: emergency.title,
            timestamp: emergency.created_at,
            color: 'bg-red-500'
          });
        });
      }

      // Sort all activities by timestamp and take the most recent 5
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

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

  const quickActions = [
    {
      id: 'scanner',
      title: t('nav.scan'),
      description: t('dashboard.scan_description'),
      icon: Camera,
      color: 'bg-blue-500',
      action: () => onNavigate('scanner')
    },
    {
      id: 'observation',
      title: t('nav.report'),
      description: t('dashboard.report_description'),
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      action: () => onNavigate('observation')
    },
    {
      id: 'emergency',
      title: t('dashboard.emergency'),
      description: t('dashboard.emergency_description'),
      icon: Shield,
      color: 'bg-red-500',
      action: () => onNavigate('emergency')
    }
  ];

  if (showObservations) {
    return <TeamObservations onBack={() => setShowObservations(false)} />;
  }

  if (showPatrolSessions) {
    return <PatrolSessions onBack={() => setShowPatrolSessions(false)} />;
  }

  if (showEmergencyReports) {
    return <TeamEmergencyReports onBack={() => setShowEmergencyReports(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('dashboard.welcome_simple')}
        </h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{t('dashboard.on_duty')}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {quickActions.map((action) => (
          <Card key={action.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6" onClick={action.action}>
              <div className="flex items-center space-x-4">
                <div className={`${action.color} p-3 rounded-full`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {action.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowPatrolSessions(true)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.patrol_rounds')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPatrols}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowObservations(true)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.observations')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalObservations}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowEmergencyReports(true)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.incidents')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalIncidents}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.status')}
                </p>
                <p className="text-sm font-bold text-green-600">{t('dashboard.active')}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity found
                </p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatrolDashboard;
