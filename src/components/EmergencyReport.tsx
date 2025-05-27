import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { EmergencyService } from '@/services/EmergencyService';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession } from '@/types/database';

interface EmergencyReportProps {
  onBack: () => void;
}

const EmergencyReport = ({ onBack }: EmergencyReportProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('critical');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);

  useEffect(() => {
    if (user) {
      loadActivePatrol();
    }
  }, [user]);

  const loadActivePatrol = async () => {
    if (!user) return;
    
    try {
      const patrol = await PatrolService.getActivePatrol(user.id);
      setActivePatrol(patrol);
    } catch (error) {
      console.error('Error loading active patrol:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description) return;

    setIsSubmitting(true);
    try {
      // EmergencyService will automatically get current location
      await EmergencyService.createEmergencyReport(
        user.id,
        activePatrol?.id,
        activePatrol?.team_id,
        title,
        description,
        severity
        // Location will be automatically captured by the service
      );
      
      toast({
        title: "Emergency Reported",
        description: "Your emergency report has been submitted with location data and flagged for immediate attention.",
      });
      
      onBack();
    } catch (error: any) {
      toast({
        title: "Failed to submit emergency report",
        description: error.message || "Unable to submit emergency report.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-50 dark:bg-red-900/20">
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onBack} className="text-white hover:bg-red-700">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <AlertTriangle className="h-6 w-6" />
          <h1 className="text-lg font-semibold">EMERGENCY REPORT</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Alert Banner */}
        <Card className="border-red-200 bg-red-100 dark:bg-red-900/40">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Emergency Protocol Active</h3>
                <p className="text-sm text-red-700 dark:text-red-300">This report will be prioritized and sent immediately</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Time */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span>Location captured</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Emergency Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Emergency Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the emergency"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-red-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Emergency Severity</Label>
                <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical - Life threatening</SelectItem>
                    <SelectItem value="high">High - Urgent security threat</SelectItem>
                    <SelectItem value="medium">Medium - Security concern</SelectItem>
                    <SelectItem value="low">Low - Minor incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the emergency situation in detail..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-red-200"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={!title || !description || isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {isSubmitting ? 'Sending Emergency Report...' : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    SEND EMERGENCY REPORT
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">Need Immediate Help?</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Call emergency services</p>
              </div>
              <Button variant="outline" className="border-blue-300 text-blue-700">
                <Phone className="h-4 w-4 mr-2" />
                Call 911
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmergencyReport;
