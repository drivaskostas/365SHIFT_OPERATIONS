import { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Flashlight, CheckCircle, AlertTriangle, Info, List, PlayCircle } from 'lucide-react';
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
  const [lastQRData, setLastQRData] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('QR Scanner Debug:', logMessage);
    setDebugInfo(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
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
      addDebugLog('❌ No active patrol found during scan');
      return;
    }
    
    setIsScanning(false);
    setLastQRData(qrData);
    addDebugLog(`🔍 SCAN START - Processing QR data: ${qrData}`);
    addDebugLog(`📍 Active Patrol: ${activePatrol.id}, Site: ${activePatrol.site_id}`);
    
    try {
      // Enhanced QR data parsing with JSON support
      addDebugLog(`📋 Raw QR data: "${qrData}"`);
      
      // Use the new parsing method to handle JSON QR codes
      const parsedQR = PatrolService.parseQRData(qrData);
      addDebugLog(`📋 Parsed QR result: ${JSON.stringify(parsedQR)}`);
      
      let checkpointId: string;
      let siteId: string;
      
      if (parsedQR) {
        if (parsedQR.checkpointId && parsedQR.siteId) {
          // JSON QR code with both checkpoint and site ID
          checkpointId = parsedQR.checkpointId;
          siteId = parsedQR.siteId;
          addDebugLog(`✅ Using JSON QR data - Checkpoint: ${checkpointId}, Site: ${siteId}`);
          
          // Log additional data if present
          if (parsedQR.additionalData) {
            addDebugLog(`📝 Additional QR data: ${JSON.stringify(parsedQR.additionalData)}`);
          }
          
          // Verify the site ID matches the active patrol
          if (siteId !== activePatrol.site_id) {
            addDebugLog(`⚠️ Site ID mismatch - QR Site: ${siteId}, Patrol Site: ${activePatrol.site_id}`);
            throw new Error(`This checkpoint belongs to a different site. Expected: ${activePatrol.site_id}, Found: ${siteId}`);
          }
        } else if (parsedQR.checkpointId) {
          // Plain UUID format
          checkpointId = parsedQR.checkpointId;
          siteId = activePatrol.site_id;
          addDebugLog(`✅ Using plain UUID with patrol site - Checkpoint: ${checkpointId}, Site: ${siteId}`);
        } else {
          throw new Error('Invalid QR code format - missing checkpoint ID');
        }
      } else {
        // Fallback to treating the entire string as checkpoint ID
        checkpointId = qrData.trim();
        siteId = activePatrol.site_id;
        addDebugLog(`⚠️ Fallback parsing - treating as plain checkpoint ID: ${checkpointId}`);
      }
      
      addDebugLog(`🎯 Final validation parameters - Checkpoint: "${checkpointId}", Site: "${siteId}"`);
      
      // Enhanced validation with detailed logging
      addDebugLog(`🔧 Running comprehensive validation debug...`);
      await PatrolService.debugValidationStep(checkpointId, siteId);
      
      // Validate checkpoint belongs to the current patrol site
      addDebugLog(`🔍 Starting checkpoint validation...`);
      const checkpoint = await PatrolService.validateCheckpoint(checkpointId, siteId);
      
      if (!checkpoint) {
        addDebugLog(`❌ Checkpoint validation failed`);
        addDebugLog(`🔧 Available checkpoints in current site:`);
        availableCheckpoints.forEach(cp => {
          addDebugLog(`  - ${cp.id} (${cp.name})`);
        });
        throw new Error(`Invalid checkpoint or checkpoint not found at this site. Checkpoint ID: ${checkpointId}, Site ID: ${siteId}`);
      }
      
      addDebugLog(`✅ Checkpoint validated successfully: ${checkpoint.name} at ${checkpoint.location}`);
      
      // Get current location
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
        title: "Checkpoint Scanned Successfully",
        description: `${checkpoint.name} recorded with location data.`,
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

  // Enhanced manual scan with JSON QR support
  const handleManualScan = async () => {
    const testData = prompt('Enter QR data for testing (JSON or UUID):');
    if (testData && activePatrol) {
      addDebugLog(`🧪 MANUAL TEST - QR Data: ${testData}`);
      addDebugLog(`🧪 Current Site: ${activePatrol.site_id}`);
      
      // Parse and show what we extracted
      const parsed = PatrolService.parseQRData(testData);
      addDebugLog(`🧪 Parsed result: ${JSON.stringify(parsed)}`);
      
      handleScanSuccess(testData);
    }
  };

  // Test with your specific JSON format
  const handleTestYourQR = () => {
    const yourQRData = '{"type":"checkpoint","siteId":"c5ca9f8d-7f57-4a62-bf70-0acccddbe9b8","checkpointId":"06d783a6-b1c1-49d4-a7ab-73d70201ffe5","name":"advasdcasc","location":"ascascasc"}';
    addDebugLog(`🎯 TESTING YOUR QR - Using: ${yourQRData}`);
    handleScanSuccess(yourQRData);
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

      {/* Last QR Data Display */}
      {lastQRData && (
        <div className="px-4 pb-2">
          <Alert className="bg-purple-900/50 border-purple-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-white">
              <div className="text-sm font-semibold mb-1">Last Scanned QR:</div>
              <div className="text-xs font-mono break-all">{lastQRData}</div>
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
              <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                {debugInfo.map((log, index) => (
                  <div key={index} className={
                    log.includes('❌') ? 'text-red-300' :
                    log.includes('✅') ? 'text-green-300' :
                    log.includes('⚠️') ? 'text-yellow-300' :
                    log.includes('🔧') ? 'text-blue-300' :
                    'text-gray-300'
                  }>{log}</div>
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
            <li>• Supports JSON format: {"{"}"type":"checkpoint","checkpointId":"...","siteId":"..."{"}"}</li>
            <li>• Also supports plain UUID format</li>
            <li>• Use debug info to see parsing details</li>
            <li>• Test your specific QR code with the "Test Your QR" button</li>
          </ul>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button 
            onClick={handleManualScan} 
            className="bg-yellow-600 hover:bg-yellow-700" 
            size="sm"
            disabled={!isScanning || !activePatrol}
          >
            <Camera className="h-4 w-4 mr-1" />
            Manual Test
          </Button>
          <Button 
            onClick={handleTestYourQR} 
            className="bg-purple-600 hover:bg-purple-700" 
            size="sm"
            disabled={!isScanning || !activePatrol}
          >
            <PlayCircle className="h-4 w-4 mr-1" />
            Test Your QR
          </Button>
        </div>
        
        <Button 
          onClick={() => setShowDebugInfo(!showDebugInfo)} 
          variant="outline"
          className="w-full text-white border-white" 
          size="sm"
        >
          {showDebugInfo ? 'Hide' : 'Show'} Debug Info
        </Button>
      </div>
    </div>
  );
};

export default QRScanner;
