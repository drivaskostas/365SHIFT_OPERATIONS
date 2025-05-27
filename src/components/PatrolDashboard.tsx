
import { useState } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, Play, Square, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

interface PatrolDashboardProps {
  onNavigate: (screen: string) => void;
}

const PatrolDashboard = ({ onNavigate }: PatrolDashboardProps) => {
  const [isPatrolActive, setIsPatrolActive] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [patrolProgress] = useState(65);

  const handleStartPatrol = () => {
    setIsPatrolActive(true);
  };

  const handleEndPatrol = () => {
    setIsPatrolActive(false);
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Patrol Status</span>
            <Badge variant={isPatrolActive ? "default" : "secondary"}>
              {isPatrolActive ? "Active" : "Idle"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPatrolActive ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{patrolProgress}%</span>
                </div>
                <Progress value={patrolProgress} className="w-full" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Started: 2:30 PM</span>
                </div>
                <Button onClick={handleEndPatrol} variant="destructive" size="sm">
                  <Square className="h-4 w-4 mr-1" />
                  End Patrol
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={handleStartPatrol} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Patrol
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={() => onNavigate('scanner')} 
              className="w-full h-16 bg-green-600 hover:bg-green-700"
            >
              <Camera className="h-6 w-6 mr-2" />
              Scan QR
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={() => onNavigate('incident')} 
              className="w-full h-16 bg-orange-600 hover:bg-orange-700"
            >
              <AlertTriangle className="h-6 w-6 mr-2" />
              Report Incident
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Button */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="p-4">
          <Button 
            onClick={() => onNavigate('emergency')} 
            className="w-full h-16 bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <AlertTriangle className="h-6 w-6 mr-2" />
            EMERGENCY REPORT
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Background Tracking</div>
              <div className="text-xs text-gray-500">Keep location tracking active</div>
            </div>
            <Switch 
              checked={backgroundTracking} 
              onCheckedChange={setBackgroundTracking}
            />
          </div>
        </CardContent>
      </Card>

      {/* Site Information */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Downtown Office Complex</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Team Alpha - 3 Guards</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm">12 Checkpoints</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatrolDashboard;
