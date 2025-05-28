
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, User, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { EmergencyReport } from '@/types/database';

interface TeamEmergencyReportsProps {
  onBack: () => void;
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

  useEffect(() => {
    if (profile?.id) {
      fetchEmergencyReports();
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
        .select(`
          *,
          profiles!emergency_reports_guard_id_fkey(first_name, last_name, full_name)
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching emergency reports:', error);
        return;
      }

      setReports(emergencyReports || []);
    } catch (error) {
      console.error('Error fetching emergency reports:', error);
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
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Emergency Report Details
          </h1>
        </div>

        {/* Report Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedReport.title}</span>
              <div className="flex space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedReport.severity)}`}>
                  {selectedReport.severity.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                  {selectedReport.status.toUpperCase()}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Reported by</p>
                  <p className="text-gray-900 dark:text-white">{getGuardName(selectedReport)}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Date & Time</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedReport.location && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Location</p>
                    <p className="text-gray-900 dark:text-white">{selectedReport.location}</p>
                  </div>
                )}
                {selectedReport.latitude && selectedReport.longitude && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">GPS Coordinates</p>
                    <p className="text-gray-900 dark:text-white">
                      {selectedReport.latitude}, {selectedReport.longitude}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {selectedReport.involved_persons && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Involved Persons</p>
                    <p className="text-gray-900 dark:text-white">{selectedReport.involved_persons}</p>
                  </div>
                )}
                {selectedReport.resolved_at && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Resolved At</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(selectedReport.resolved_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedReport.resolved_by && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Resolved By</p>
                    <p className="text-gray-900 dark:text-white">{selectedReport.resolved_by}</p>
                  </div>
                )}
              </div>
            </div>
            
            {selectedReport.description && (
              <div className="mt-6">
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">Description</p>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedReport.description}
                  </p>
                </div>
              </div>
            )}

            {selectedReport.image_url && (
              <div className="mt-6">
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">Evidence</p>
                <img 
                  src={selectedReport.image_url} 
                  alt="Emergency evidence" 
                  className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
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
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedReport(report)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-red-500" />
                      {report.title}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{getGuardName(report)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(report.created_at).toLocaleTimeString()}</span>
                      </div>
                      {report.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{report.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
                      {report.severity.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {report.description && (
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
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
