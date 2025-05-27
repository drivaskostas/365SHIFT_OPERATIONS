
import { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Flashlight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession } from '@/types/database';
import jsQR from 'jsqr';

interface QRScannerProps {
  onBack: () => void;
}

const QRScanner = ({ onBack }: QRScannerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [activePatrol, setActivePatrol] = useState<PatrolSession | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      loadActivePatrol();
    }
    return () => {
      stopCamera();
    };
  }, [user]);

  useEffect(() => {
    if (activePatrol) {
      startCamera();
    }
  }, [activePatrol]);

  const loadActivePatrol = async () => {
    if (!user) return;
    
    try {
      const patrol = await PatrolService.getActivePatrol(user.id);
      if (patrol) {
        setActivePatrol(patrol);
      } else {
        toast({
          title: "No Active Patrol",
          description: "Please start a patrol before scanning checkpoints.",
          variant: "destructive",
        });
        onBack();
      }
    } catch (error) {
      console.error('Error loading active patrol:', error);
      onBack();
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Start scanning loop once video is ready
        videoRef.current.onloadedmetadata = () => {
          startScanningLoop();
        };
      }
      setCameraError(null);
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  };

  const startScanningLoop = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear any previous interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    // Set up scanning loop
    scanIntervalRef.current = window.setInterval(() => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA || !isScanning) {
        return;
      }
      
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          console.log("QR code detected:", code.data);
          handleScanSuccess(code.data);
        }
      } catch (err) {
        console.error("QR scanning error:", err);
      }
    }, 200); // scan every 200ms
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const handleScanSuccess = async (qrData: string) => {
    if (!activePatrol) return;
    
    setIsScanning(false);
    
    try {
      // Attempt to parse QR data - could be JSON or plain text
      let checkpointId = qrData;
      try {
        // Check if it's a JSON string with a checkpointId field
        const parsedData = JSON.parse(qrData);
        if (parsedData.checkpointId) {
          checkpointId = parsedData.checkpointId;
        }
      } catch (e) {
        // Not JSON, assume the string itself is the checkpoint ID
      }
      
      // Get current location
      const location = await getCurrentLocation();
      
      // Validate checkpoint belongs to the current patrol site
      const checkpoint = await PatrolService.validateCheckpoint(checkpointId, activePatrol.site_id);
      
      if (!checkpoint) {
        throw new Error('Invalid checkpoint or checkpoint not found at this site');
      }
      
      // Record the visit
      await PatrolService.recordCheckpointVisit(
        activePatrol.id,
        checkpointId,
        location
      );
      
      setScanResult(`${checkpoint.name} - ${checkpoint.location}`);
      
      toast({
        title: "Checkpoint Scanned",
        description: "Successfully recorded checkpoint visit.",
      });
      
      // Reset after showing result
      setTimeout(() => {
        setScanResult(null);
        setIsScanning(true);
      }, 3000);
      
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to record checkpoint visit.",
        variant: "destructive",
      });
      setIsScanning(true);
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

  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn } as any]
          });
          setFlashlightOn(!flashlightOn);
        } catch (error) {
          console.error('Flashlight not supported:', error);
          toast({
            title: "Flashlight Error",
            description: "Your device does not support controlling the flashlight.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Flashlight Not Available",
          description: "Your device or browser doesn't support flashlight control.",
          variant: "destructive",
        });
      }
    }
  };

  // Manual scan for testing
  const handleManualScan = () => {
    // Only use this for testing when no camera is available
    const testCheckpointId = prompt('Enter checkpoint ID for testing:');
    if (testCheckpointId) {
      handleScanSuccess(testCheckpointId);
    }
  };

  if (cameraError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-red-900 text-white border-red-700">
          <CardContent className="p-6 text-center">
            <Camera className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
            <p className="text-sm mb-4">{cameraError}</p>
            <Button onClick={onBack} variant="outline" className="text-white border-white">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/50 relative z-10">
        <Button variant="ghost" onClick={onBack} className="text-white">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold">Scan Checkpoint</h1>
        <Button 
          variant="ghost" 
          onClick={toggleFlashlight}
          className={`text-white ${flashlightOn ? 'bg-yellow-600' : ''}`}
        >
          <Flashlight className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="relative flex-1 bg-gray-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-96 object-cover"
        />
        
        {/* Hidden canvas for image processing */}
        <canvas 
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Scanning overlay */}
        <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
        </div>
        
        {/* Scanning line */}
        {isScanning && (
          <div className="absolute w-full h-1 bg-green-500 animate-pulse top-1/2"></div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <Card className="mx-4 bg-green-600 text-white border-green-600">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scan Successful!</h3>
                <p className="text-sm opacity-90 mb-4">Checkpoint: {scanResult}</p>
                <p className="text-xs opacity-75">
                  Location recorded • Time: {new Date().toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-black/90">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ul className="text-sm space-y-1 text-gray-300">
            <li>• Hold phone steady over QR code</li>
            <li>• Ensure good lighting or use flashlight</li>
            <li>• Wait for automatic scan detection</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleManualScan} 
            className="w-full bg-yellow-600 hover:bg-yellow-700" 
            size="lg"
            disabled={!isScanning || !activePatrol}
          >
            <Camera className="h-5 w-5 mr-2" />
            Manual Test
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
