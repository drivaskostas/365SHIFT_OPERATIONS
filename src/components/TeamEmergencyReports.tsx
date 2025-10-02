
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, User, Shield, AlertTriangle, CheckCircle, FileText, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedEmergencyService } from '@/services/EnhancedEmergencyService';

interface TeamEmergencyReportsProps {
  onBack: () => void;
}

interface EmergencyReport {
  id: string;
  guard_id: string;
  patrol_id?: string;
  team_id?: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  image_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  incident_time?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: string;
  guard_name?: string;
  involved_persons?: string;
  notes?: any; // Using any to match Supabase Json type
}

interface EmergencyReportWithProfile extends EmergencyReport {
  profiles?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
}

const TeamEmergencyReports = ({ onBack }: TeamEmergencyReportsProps) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [reports, setReports] = useState<EmergencyReportWithProfile[]>([]);
  const [selectedReport, setSelectedReport] = useState<EmergencyReportWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchEmergencyReports();
      
      // Set up real-time subscription for new emergency reports
      const subscription = supabase
        .channel('emergency-reports-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_reports'
        }, () => {
          console.log('New emergency report detected, refreshing data...');
          fetchEmergencyReports();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_reports'
        }, () => {
          console.log('Emergency report updated, refreshing data...');
          fetchEmergencyReports();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id]);

  const fetchEmergencyReports = async () => {
    try {
      setLoading(true);
      
      // Get user's team IDs
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', profile?.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        setReports([]);
        return;
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Fetch emergency reports from all teams
      const { data: emergencyReports, error } = await supabase
        .from('emergency_reports')
        .select('*')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching emergency reports:', error);
        return;
      }

      // For each report, try to get the guard profile information
      const reportsWithProfiles = await Promise.all(
        (emergencyReports || []).map(async (report) => {
          const { data: guardProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name')
            .eq('id', report.guard_id)
            .single();

          return {
            ...report,
            profiles: guardProfile || undefined
          };
        })
      );

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error('Error fetching emergency reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportHistory = async (reportId: string) => {
    try {
      setLoadingHistory(true);
      const history = await EnhancedEmergencyService.getReportHistory(reportId);
      setReportHistory(history);
    } catch (error) {
      console.error('Error fetching report history:', error);
      setReportHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleReportSelect = (report: EmergencyReportWithProfile) => {
    setSelectedReport(report);
    fetchReportHistory(report.id);
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
        return 'text-blue-600 bg-blue-100';
      case 'technical_issue':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityText = (severity: string) => {
    return t(`emergency.severity.${severity}`) || severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'investigating':
        return 'text-blue-600 bg-blue-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getGuardName = (report: EmergencyReportWithProfile) => {
    if (report.profiles?.full_name) return report.profiles.full_name;
    if (report.profiles?.first_name && report.profiles?.last_name) {
      return `${report.profiles.first_name} ${report.profiles.last_name}`;
    }
    return report.guard_name || 'Unknown Guard';
  };

  const renderNotes = (notes: any) => {
    if (!notes) return null;
    
    let notesArray = [];
    if (Array.isArray(notes)) {
      notesArray = notes;
    } else if (typeof notes === 'object' && notes !== null) {
      notesArray = Object.values(notes).filter(note => {
        if (typeof note === 'string' && note.trim()) return note;
        if (typeof note === 'object' && note !== null && 'text' in note) return note;
        return false;
      });
    } else if (typeof notes === 'string' && notes.trim()) {
      notesArray = [notes];
    }

    if (notesArray.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="truncate">Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notesArray.map((note: any, index: number) => {
              let noteText = '';
              let noteAuthor = '';
              let noteTimestamp = '';
              
              if (typeof note === 'string') {
                noteText = note;
              } else if (typeof note === 'object' && note !== null) {
                const noteObj = note as Record<string, any>;
                noteText = noteObj.text || '';
                noteAuthor = noteObj.author_name || noteObj.author || '';
                noteTimestamp = noteObj.timestamp || '';
              }
              
              if (!noteText.trim()) return null;
              
              return (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500 max-w-full overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-2">
                    <p className="text-xs text-gray-600 dark:text-gray-300 break-words">
                      {noteTimestamp ? new Date(noteTimestamp).toLocaleString() : 'No timestamp'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                      by {noteAuthor || 'Unknown'}
                    </p>
                  </div>
                  <p className="text-gray-900 dark:text-white break-words text-sm">{noteText}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (selectedReport) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedReport(null)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            Emergency Report Details
          </h1>
        </div>

        {/* Report Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="break-words line-clamp-2 min-w-0">{selectedReport.title}</span>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getSeverityColor(selectedReport.severity)}`}>
                  {getSeverityText(selectedReport.severity)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(selectedReport.status)}`}>
                  {selectedReport.status.toUpperCase()}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="min-w-0">
                  <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Reported by</p>
                  <p className="text-gray-900 dark:text-white break-words">{getGuardName(selectedReport)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Date & Time</p>
                  <p className="text-gray-900 dark:text-white break-words text-sm">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedReport.location && (
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Location</p>
                    <p className="text-gray-900 dark:text-white break-words text-sm">{selectedReport.location}</p>
                  </div>
                )}
                {selectedReport.latitude && selectedReport.longitude && (
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">GPS Coordinates</p>
                    <p className="text-gray-900 dark:text-white break-words text-sm font-mono">
                      {selectedReport.latitude}, {selectedReport.longitude}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {selectedReport.involved_persons && (
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Involved Persons</p>
                    <p className="text-gray-900 dark:text-white break-words text-sm">{selectedReport.involved_persons}</p>
                  </div>
                )}
                {selectedReport.resolved_at && (
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Resolved At</p>
                    <p className="text-gray-900 dark:text-white break-words text-sm">
                      {new Date(selectedReport.resolved_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedReport.resolved_by && (
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Resolved By</p>
                    <p className="text-gray-900 dark:text-white break-words text-sm">{selectedReport.resolved_by}</p>
                  </div>
                )}
              </div>
            </div>
            
            {selectedReport.description && (
              <div className="mt-4">
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2 text-sm">Description</p>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-full overflow-hidden">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words text-sm">
                    {selectedReport.description}
                  </p>
                </div>
              </div>
            )}

            {selectedReport.image_url && (
              <div className="mt-4">
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2 text-sm">Evidence</p>
                <div className="max-w-full overflow-hidden">
                  <img 
                    src={selectedReport.image_url} 
                    alt="Emergency evidence" 
                    className="max-w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        {renderNotes(selectedReport.notes)}

        {/* History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <History className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="truncate">History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : reportHistory.length > 0 ? (
              <div className="space-y-3">
                {reportHistory.map((historyItem) => (
                  <div key={historyItem.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-full overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          historyItem.action_type === 'created' ? 'bg-green-100 text-green-700' :
                          historyItem.action_type === 'status_change' ? 'bg-blue-100 text-blue-700' :
                          historyItem.action_type === 'note_added' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {historyItem.action_type.replace('_', ' ').toUpperCase()}
                        </span>
                        {historyItem.previous_status && historyItem.new_status && (
                          <span className="text-xs text-gray-600 dark:text-gray-300 break-words">
                            {historyItem.previous_status} → {historyItem.new_status}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-600 dark:text-gray-300 break-words">
                          {new Date(historyItem.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                          by {historyItem.user_name}
                        </p>
                      </div>
                    </div>
                    {historyItem.note && (
                      <p className="text-gray-900 dark:text-white mt-2 break-words text-sm">{historyItem.note}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 text-center py-4 text-sm">
                No history available for this report.
              </p>
            )}
          </CardContent>
        </Card>
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
          Emergency Reports
        </h1>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300">
              No emergency reports found for your teams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card 
              key={report.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => handleReportSelect(report)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2 break-words line-clamp-2 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                      <span className="truncate">{report.title}</span>
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{getGuardName(report)}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{new Date(report.created_at).toLocaleTimeString()}</span>
                      </div>
                      {report.location && (
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate text-xs">{report.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getSeverityColor(report.severity)}`}>
                      {getSeverityText(report.severity)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {report.description && (
                <CardContent className="pt-0">
                  <p className="text-gray-700 dark:text-gray-300 text-sm break-words line-clamp-2">
                    {report.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamEmergencyReports;
