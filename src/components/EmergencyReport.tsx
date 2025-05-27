
import { useState } from 'react';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmergencyReportProps {
  onBack: () => void;
}

const EmergencyReport = ({ onBack }: EmergencyReportProps) => {
  const [emergencyType, setEmergencyType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate emergency submission
    setTimeout(() => {
      setIsSubmitting(false);
      onBack();
    }, 2000);
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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency Type</label>
              <Select value={emergencyType} onValueChange={setEmergencyType}>
                <SelectTrigger className="border-red-200">
                  <SelectValue placeholder="Select emergency type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical Emergency</SelectItem>
                  <SelectItem value="fire">Fire Emergency</SelectItem>
                  <SelectItem value="security">Security Breach</SelectItem>
                  <SelectItem value="violence">Violence/Threat</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="other">Other Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the emergency situation..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-red-200"
              />
            </div>
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

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!emergencyType || !description || isSubmitting}
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
      </div>
    </div>
  );
};

export default EmergencyReport;
