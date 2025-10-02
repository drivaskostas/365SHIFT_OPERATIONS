import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, AlertTriangle, User, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import ObservationDetailModal from './ObservationDetailModal';

interface PatrolObservation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'technical_issue';
  status: string;
  timestamp: string;
  guard_name: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  notes?: any;
}

interface TeamObservationsProps {
  onBack: () => void;
}

const TeamObservations = ({ onBack }: TeamObservationsProps) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [observations, setObservations] = useState<PatrolObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<PatrolObservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchTeamObservations();
      
      // Set up real-time subscription for new observations
      const subscription = supabase
        .channel('patrol-observations-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'patrol_observations'
        }, () => {
          console.log('New observation detected, refreshing data...');
          fetchTeamObservations();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'patrol_observations'
        }, () => {
          console.log('Observation updated, refreshing data...');
          fetchTeamObservations();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id]);

  const fetchTeamObservations = async () => {
    try {
      setLoading(true);
      
      // Get user's teams first
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', profile?.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        setObservations([]);
        return;
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Fetch observations from all teams the user belongs to
      const { data: teamObservations, error } = await supabase
        .from('patrol_observations')
        .select('*')
        .in('team_id', teamIds)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching team observations:', error);
        return;
      }

      setObservations(teamObservations || []);
    } catch (error) {
      console.error('Error fetching team observations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'technical_issue':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityText = (severity: string) => {
    return t(`severity.${severity}`) || severity;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderNotes = (notes: any) => {
    if (!notes) return null;
    
    // Handle both array format and other formats
    let notesArray = [];
    if (Array.isArray(notes)) {
      notesArray = notes;
    } else if (typeof notes === 'object' && notes !== null) {
      // If it's an object, try to extract meaningful content
      notesArray = Object.values(notes).filter(note => {
        if (typeof note === 'string') return note;
        if (typeof note === 'object' && note !== null && 'text' in note) return note;
        return false;
      });
    } else if (typeof notes === 'string' && notes.trim()) {
      notesArray = [notes];
    }

    if (notesArray.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700">Notes:</span>
        </div>
        <div className="space-y-1">
          {notesArray.map((note, index) => {
            // Handle different note formats
            let noteText = '';
            let noteAuthor = '';
            let noteTimestamp = '';
            
            if (typeof note === 'string') {
              noteText = note;
            } else if (typeof note === 'object' && note !== null) {
              const noteObj = note as Record<string, any>;
              noteText = noteObj.text || '';
              noteAuthor = noteObj.author || '';
              noteTimestamp = noteObj.timestamp || '';
            }
            
            if (!noteText.trim()) return null;
            
            return (
              <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded break-words">
                <p className="mb-1 break-words">{noteText}</p>
                {(noteAuthor || noteTimestamp) && (
                  <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                    {noteAuthor && <span className="truncate">By: {noteAuthor}</span>}
                    {noteTimestamp && <span className="truncate">At: {new Date(noteTimestamp).toLocaleString()}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleObservationClick = (observation: PatrolObservation) => {
    setSelectedObservation(observation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedObservation(null);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mr-4 flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {t('dashboard.observations')}
        </h1>
      </div>

      {/* Observations List */}
      {observations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300">
              No observations found for your teams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {observations.map((observation) => (
            <Card 
              key={observation.id} 
              className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
              onClick={() => handleObservationClick(observation)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2 break-words line-clamp-2">{observation.title}</CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{observation.guard_name || 'Unknown Guard'}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{new Date(observation.timestamp).toLocaleString()}</span>
                      </div>
                      {observation.latitude && observation.longitude && (
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-xs">
                            {observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getSeverityColor(observation.severity)}`}>
                      {getSeverityText(observation.severity)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(observation.status)}`}>
                      {observation.status.charAt(0).toUpperCase() + observation.status.slice(1)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {observation.description && (
                  <p className="text-gray-700 dark:text-gray-300 mb-3 break-words line-clamp-3">
                    {observation.description}
                  </p>
                )}
                {observation.image_url && (
                  <div className="mt-3">
                    <img
                      src={observation.image_url}
                      alt="Observation evidence"
                      className="w-full max-w-sm h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                {renderNotes(observation.notes)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Observation Detail Modal */}
      <ObservationDetailModal
        observation={selectedObservation}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default TeamObservations;
