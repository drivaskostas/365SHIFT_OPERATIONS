
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, MapPin, Clock, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { ObservationService } from '@/services/ObservationService';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession } from '@/types/database';

interface PatrolObservationProps {
  onBack: () => void;
}

const PatrolObservation = ({ onBack }: PatrolObservationProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
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
      // Cleanup camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
          facingMode: 'environment', // Use back camera on mobile
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

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(photoDataUrl);

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

  const removePhoto = () => {
    setPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description) return;

    setIsSubmitting(true);
    try {
      // Get current location
      const location = await getCurrentLocation();
      
      await ObservationService.createObservation(
        user.id,
        activePatrol?.id,
        activePatrol?.team_id,
        title,
        description,
        severity,
        photo || undefined,
        location
      );
      
      toast({
        title: "Observation Reported",
        description: "Your patrol observation has been submitted successfully.",
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

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          resolve(undefined);
        },
        { timeout: 10000 }
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">Patrol Observation</h1>
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
            <CardTitle>Observation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Observation Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the observation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity Level</Label>
                <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
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
                  placeholder="Provide detailed information about the observation..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Photo Section */}
              <div className="space-y-2">
                <Label>Evidence Photo</Label>
                
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
                        Take Photo
                      </Button>
                      <Button 
                        type="button"
                        onClick={stopCamera}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : photo ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img 
                        src={photo} 
                        alt="Captured observation" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        onClick={removePhoto}
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    type="button"
                    onClick={startCamera}
                    variant="outline" 
                    className="w-full h-16 border-dashed"
                  >
                    <Camera className="h-6 w-6 mr-2" />
                    Capture Photo
                  </Button>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={!title || !description || isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {isSubmitting ? 'Submitting...' : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Observation
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
