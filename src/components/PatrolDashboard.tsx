import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListHeader, ListItem } from '@/components/ui/list';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { PatrolSession, GuardianSite } from '@/types/database';

const PatrolDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
  const [sites, setSites] = useState<GuardianSite[]>([]);
  const [currentSite, setCurrentSite] = useState<GuardianSite | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);
  const [visitedCheckpoints, setVisitedCheckpoints] = useState(0);

  useEffect(() => {
    if (user) {
      loadAvailableSites();
      loadActivePatrol();
    }
  }, [user]);

  useEffect(() => {
    if (activePatrol) {
      loadPatrolProgress();
    }
  }, [activePatrol]);

  const loadAvailableSites = async () => {
    setIsLoading(true);
    try {
      const availableSites = await PatrolService.getAvailableSites(user!.id);
      setSites(availableSites);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load available sites.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivePatrol = async () => {
    try {
      const patrol = await PatrolService.getActivePatrol(user!.id);
      setActivePatrol(patrol);
      if (patrol) {
        const site = sites.find(site => site.id === patrol.site_id);
        setCurrentSite(site || null);
      } else {
        setCurrentSite(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load active patrol.",
        variant: "destructive",
      });
    }
  };

  const loadPatrolProgress = async () => {
    if (!activePatrol) return;

    try {
      const progressData = await PatrolService.getPatrolProgress(activePatrol.id);
      setProgress(progressData.progress);
      setTotalCheckpoints(progressData.totalCheckpoints);
      setVisitedCheckpoints(progressData.visitedCheckpoints);
    } catch (error: any) {
      console.error("Failed to load patrol progress:", error);
      toast({
        title: "Error",
        description: "Failed to load patrol progress.",
        variant: "destructive",
      });
    }
  };

  const handleStartPatrol = async (siteId: string) => {
    if (!user) return;
    
    setIsStarting(true);
    try {
      // Get shift information to determine the correct team
      const shiftInfo = localStorage.getItem('guardShiftInfo');
      let teamId = undefined;
      
      if (shiftInfo) {
        try {
          const parsedShiftInfo = JSON.parse(shiftInfo);
          teamId = parsedShiftInfo.teamId;
          console.log('🎯 Using team ID from shift info:', teamId);
        } catch (error) {
          console.error('❌ Error parsing shift info:', error);
        }
      }
      
      console.log('🚀 Starting patrol with site:', siteId, 'and team:', teamId);
      const patrol = await PatrolService.startPatrol(siteId, user.id, teamId);
      
      setActivePatrol(patrol);
      setCurrentSite(sites.find(site => site.id === siteId) || null);
      
      toast({
        title: "Patrol Started",
        description: `Started patrol at ${currentSite?.name || 'selected site'}`,
      });
    } catch (error: any) {
      console.error('❌ Failed to start patrol:', error);
      toast({
        title: "Failed to start patrol",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndPatrol = async () => {
    if (!activePatrol) return;

    try {
      await PatrolService.endPatrol(activePatrol.id);
      setActivePatrol(null);
      setCurrentSite(null);
      setProgress(0);
      setTotalCheckpoints(0);
      setVisitedCheckpoints(0);
      toast({
        title: "Patrol Ended",
        description: "Patrol has been successfully ended.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to end patrol",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewPatrol = () => {
    navigate('/patrol');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Welcome, {user?.email}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Manage your security patrols efficiently. Start a new patrol or
              continue an existing one.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {activePatrol && currentSite ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Active Patrol at {currentSite.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Patrol Progress:</div>
                  <div className="text-sm">{visitedCheckpoints} / {totalCheckpoints}</div>
                </div>
                <Progress value={progress} />
                <div className="text-xs text-gray-500 mt-1">{progress}% Completed</div>
              </div>
              <div className="flex justify-between">
                <Button onClick={handleViewPatrol}>
                  View Patrol <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="destructive" onClick={handleEndPatrol}>
                  End Patrol
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Start a New Patrol
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading available sites...
                </div>
              ) : sites.length > 0 ? (
                <List>
                  <ListHeader>Available Sites</ListHeader>
                  {sites.map((site) => (
                    <ListItem key={site.id}>
                      <button
                        onClick={() => handleStartPatrol(site.id)}
                        className="w-full text-left hover:bg-gray-50 py-2 px-3 rounded-md flex items-center justify-between"
                        disabled={isStarting}
                      >
                        <div>
                          <div className="font-semibold">{site.name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="mr-1 h-4 w-4" />
                            {site.address}
                          </div>
                        </div>
                        {isStarting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </button>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <div className="text-center">
                  <XCircle className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  No sites available. Contact your administrator.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatrolDashboard;
