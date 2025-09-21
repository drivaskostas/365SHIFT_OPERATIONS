import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, MapPin, Clock, Send, X, Database, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ObservationService } from '@/services/ObservationService';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession } from '@/types/database';

interface PatrolObservationProps {
  onBack: () => void;
}

const PatrolObservation = ({ onBack }: PatrolObservationProps) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [locationInfo, setLocationInfo] = useState<{
    coordinates: { latitude: number; longitude: number } | null;
    source: 'database' | 'device' | 'none';
    status: 'loading' | 'success' | 'error';
  }>({
    coordinates: null,
    source: 'none',
    status: 'loading'
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadActivePatrol();
      loadLocationInfo();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const loadLocationInfo = async () => {
    if (!user) return;
    
    console.log('🔄 Loading location info for observation...');
    setLocationInfo(prev => ({ ...prev, status: 'loading' }));
    
    try {
      // First try to get location from database
      const dbLocation = await ObservationService.getLatestGuardLocation(user.id);
      
      if (dbLocation) {
        console.log('✅ Location loaded from database:', dbLocation);
        setLocationInfo({
          coordinates: dbLocation,
          source: 'database',
          status: 'success'
        });
        return;
      }

      // If no database location, try device location
      console.log('🔄 No database location found, trying device location...');
      const deviceLocation = await ObservationService.getCurrentLocation();
      
      if (deviceLocation) {
        console.log('✅ Location loaded from device:', deviceLocation);
        setLocationInfo({
          coordinates: deviceLocation,
          source: 'device',
          status: 'success'
        });
        return;
      }

      // No location available
      console.warn('⚠️ No location available for observation');
      setLocationInfo({
        coordinates: null,
        source: 'none',
        status: 'error'
      });
      
      toast({
        title: "Location Warning",
        description: "Could not get your location. Observation will be submitted without coordinates.",
        variant: "destructive",
      });
      
    } catch (error) {
      console.error('❌ Error loading location info:', error);
      setLocationInfo({
        coordinates: null,
        source: 'none',
        status: 'error'
      });
      
      toast({
        title: "Location Error",
        description: "Failed to get your location. Please ensure location permissions are enabled.",
        variant: "destructive",
      });
    }
  };

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
        title: t('camera.error'),
        description: t('camera.permission_error'),
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

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotos(prev => [...prev, photoDataUrl]);

    // Stop camera
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

  const selectFromLibrary = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') && photos.length < 5) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotos(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description) return;

    console.log('📝 Submitting observation with location info:', locationInfo);

    setIsSubmitting(true);
    try {
      // Use the coordinates we loaded when the component mounted
      await ObservationService.createObservation(
        user.id,
        activePatrol?.id,
        activePatrol?.team_id,
        title,
        description,
        severity,
        photos.length > 0 ? photos : undefined,
        locationInfo.coordinates || undefined
      );
      
      const locationMessage = locationInfo.coordinates 
        ? `Your patrol observation has been submitted with location coordinates (${locationInfo.source}).`
        : "Your patrol observation has been submitted (location not available).";
      
      toast({
        title: "Observation Reported",
        description: locationMessage,
      });
      
      onBack();
    } catch (error: any) {
      toast({
        title: "Failed to submit observation",
        description: error.message || "Unable to submit patrol observation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationStatusInfo = () => {
    switch (locationInfo.status) {
      case 'loading':
        return { icon: '🔄', text: 'Loading location...', color: 'text-gray-500' };
      case 'success':
        return { 
          icon: locationInfo.source === 'database' ? '💾' : '📍', 
          text: `Location from ${locationInfo.source}`, 
          color: 'text-green-500' 
        };
      case 'error':
        return { icon: '❌', text: 'Location unavailable', color: 'text-red-500' };
      default:
        return { icon: '❓', text: 'Unknown status', color: 'text-gray-500' };
    }
  };

  const statusInfo = getLocationStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">{t('observation.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Location Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                {locationInfo.source === 'database' ? (
                  <Database className={`h-4 w-4 ${statusInfo.color}`} />
                ) : (
                  <MapPin className={`h-4 w-4 ${statusInfo.color}`} />
                )}
                <span className={statusInfo.color}>
                  {statusInfo.text}
                </span>
                {locationInfo.coordinates && (
                  <span className="text-xs text-gray-400">
                    ({locationInfo.coordinates.latitude.toFixed(6)}, {locationInfo.coordinates.longitude.toFixed(6)})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            {locationInfo.status === 'error' && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadLocationInfo}
                  className="text-xs"
                >
                  Retry Location
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('observation.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('observation.observation_title')}</Label>
                <Input
                  id="title"
                  placeholder={t('placeholder.observation_title')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">{t('observation.severity')}</Label>
                <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('severity.low')}</SelectItem>
                    <SelectItem value="medium">{t('severity.medium')}</SelectItem>
                    <SelectItem value="high">{t('severity.high')}</SelectItem>
                    <SelectItem value="critical">{t('severity.critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('observation.description')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('placeholder.description')}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Photos Section */}
              <div className="space-y-2">
                <Label>{t('observation.evidence_photos')} ({photos.length}/5)</Label>
                
                {/* Display captured photos */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={photo} 
                          alt={`Observation evidence ${index + 1}`} 
                          className="w-full h-64 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          onClick={() => removePhoto(index)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
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
                        className="w-full h-160 object-cover"
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
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        type="button"
                        onClick={startCamera}
                        variant="outline" 
                        className="h-16 border-dashed"
                        disabled={photos.length >= 5}
                      >
                        <Camera className="h-6 w-6 mr-2" />
                        {t('observation.take_photo')}
                      </Button>
                      <Button 
                        type="button"
                        onClick={selectFromLibrary}
                        variant="outline" 
                        className="h-16 border-dashed"
                        disabled={photos.length >= 5}
                      >
                        <ImageIcon className="h-6 w-6 mr-2" />
                        Photo Library
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={!title || !description || isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {isSubmitting ? t('common.loading') : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    {t('observation.submit_observation')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PatrolObservation;
