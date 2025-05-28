import { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Flashlight, CheckCircle, AlertTriangle, Info, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession, GuardianCheckpoint } from '@/types/database';
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [availableCheckpoints, setAvailableCheckpoints] = useState<GuardianCheckpoint[]>([]);
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('QR Scanner Debug:', logMessage);
    setDebugInfo(prev => [...prev.slice(-4), logMessage]); // Keep last 5 logs
  };

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
      loadAvailableCheckpoints();
    }
  }, [activePatrol]);

  const loadActivePatrol = async () => {
    if (!user) return;
    
    try {
      addDebugLog(`Loading active patrol for user: ${user.id}`);
      const patrol = await PatrolService.getActivePatrol(user.id);
      if (patrol) {
        setActivePatrol(patrol);
        addDebugLog(`Active patrol found: ${patrol.id} for site: ${patrol.site_id}`);
      } else {
        addDebugLog('No active patrol found');
        toast({
          title: "No Active Patrol",
          description: "Please start a patrol before scanning checkpoints.",
          variant: "destructive",
        });
        onBack();
      }
    } catch (error) {
      addDebugLog(`Error loading active patrol: ${error}`);
      console.error('Error loading active patrol:', error);
      onBack();
    }
  };

  const loadAvailableCheckpoints = async () => {
    if (!activePatrol) return;
    
    try {
      addDebugLog(`Loading checkpoints for site: ${activePatrol.site_id}`);
      const checkpoints = await PatrolService.debugGetAllCheckpoints(activePatrol.site_id);
      setAvailableCheckpoints(checkpoints);
      addDebugLog(`Found ${checkpoints.length} checkpoints for this site`);
    } catch (error) {
      addDebugLog(`Error loading checkpoints: ${error}`);
      console.error('Error loading checkpoints:', error);
    }
  };

  const startCamera = async () => {
    try {
      addDebugLog('Starting camera...');
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsVideoReady(true);
              addDebugLog('Camera started successfully');
              startScanningLoop();
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
      addDebugLog(`Camera error: ${error}`);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  };

  const startScanningLoop = () => {
    if (!canvasRef.current || !videoRef.current || !isVideoReady) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear any previous interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    addDebugLog('Starting QR scan loop');
    
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
          addDebugLog(`QR code detected: ${code.data}`);
          handleScanSuccess(code.data);
        }
      } catch (err) {
        console.error("QR scanning error:", err);
        addDebugLog(`QR scanning error: ${err}`);
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
    
    setIsVideoReady(false);
  };

  const handleScanSuccess = async (qrData: string) => {
    if (!activePatrol) {
      addDebugLog('No active patrol found during scan');
      return;
    }
    
    setIsScanning(false);
    addDebugLog(`🔍 SCAN START - Processing QR data: ${qrData}`);
    addDebugLog(`📍 Patrol ID: ${activePatrol.id}, Site ID: ${activePatrol.site_id}`);
    
    try {
      // Enhanced QR data parsing with detailed logging
      let checkpointId = qrData.trim();
      let parsedData = null;
      
      addDebugLog(`📋 Raw QR data: "${qrData}"`);
      addDebugLog(`📋 Trimmed QR data: "${checkpointId}"`);
      
      try {
        // Check if it's a JSON string with a checkpointId field
        parsedData = JSON.parse(qrData);
        addDebugLog(`✅ JSON parsing successful: ${JSON.stringify(parsedData)}`);
        
        if (parsedData.checkpointId) {
          checkpointId = parsedData.checkpointId;
          addDebugLog(`📍 Extracted checkpoint ID from JSON.checkpointId: ${checkpointId}`);
        } else if (parsedData.id) {
          checkpointId = parsedData.id;
          addDebugLog(`📍 Using JSON.id as checkpoint ID: ${checkpointId}`);
        } else {
          addDebugLog(`⚠️ JSON found but no checkpointId or id field`);
        }
      } catch (e) {
        // Not JSON, assume the string itself is the checkpoint ID
        addDebugLog(`📋 QR data is not JSON, using as checkpoint ID: ${checkpointId}`);
      }
      
      addDebugLog(`🎯 Final checkpoint ID: "${checkpointId}"`);
      addDebugLog(`🏢 Target site ID: "${activePatrol.site_id}"`);
      
      // Run debug validation step
      addDebugLog(`🔧 Running enhanced validation debug...`);
      await PatrolService.debugValidationStep(checkpointId, activePatrol.site_id);
      
      // Validate checkpoint belongs to the current patrol site
      addDebugLog(`🔍 Starting checkpoint validation...`);
      const checkpoint = await PatrolService.validateCheckpoint(checkpointId, activePatrol.site_id);
      
      if (!checkpoint) {
        addDebugLog(`❌ Checkpoint validation failed`);
        throw new Error(`Invalid checkpoint or checkpoint not found at this site. Checkpoint ID: ${checkpointId}, Site ID: ${activePatrol.site_id}`);
      }
      
      addDebugLog(`✅ Checkpoint validated successfully: ${checkpoint.name} at ${checkpoint.location}`);
      
      // Get current location - PatrolService will handle this automatically
      addDebugLog('📍 Getting current location...');
      const location = await PatrolService.getCurrentLocation();
      addDebugLog(`📍 Location obtained: ${location ? `${location.latitude}, ${location.longitude}` : 'No location'}`);
      
      // Record the visit with location
      addDebugLog(`💾 Recording checkpoint visit...`);
      await PatrolService.recordCheckpointVisit(
        activePatrol.id,
        checkpointId,
        location || undefined
      );
      
      setScanResult(`${checkpoint.name} - ${checkpoint.location}`);
      addDebugLog(`✅ Checkpoint visit recorded successfully`);
      
      toast({
        title: "Checkpoint Scanned",
        description: "Successfully recorded checkpoint visit with location.",
      });
      
      // Reset after showing result
      setTimeout(() => {
        setScanResult(null);
        setIsScanning(true);
        addDebugLog('🔄 Ready for next scan');
      }, 3000);
      
    } catch (error: any) {
      addDebugLog(`❌ SCAN FAILED: ${error.message}`);
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to record checkpoint visit.",
        variant: "destructive",
      });
      setIsScanning(true);
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

  // Enhanced manual scan for testing with validation debug
  const handleManualScan = async () => {
    const testCheckpointId = prompt('Enter checkpoint ID for testing:');
    if (testCheckpointId && activePatrol) {
      addDebugLog(`🧪 MANUAL TEST - Checkpoint ID: ${testCheckpointId}`);
      addDebugLog(`🧪 Site ID: ${activePatrol.site_id}`);
      
      // Run enhanced debug before actual scan
      await PatrolService.debugValidationStep(testCheckpointId, activePatrol.site_id);
      
      handleScanSuccess(testCheckpointId);
    }
  };

  // Quick scan from available checkpoints
  const handleQuickScan = (checkpointId: string) => {
    addDebugLog(`⚡ QUICK SCAN - Using checkpoint: ${checkpointId}`);
    handleScanSuccess(checkpointId);
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
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            onClick={() => setShowCheckpoints(!showCheckpoints)}
            className="text-white"
            size="sm"
          >
            <List className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-white"
            size="sm"
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={toggleFlashlight}
            className={`text-white ${flashlightOn ? 'bg-yellow-600' : ''}`}
          >
            <Flashlight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Active Patrol Info */}
      {activePatrol && (
        <div className="px-4 pb-2">
          <Alert className="bg-blue-900/50 border-blue-700">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-white">
              Active patrol for site: {activePatrol.site_id}
              <br />
              Patrol ID: {activePatrol.id}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Available Checkpoints */}
      {showCheckpoints && availableCheckpoints.length > 0 && (
        <div className="px-4 pb-2">
          <Alert className="bg-green-900/50 border-green-700">
            <List className="h-4 w-4" />
            <AlertDescription className="text-white">
              <div className="text-sm font-semibold mb-2">Available Checkpoints ({availableCheckpoints.length}):</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableCheckpoints.map((checkpoint) => (
                  <div key={checkpoint.id} className="flex justify-between items-center text-xs">
                    <span>{checkpoint.name} - {checkpoint.location}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScan(checkpoint.id)}
                      className="text-white border-white h-6 px-2"
                      disabled={!isScanning}
                    >
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Debug Info */}
      {showDebugInfo && debugInfo.length > 0 && (
        <div className="px-4 pb-2">
          <Alert className="bg-gray-900/50 border-gray-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-white">
              <div className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

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
        {isScanning && isVideoReady && (
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
            <li>• Use checkpoint list to test specific IDs</li>
            <li>• Check debug info for detailed validation logs</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleManualScan} 
            className="flex-1 bg-yellow-600 hover:bg-yellow-700" 
            size="lg"
            disabled={!isScanning || !activePatrol}
          >
            <Camera className="h-5 w-5 mr-2" />
            Manual Test
          </Button>
          <Button 
            onClick={() => setShowDebugInfo(!showDebugInfo)} 
            variant="outline"
            className="text-white border-white" 
            size="lg"
          >
            Debug
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
