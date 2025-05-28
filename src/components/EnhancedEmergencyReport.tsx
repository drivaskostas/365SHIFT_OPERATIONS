import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Clock, Send, Camera, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { EnhancedEmergencyService } from '@/services/EnhancedEmergencyService';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession } from '@/types/database';
import type { EmergencyType, EmergencyReportData } from '@/types/emergency';
import { EMERGENCY_TYPES } from '@/types/emergency';

interface EnhancedEmergencyReportProps {
  onBack: () => void;
}

const EnhancedEmergencyReport = ({ onBack }: EnhancedEmergencyReportProps) => {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  // Form state
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('critical');
  const [locationDescription, setLocationDescription] = useState('');
  const [involvedPersons, setInvolvedPersons] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState(new Date().toTimeString().slice(0, 5));
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
  
  // Camera state
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) {
      loadActivePatrol();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Auto-fill title when emergency type changes
  useEffect(() => {
    if (emergencyType && emergencyType !== 'other') {
      setTitle(EMERGENCY_TYPES[emergencyType][language]);
    } else {
      setTitle('');
    }
  }, [emergencyType, language]);

  const loadActivePatrol = async () => {
    if (!user) return;
    
    try {
      const patrol = await PatrolService.getActivePatrol(user.id);
      setActivePatrol(patrol);
    } catch (error) {
      console.error('Error loading active patrol:', error);
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotos(prev => [...prev, photoDataUrl]);

    stopCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description || description.length < 10) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields. Description must be at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const reportData: EmergencyReportData = {
        emergency_type: emergencyType,
        title,
        description,
        severity,
        location_description: locationDescription,
        involved_persons_details: involvedPersons || undefined,
        images: photos
      };

      await EnhancedEmergencyService.createEmergencyReport(
        user.id,
        activePatrol?.id,
        activePatrol?.team_id,
        reportData
      );
      
      toast({
        title: "Emergency Report Submitted",
        description: "Your emergency report has been submitted and notifications have been sent.",
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
          <h1 className="text-lg font-semibold">{t('emergency.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Alert Banner */}
        <Card className="border-red-200 bg-red-100 dark:bg-red-900/40">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">{t('emergency.protocol_active')}</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{t('emergency.prioritized')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Info */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span>{t('location.gps_coordinates')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">{t('emergency.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Emergency Type */}
              <div className="space-y-2">
                <Label htmlFor="emergency-type">{t('emergency.type')} *</Label>
                <Select value={emergencyType} onValueChange={(value: EmergencyType) => setEmergencyType(value)}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue placeholder="Select emergency type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMERGENCY_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value[language]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('emergency.emergency_title')} *</Label>
                <Input
                  id="title"
                  placeholder={t('placeholder.emergency_title')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-red-200"
                  required
                />
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label htmlFor="severity">{t('emergency.emergency_severity')} *</Label>
                <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">{t('emergency.severity.critical')}</SelectItem>
                    <SelectItem value="high">{t('emergency.severity.high')}</SelectItem>
                    <SelectItem value="medium">{t('emergency.severity.medium')}</SelectItem>
                    <SelectItem value="low">{t('emergency.severity.low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incident-date">{t('emergency.incident_date')}</Label>
                  <Input
                    id="incident-date"
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="border-red-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incident-time">{t('emergency.incident_time')}</Label>
                  <Input
                    id="incident-time"
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="border-red-200"
                  />
                </div>
              </div>

              {/* Location Description */}
              <div className="space-y-2">
                <Label htmlFor="location">{t('emergency.location_description')} *</Label>
                <Input
                  id="location"
                  placeholder={t('placeholder.location_description')}
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  className="border-red-200"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('emergency.detailed_description')} * (min. 10 characters)</Label>
                <Textarea
                  id="description"
                  placeholder={t('placeholder.emergency_description')}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-red-200"
                  required
                  minLength={10}
                />
                <p className="text-xs text-gray-500">{description.length}/10 {t('validation.min_characters')}</p>
              </div>

              {/* Involved Persons */}
              <div className="space-y-2">
                <Label htmlFor="involved-persons">{t('emergency.involved_persons')}</Label>
                <Textarea
                  id="involved-persons"
                  placeholder={t('placeholder.involved_persons')}
                  rows={2}
                  value={involvedPersons}
                  onChange={(e) => setInvolvedPersons(e.target.value)}
                  className="border-red-200"
                />
              </div>

              {/* Photos Section */}
              <div className="space-y-2">
                <Label>{t('observation.evidence_photos')} ({photos.length}/5)</Label>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={photo} 
                          alt={`Emergency evidence ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          onClick={() => removePhoto(index)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {isCapturing ? (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-full h-64 object-cover"
                        playsInline
                        muted
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {t('observation.take_photo')}
                      </Button>
                      <Button 
                        type="button"
                        onClick={stopCamera}
                        variant="outline"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    type="button"
                    onClick={startCamera}
                    variant="outline" 
                    className="w-full h-16 border-dashed border-red-300"
                    disabled={photos.length >= 5}
                  >
                    <Camera className="h-6 w-6 mr-2" />
                    {photos.length === 0 ? t('observation.capture_photos') : t('observation.add_photo')}
                  </Button>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={!title || !description || description.length < 10 || !locationDescription || isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {isSubmitting ? 'Sending Emergency Report...' : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    {t('emergency.send_report')}
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
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">{t('emergency.need_help')}</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">{t('emergency.call_emergency')}</p>
              </div>
              <Button variant="outline" className="border-blue-300 text-blue-700">
                <Phone className="h-4 w-4 mr-2" />
                {t('emergency.call_911')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EnhancedEmergencyReport;
