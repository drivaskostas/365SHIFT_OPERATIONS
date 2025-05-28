
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, AlertTriangle, User, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PatrolObservation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
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

  useEffect(() => {
    if (profile?.id) {
      fetchTeamObservations();
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
      notesArray = Object.values(notes).filter(note => note && (typeof note === 'string' || (typeof note === 'object' && note.text)));
    } else if (typeof notes === 'string' && notes.trim()) {
      notesArray = [notes];
    }

    if (notesArray.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="h-4 w-4 text-gray-500" />
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
              noteText = note.text || '';
              noteAuthor = note.author || '';
              noteTimestamp = note.timestamp || '';
            }
            
            if (!noteText.trim()) return null;
            
            return (
              <div key={index} className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="mb-1">{noteText}</p>
                {(noteAuthor || noteTimestamp) && (
                  <div className="text-xs text-gray-500 flex items-center space-x-2">
                    {noteAuthor && <span>By: {noteAuthor}</span>}
                    {noteTimestamp && <span>At: {new Date(noteTimestamp).toLocaleString()}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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
            <Card key={observation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{observation.title}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{observation.guard_name || 'Unknown Guard'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(observation.timestamp).toLocaleString()}</span>
                      </div>
                      {observation.latitude && observation.longitude && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(observation.severity)}`}>
                      {getSeverityText(observation.severity)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(observation.status)}`}>
                      {observation.status.charAt(0).toUpperCase() + observation.status.slice(1)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {observation.description && (
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {observation.description}
                  </p>
                )}
                {observation.image_url && (
                  <div className="mt-3">
                    <img
                      src={observation.image_url}
                      alt="Observation evidence"
                      className="max-w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                {renderNotes(observation.notes)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamObservations;
