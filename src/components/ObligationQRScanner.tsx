import { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Flashlight, CheckCircle, ClipboardList, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ObligationService } from '@/services/ObligationService';
import { useToast } from '@/hooks/use-toast';
import type { ContractObligation, ObligationCompletion } from '@/types/database';
import jsQR from 'jsqr';

interface ObligationQRScannerProps {
  onBack: () => void;
  onObligationScanned: (obligation: ContractObligation, existingCompletion: ObligationCompletion | null) => void;
}

const ObligationQRScanner = ({ onBack, onObligationScanned }: ObligationQRScannerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

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

  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera for obligation scanning...');
      
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
              console.log('▶️ Video playing');
              setTimeout(() => {
                setIsVideoReady(true);
                console.log('✅ Video ready for scanning');
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
      return;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    console.log('🔄 Starting obligation QR scan loop...');
    
    scanIntervalRef.current = window.setInterval(() => {
      if (!isScanning || isProcessing || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }
      
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
    }, 100);
  };

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

  const triggerSuccessFeedback = () => {
    console.log('🎵 Triggering success feedback...');

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100, 50, 200]);
      } catch (error) {
        console.log('Vibration failed:', error);
      }
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Audio feedback failed:', error);
    }
  };

  const handleScanSuccess = async (qrData: string) => {
    if (isProcessing) return;
    
    console.log('🔍 Processing obligation QR scan:', qrData);
    setIsProcessing(true);
    setIsScanning(false);
    
    try {
      // Check if this is an obligation QR (URL format or JSON)
      let obligationId = qrData;
      
      // Handle URL format: /complete-obligation/{id}
      const urlMatch = qrData.match(/\/complete-obligation\/([a-f0-9-]+)/i);
      if (urlMatch) {
        obligationId = urlMatch[1];
      }
      
      // Validate and get obligation
      const result = await ObligationService.validateObligationQR(obligationId);
      
      triggerSuccessFeedback();
      
      setScanResult(result.obligation.title);
      
      toast({
        title: result.alreadyCompleted ? "Already Completed" : "Obligation Found",
        description: result.alreadyCompleted 
          ? `"${result.obligation.title}" was already completed today.`
          : `Found: "${result.obligation.title}"`,
        variant: result.alreadyCompleted ? "default" : "default",
      });
      
      // Wait a moment then navigate to completion page
      setTimeout(() => {
        stopCamera();
        onObligationScanned(result.obligation, result.existingCompletion);
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Obligation QR Scan failed:', error);
      toast({
        title: "Scan Failed",
        description: error.message || "This QR code is not a valid obligation code.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setIsProcessing(false);
        setIsScanning(true);
        setScanResult(null);
      }, 2000);
    }
  };

  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        if ('torch' in capabilities) {
          try {
            await track.applyConstraints({
              advanced: [{ torch: !flashlightOn } as any]
            });
            setFlashlightOn(!flashlightOn);
          } catch (error) {
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
      <div className="p-3 flex items-center justify-between bg-black/50 relative z-10">
        <Button variant="ghost" onClick={onBack} className="text-white p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold truncate mx-2 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Scan Task QR
        </h1>
        <Button 
          variant="ghost" 
          onClick={toggleFlashlight}
          className={`text-white p-2 ${flashlightOn ? 'bg-yellow-600' : ''}`}
        >
          <Flashlight className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="relative bg-gray-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-80 object-cover"
          style={{ display: isVideoReady ? 'block' : 'none' }}
        />
        
        {!isVideoReady && (
          <div className="w-full h-80 bg-gray-800 flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className="h-12 w-12 mx-auto mb-4" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scanning overlay */}
        {isVideoReady && (
          <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
          </div>
        )}
        
        {/* Scanning line */}
        {isScanning && isVideoReady && !isProcessing && (
          <div className="absolute w-full h-1 bg-blue-500 animate-pulse top-1/2"></div>
        )}

        {/* Processing indicator */}
        {isProcessing && !scanResult && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Processing QR code...</p>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm bg-blue-600 text-white border-blue-600">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Task Found!</h3>
                <p className="text-sm opacity-90 mb-4">{scanResult}</p>
                <p className="text-xs opacity-75">
                  Opening completion form...
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-black/90 space-y-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-blue-400" />
              Scan Task QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300 mb-4">
              Point your camera at the task QR code to mark it as completed.
            </p>
            <ul className="text-sm space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                Hold phone steady over QR code
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                Ensure good lighting or use flashlight
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                Wait for automatic detection
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                Complete checklist if required
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/30 border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-200 mb-1">Tip</h4>
                <p className="text-sm text-blue-300">
                  Each task can only be completed once per day. If already completed, you'll see the previous completion details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ObligationQRScanner;
