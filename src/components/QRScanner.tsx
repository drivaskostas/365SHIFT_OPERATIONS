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
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
      console.log('🎥 Starting camera...');
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('▶️ Video playing, waiting for ready state...');
              // Wait a bit longer for video to be fully ready
              setTimeout(() => {
                setIsVideoReady(true);
                console.log('✅ Video ready, starting scan loop');
              }, 500);
            }).catch(err => {
              console.error('Error playing video:', err);
              setCameraError('Failed to start video playback');
            });
          }
        };
      }
      setCameraError(null);
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  };

  const startScanningLoop = () => {
    if (!canvasRef.current || !videoRef.current || !isVideoReady) {
      console.log('⚠️ Cannot start scanning - missing requirements');
      return;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.log('⚠️ Cannot get canvas context');
      return;
    }
    
    // Clear any previous interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    console.log('🔄 Starting QR scan loop...');
    
    // Set up scanning loop with more frequent scanning
    scanIntervalRef.current = window.setInterval(() => {
      if (!isScanning || isProcessing || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }
      
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code && code.data) {
          console.log("🎯 QR code detected:", code.data);
          handleScanSuccess(code.data);
        }
      } catch (err) {
        console.error("❌ QR scanning error:", err);
      }
    }, 100); // Scan every 100ms for better responsiveness
  };

  // Start scanning when video is ready
  useEffect(() => {
    if (isVideoReady && isScanning && !isProcessing) {
      startScanningLoop();
    }
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isVideoReady, isScanning, isProcessing]);

  const stopCamera = () => {
    console.log('🛑 Stopping camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsVideoReady(false);
  };

  const handleScanSuccess = async (qrData: string) => {
    if (!activePatrol || isProcessing) return;
    
    console.log('🔍 Processing QR scan:', qrData);
    setIsProcessing(true);
    
    try {
      let checkpointId = qrData;
      let parsedData = null;
      
      // Try to parse as JSON first
      try {
        parsedData = JSON.parse(qrData);
        console.log('📋 Parsed QR JSON:', parsedData);
        
        // Handle different JSON formats
        if (parsedData.type === 'checkpoint' && parsedData.checkpointId) {
          // Format: {"type":"checkpoint","siteId":"...","checkpointId":"...","name":"...","location":"..."}
          checkpointId = parsedData.checkpointId;
          console.log('✅ Extracted checkpointId from structured JSON:', checkpointId);
          
          // Validate that the QR code is for the correct site
          if (parsedData.siteId && parsedData.siteId !== activePatrol.site_id) {
            throw new Error(`This checkpoint belongs to a different site. Expected: ${activePatrol.site_id}, Found: ${parsedData.siteId}`);
          }
        } else if (parsedData.checkpointId) {
          // Format: {"checkpointId":"..."}
          checkpointId = parsedData.checkpointId;
          console.log('✅ Extracted checkpointId from simple JSON:', checkpointId);
        } else {
          console.log('⚠️ JSON found but no checkpointId field, using raw data');
        }
      } catch (e) {
        // Not JSON, assume the string itself is the checkpoint ID
        console.log('📝 Not JSON format, using raw string as checkpointId:', qrData);
      }
      
      console.log('🎯 Final checkpointId to validate:', checkpointId);
      
      // Validate checkpoint belongs to the current patrol site
      console.log('🔐 Validating checkpoint:', checkpointId, 'for site:', activePatrol.site_id);
      const checkpoint = await PatrolService.validateCheckpoint(checkpointId, activePatrol.site_id);
      
      if (!checkpoint) {
        throw new Error('Invalid checkpoint or checkpoint not found at this site');
      }
      
      console.log('✅ Checkpoint validated:', checkpoint);
      
      // Record the visit with location fallback strategy
      await PatrolService.recordCheckpointVisit(
        activePatrol.id,
        checkpointId,
        undefined, // Let the service handle location
        user?.id // Pass guardId for fallback location lookup
      );
      
      // Stop scanning temporarily and show success
      setIsScanning(false);
      setScanResult(`${checkpoint.name} - ${checkpoint.location}`);
      
      toast({
        title: "Checkpoint Scanned",
        description: "Successfully recorded checkpoint visit.",
      });
      
      // Reset after showing result
      setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
        setIsScanning(true);
        console.log('🔄 Resuming QR scanning...');
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ QR Scan failed:', error);
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to record checkpoint visit.",
        variant: "destructive",
      });
      
      // Resume scanning after error
      setTimeout(() => {
        setIsProcessing(false);
        console.log('🔄 Resuming scanning after error...');
      }, 2000);
    }
  };

  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        // Check if torch capability exists
        if ('torch' in capabilities) {
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
    }
  };

  // Manual scan for testing
  const handleManualScan = () => {
    // Test with the exact JSON format from your QR code
    const testData = '{"type":"checkpoint","siteId":"c5ca9f8d-7f57-4a62-bf70-0acccddbe9b8","checkpointId":"06d783a6-b1c1-49d4-a7ab-73d70201ffe5","name":"advasdcasc","location":"ascascasc"}';
    console.log('🧪 Testing with sample QR data:', testData);
    handleScanSuccess(testData);
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
          style={{ display: isVideoReady ? 'block' : 'none' }}
        />
        
        {!isVideoReady && (
          <div className="w-full h-96 bg-gray-800 flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className="h-12 w-12 mx-auto mb-4" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}
        
        {/* Hidden canvas for image processing */}
        <canvas 
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Scanning overlay */}
        {isVideoReady && (
          <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
          </div>
        )}
        
        {/* Scanning line */}
        {isScanning && isVideoReady && !isProcessing && (
          <div className="absolute w-full h-1 bg-green-500 animate-pulse top-1/2"></div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Processing QR code...</p>
            </div>
          </div>
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
            <li>• Supports structured JSON QR codes</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleManualScan} 
            className="w-full bg-yellow-600 hover:bg-yellow-700" 
            size="lg"
            disabled={isProcessing || !activePatrol}
          >
            <Camera className="h-5 w-5 mr-2" />
            Test Sample QR
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
