
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PatrolSessionsProps {
  onBack: () => void;
}

interface PatrolCheckpointVisit {
  id: string;
  patrol_id: string;
  checkpoint_id: string;
  timestamp: string;
  status: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  checkpoint?: {
    name: string;
    location: string;
  };
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

interface PatrolWithCheckpoints extends PatrolSession {
  checkpointVisits: PatrolCheckpointVisit[];
  guardian_sites?: { name: string };
}

const PatrolSessions = ({ onBack }: PatrolSessionsProps) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [patrols, setPatrols] = useState<PatrolWithCheckpoints[]>([]);
  const [selectedPatrol, setSelectedPatrol] = useState<PatrolWithCheckpoints | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchPatrolSessions();
    }
  }, [profile?.id]);

  const fetchPatrolSessions = async () => {
    try {
      setLoading(true);
      
      // Get user's team patrols
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', profile?.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        setPatrols([]);
        return;
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Fetch patrol sessions from all teams
      const { data: patrolSessions, error } = await supabase
        .from('patrol_sessions')
        .select(`
          *,
          guardian_sites(name)
        `)
        .in('team_id', teamIds)
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching patrol sessions:', error);
        return;
      }

      // For each patrol, fetch checkpoint visits
      const patrolsWithCheckpoints = await Promise.all(
        (patrolSessions || []).map(async (patrol) => {
          const { data: visits } = await supabase
            .from('patrol_checkpoint_visits')
            .select(`
              *,
              guardian_checkpoints(name, location)
            `)
            .eq('patrol_id', patrol.id)
            .order('timestamp', { ascending: true });

          return {
            ...patrol,
            checkpointVisits: (visits || []).map(visit => ({
              ...visit,
              checkpoint: visit.guardian_checkpoints
            }))
          };
        })
      );

      setPatrols(patrolsWithCheckpoints);
    } catch (error) {
      console.error('Error fetching patrol sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (selectedPatrol) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedPatrol(null)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Checkpoint Visits
          </h1>
        </div>

        {/* Patrol Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">Patrol Session</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPatrol.status)} whitespace-nowrap`}>
                {selectedPatrol.status.toUpperCase()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-300">Start Time</p>
                <p className="font-medium truncate">{new Date(selectedPatrol.start_time).toLocaleString()}</p>
              </div>
              {selectedPatrol.end_time && (
                <div className="min-w-0">
                  <p className="text-gray-600 dark:text-gray-300">End Time</p>
                  <p className="font-medium truncate">{new Date(selectedPatrol.end_time).toLocaleString()}</p>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-300">Duration</p>
                <p className="font-medium truncate">{formatDuration(selectedPatrol.start_time, selectedPatrol.end_time)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-300">Checkpoints</p>
                <p className="font-medium">{selectedPatrol.checkpointVisits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkpoint Visits */}
        <div className="space-y-4">
          {selectedPatrol.checkpointVisits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-300">
                  No checkpoint visits recorded for this patrol.
                </p>
              </CardContent>
            </Card>
          ) : (
            selectedPatrol.checkpointVisits.map((visit, index) => (
              <Card key={visit.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                        <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {visit.checkpoint?.name || 'Unknown Checkpoint'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {visit.checkpoint?.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(visit.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        visit.status === 'completed' 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-yellow-600 bg-yellow-100'
                      } whitespace-nowrap`}>
                        {visit.status === 'completed' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {visit.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {visit.notes && (
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{visit.notes}</p>
                    </div>
                  )}
                  {visit.latitude && visit.longitude && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{visit.latitude.toFixed(6)}, {visit.longitude.toFixed(6)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Patrol Sessions
        </h1>
      </div>

      {/* Patrols List */}
      {patrols.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300">
              No patrol sessions found for your teams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {patrols.map((patrol) => (
            <Card 
              key={patrol.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPatrol(patrol)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2 truncate">
                      Patrol Session #{patrol.id.slice(-8)}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center space-x-1 min-w-0">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{new Date(patrol.start_time).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{new Date(patrol.start_time).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{patrol.guardian_sites?.name || 'Unknown Site'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patrol.status)} whitespace-nowrap`}>
                      {patrol.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300">Duration</p>
                    <p className="font-medium truncate">{formatDuration(patrol.start_time, patrol.end_time)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300">Checkpoints</p>
                    <p className="font-medium">{patrol.checkpointVisits.length}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300">Completed</p>
                    <p className="font-medium">
                      {patrol.checkpointVisits.filter(v => v.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatrolSessions;
