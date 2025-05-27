
import { useState, useEffect } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, Play, Square, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession, GuardianSite } from '@/types/database';

interface PatrolDashboardProps {
  onNavigate: (screen: string) => void;
}

const PatrolDashboard = ({ onNavigate }: PatrolDashboardProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
  const [availableSites, setAvailableSites] = useState<GuardianSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [patrolProgress, setPatrolProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadActivePatrol();
      loadAvailableSites();
    }
  }, [user]);

  useEffect(() => {
    if (activePatrol) {
      loadPatrolProgress();
    }
  }, [activePatrol]);

  const loadActivePatrol = async () => {
    if (!user) return;
    
    try {
      const patrol = await PatrolService.getActivePatrol(user.id);
      setActivePatrol(patrol);
    } catch (error) {
      console.error('Error loading active patrol:', error);
    }
  };

  const loadAvailableSites = async () => {
    if (!user) return;
    
    try {
      const sites = await PatrolService.getAvailableSites(user.id);
      setAvailableSites(sites);
      if (sites.length > 0 && !selectedSite) {
        setSelectedSite(sites[0].id);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const loadPatrolProgress = async () => {
    if (!activePatrol) return;
    
    try {
      const progress = await PatrolService.getPatrolProgress(activePatrol.id);
      setPatrolProgress(progress.progress);
    } catch (error) {
      console.error('Error loading patrol progress:', error);
    }
  };

  const handleStartPatrol = async () => {
    if (!user || !selectedSite) return;
    
    setLoading(true);
    try {
      const patrol = await PatrolService.startPatrol(selectedSite, user.id, profile?.Role === 'guard' ? undefined : user.id);
      setActivePatrol(patrol);
      toast({
        title: "Patrol Started",
        description: "Your patrol session has begun successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to start patrol",
        description: error.message || "Unable to start patrol session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndPatrol = async () => {
    if (!activePatrol) return;
    
    setLoading(true);
    try {
      await PatrolService.endPatrol(activePatrol.id);
      setActivePatrol(null);
      setPatrolProgress(0);
      toast({
        title: "Patrol Ended",
        description: "Your patrol session has been completed.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to end patrol",
        description: error.message || "Unable to end patrol session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedSiteData = availableSites.find(site => site.id === selectedSite);

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Patrol Status</span>
            <Badge variant={activePatrol ? "default" : "secondary"}>
              {activePatrol ? "Active" : "Idle"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activePatrol ? (
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
                  <span className="text-sm">
                    Started: {new Date(activePatrol.start_time).toLocaleTimeString()}
                  </span>
                </div>
                <Button 
                  onClick={handleEndPatrol} 
                  variant="destructive" 
                  size="sm"
                  disabled={loading}
                >
                  <Square className="h-4 w-4 mr-1" />
                  End Patrol
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {availableSites.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Site</label>
                  <select 
                    value={selectedSite} 
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {availableSites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button 
                onClick={handleStartPatrol} 
                className="w-full" 
                size="lg"
                disabled={loading || !selectedSite}
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Starting...' : 'Start Patrol'}
              </Button>
            </div>
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
              disabled={!activePatrol}
            >
              <Camera className="h-6 w-6 mr-2" />
              Scan QR
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={() => onNavigate('observation')} 
              className="w-full h-16 bg-orange-600 hover:bg-orange-700"
            >
              <AlertTriangle className="h-6 w-6 mr-2" />
              Patrol Observation
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
      {selectedSiteData && (
        <Card>
          <CardHeader>
            <CardTitle>Current Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{selectedSiteData.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{selectedSiteData.address}</span>
            </div>
            {profile && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Guard: {profile.full_name || profile.first_name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatrolDashboard;
