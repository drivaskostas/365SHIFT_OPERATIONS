
import { useState, useEffect } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, User, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import TeamObservations from '@/components/TeamObservations';
import PatrolSessions from '@/components/PatrolSessions';
import TeamEmergencyReports from '@/components/TeamEmergencyReports';

interface PatrolDashboardProps {
  onNavigate: (screen: string) => void;
}

const PatrolDashboard = ({ onNavigate }: PatrolDashboardProps) => {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showObservations, setShowObservations] = useState(false);
  const [showPatrolSessions, setShowPatrolSessions] = useState(false);
  const [showEmergencyReports, setShowEmergencyReports] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
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
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('dashboard.checkpoint_scanned')}</p>
                <p className="text-xs text-gray-500">Building A - East Entrance</p>
              </div>
              <span className="text-xs text-gray-500">2 {t('dashboard.minutes_ago')}</span>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('dashboard.observation_logged')}</p>
                <p className="text-xs text-gray-500">{t('emergency.suspicious_incident')}</p>
              </div>
              <span className="text-xs text-gray-500">15 {t('dashboard.minutes_ago')}</span>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('dashboard.patrol_started')}</p>
                <p className="text-xs text-gray-500">{t('dashboard.night_shift')}</p>
              </div>
              <span className="text-xs text-gray-500">1 {t('dashboard.hour_ago')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatrolDashboard;
