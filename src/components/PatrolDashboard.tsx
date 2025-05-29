
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PatrolService } from '@/services/PatrolService';
import { ShiftValidationService } from '@/services/ShiftValidationService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, MapPin, Loader2, XCircle } from 'lucide-react';

interface PatrolDashboardProps {
  onNavigate: (screen: string) => void;
}

const PatrolDashboard = ({ onNavigate }: PatrolDashboardProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activePatrol, setActivePatrol] = useState(null);
  const [sites, setSites] = useState([]);
  const [currentSite, setCurrentSite] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);
  const [visitedCheckpoints, setVisitedCheckpoints] = useState(0);
  const [shiftInfo, setShiftInfo] = useState(null);

  useEffect(() => {
    if (user) {
      loadShiftInfo();
      loadActivePatrol();
    }
  }, [user]);

  useEffect(() => {
    if (activePatrol) {
      loadPatrolProgress();
    }
  }, [activePatrol]);

  const loadShiftInfo = async () => {
    setIsLoading(true);
    try {
      const shiftData = await ShiftValidationService.getGuardActiveShiftSite(user.id);
      console.log('📋 Shift data:', shiftData);
      setShiftInfo(shiftData);
      
      if (shiftData.siteId) {
        // Load the specific site for this guard's shift
        const { data: siteData, error } = await supabase
          .from('guardian_sites')
          .select('*')
          .eq('id', shiftData.siteId)
          .eq('active', true)
          .single();

        if (error) {
          console.error('Error loading shift site:', error);
          setSites([]);
        } else {
          console.log('✅ Loaded shift site:', siteData);
          setSites([siteData]);
        }
      } else {
        // Fallback to loading available sites
        await loadAvailableSites();
      }
    } catch (error) {
      console.error('Error loading shift info:', error);
      await loadAvailableSites();
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSites = async () => {
    try {
      const availableSites = await PatrolService.getAvailableSites(user.id);
      setSites(availableSites);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to load available sites.",
        variant: "destructive",
      });
    }
  };

  const loadActivePatrol = async () => {
    try {
      const patrol = await PatrolService.getActivePatrol(user.id);
      setActivePatrol(patrol);
      
      if (patrol) {
        const site = sites.find(site => site.id === patrol.site_id);
        setCurrentSite(site || null);
      } else {
        setCurrentSite(null);
      }
    } catch (error) {
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
    } catch (error) {
      console.error('Failed to load patrol progress:', error);
      toast({
        title: "Error",
        description: "Failed to load patrol progress.",
        variant: "destructive",
      });
    }
  };

  const handleStartPatrol = async (siteId) => {
    if (!user) return;

    setIsStarting(true);
    try {
      console.log('🚀 Starting patrol with site:', siteId, 'and team:', shiftInfo?.teamId);
      
      const patrol = await PatrolService.startPatrol(siteId, user.id, shiftInfo?.teamId);
      setActivePatrol(patrol);
      
      const site = sites.find(site => site.id === siteId);
      setCurrentSite(site || null);
      
      toast({
        title: "Patrol Started",
        description: `Started patrol at ${site?.name || 'selected site'}`
      });
    } catch (error) {
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
        description: "Patrol has been successfully ended."
      });
    } catch (error) {
      toast({
        title: "Failed to end patrol",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Welcome, {user?.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage your security patrols efficiently. Start a new patrol or continue an existing one.</p>
            <Button 
              variant="secondary" 
              className="mt-4"
              onClick={() => signOut()}
            >
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-gray-600">
                    {visitedCheckpoints}/{totalCheckpoints} checkpoints
                  </span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <MapPin className="h-4 w-4" />
                <span>{currentSite.address}</span>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => onNavigate('scanner')}
                  className="flex-1"
                >
                  Scan Checkpoint
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleEndPatrol}
                >
                  End Patrol
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Available Sites</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading sites...</span>
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No sites available for patrol.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please contact your supervisor for site assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sites.map((site) => (
                    <div 
                      key={site.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{site.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{site.address}</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleStartPatrol(site.id)}
                          disabled={isStarting}
                          size="sm"
                        >
                          {isStarting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Starting...
                            </>
                          ) : (
                            'Start Patrol'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
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
