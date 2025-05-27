
import { useState } from 'react';
import { ArrowLeft, Camera, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface IncidentReportProps {
  onBack: () => void;
}

const IncidentReport = ({ onBack }: IncidentReportProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoCapture = () => {
    // Simulate photo capture
    setPhoto('incident-photo-' + Date.now());
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      onBack();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">Incident Report</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Location Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>Auto-captured location</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Incident Title</Label>
              <Input
                id="title"
                placeholder="Brief description of the incident"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity Level</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Requires attention</SelectItem>
                  <SelectItem value="high">High - Urgent action needed</SelectItem>
                  <SelectItem value="critical">Critical - Immediate response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information about the incident..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Photo Section */}
            <div className="space-y-2">
              <Label>Evidence Photo</Label>
              {photo ? (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <Camera className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Photo captured: {photo}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setPhoto(null)}
                  >
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handlePhotoCapture}
                  variant="outline" 
                  className="w-full h-16 border-dashed"
                >
                  <Camera className="h-6 w-6 mr-2" />
                  Capture Photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!title || !description || !severity || isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700"
          size="lg"
        >
          {isSubmitting ? 'Submitting...' : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Submit Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default IncidentReport;
