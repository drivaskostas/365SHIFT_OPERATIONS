import { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Flashlight, CheckCircle, MapPin, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { PatrolService } from '@/services/PatrolService';
import { useToast } from '@/hooks/use-toast';
import type { PatrolSession, GuardianCheckpoint } from '@/types/database';
import jsQR from 'jsqr';
import { supabase } from '@/lib/supabase';

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
  const [progress, setProgress] = useState({ totalCheckpoints: 0, visitedCheckpoints: 0, progress: 0 });
  const [remainingCheckpoints, setRemainingCheckpoints] = useState<GuardianCheckpoint[]>([]);
  const [visitedCheckpointIds, setVisitedCheckpointIds] = useState<Set<string>>(new Set());
  
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
      loadPatrolProgress();
    }
  }, [activePatrol]);

  const loadActivePatrol = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Loading active patrol for user:', user.id);
      const patrol = await PatrolService.getActivePatrol(user.id);
      console.log('📋 Active patrol found:', patrol);
      
      if (patrol) {
        setActivePatrol(patrol);
      } else {
        console.log('❌ No active patrol found');
        toast({
          title: "No Active Patrol",
          description: "Please start a patrol before scanning checkpoints.",
          variant: "destructive",
        });
        onBack();
      }
    } catch (error) {
      console.error('❌ Error loading active patrol:', error);
      toast({
        title: "Error",
        description: "Failed to load patrol information. Please try again.",
        variant: "destructive",
      });
      onBack();
    }
  };

  const loadPatrolProgress = async () => {
    if (!activePatrol) return;
    
    try {
      // Retrieve checkpoint group ID from localStorage
      const checkpointGroupId = localStorage.getItem(`checkpoint_group_${activePatrol.id}`);
      console.log('📊 Loading patrol progress for patrol:', activePatrol.id);
      console.log('📋 Checkpoint group ID from localStorage:', checkpointGroupId);
      
      const progressData = await PatrolService.getPatrolProgress(activePatrol.id);
      console.log('📈 Progress data:', progressData);
      setProgress(progressData);
      
      // Load checkpoints based on checkpoint group if specified
      let checkpointsQuery = supabase
        .from('guardian_checkpoints')
        .select('*')
        .eq('site_id', activePatrol.site_id)
        .eq('active', true);
      
      // Filter by checkpoint group if specified
      if (checkpointGroupId) {
        console.log('🎯 Filtering checkpoints by group:', checkpointGroupId);
        checkpointsQuery = checkpointsQuery.eq('checkpoint_group_id', checkpointGroupId);
      } else {
        console.log('🌐 Loading all checkpoints for site (no group filter)');
      }
      
      const { data: allCheckpoints, error: checkpointsError } = await checkpointsQuery;
      
      if (checkpointsError) {
        console.error('❌ Error loading checkpoints:', checkpointsError);
        throw checkpointsError;
      }
      
      console.log(`📍 Found ${allCheckpoints?.length || 0} checkpoints for this patrol`);
        
      const { data: visitedVisits } = await supabase
        .from('patrol_checkpoint_visits')
        .select('checkpoint_id')
        .eq('patrol_id', activePatrol.id)
        .eq('status', 'completed');
        
      const visitedIds = new Set(visitedVisits?.map(v => v.checkpoint_id) || []);
      console.log(`✅ Already visited ${visitedIds.size} checkpoints`);
      setVisitedCheckpointIds(visitedIds);
      
      const remaining = allCheckpoints?.filter(cp => !visitedIds.has(cp.id)) || [];
      console.log(`🎯 Remaining checkpoints: ${remaining.length}`);
      setRemainingCheckpoints(remaining);
      
      // Update progress with actual checkpoint count from filtered results
      const actualTotalCheckpoints = allCheckpoints?.length || 0;
      setProgress(prev => ({
        ...prev,
        totalCheckpoints: actualTotalCheckpoints,
        progress: actualTotalCheckpoints > 0 
          ? Math.round((visitedIds.size / actualTotalCheckpoints) * 100)
          : 0
      }));
      
      // Warning if no checkpoints found
      if (!allCheckpoints || allCheckpoints.length === 0) {
        console.warn('⚠️ No checkpoints found for this patrol!');
        const checkpointGroupId = localStorage.getItem(`checkpoint_group_${activePatrol.id}`);
        toast({
          title: "No Checkpoints",
          description: checkpointGroupId 
            ? "No checkpoints found in the selected group. Please contact your supervisor."
            : "No checkpoints found for this site. Please contact your supervisor.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error loading patrol progress:', error);
      toast({
        title: "Error",
        description: "Failed to load patrol progress. Please try again.",
        variant: "destructive",
      });
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
    }, 100);
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

  // Enhanced haptic and beep feedback function
  const triggerSuccessFeedback = () => {
    console.log('🎵 Triggering success feedback...');

    // Enhanced haptic feedback
    if ('vibrate' in navigator) {
      try {
        // Pattern: short-long-short vibration for success
        const vibrated = navigator.vibrate([100, 50, 100, 50, 200]);
        console.log('📳 Vibration triggered:', vibrated);
      } catch (error) {
        console.log('❌ Vibration failed:', error);
      }
    } else {
      console.log('⚠️ Vibration not supported');
    }

    // Multiple audio fallback methods
    try {
      // Method 1: Web Audio API (most reliable)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🔊 Using Web Audio API');
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Success beep: pleasant two-tone
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      // Volume control
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
      
      console.log('✅ Web Audio API beep played');
    } catch (error) {
      console.log('❌ Web Audio API failed, trying HTML5 Audio:', error);
      
      try {
        // Method 2: HTML5 Audio with data URL (fallback)
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LFeSMFl7Hm8dpMEAxjrOPwtWAeAz6H0fPJ';
        audio.play().then(() => {
          console.log('✅ HTML5 Audio beep played');
        }).catch(e => {
          console.log('❌ HTML5 Audio failed:', e);
        });
      } catch (error2) {
        console.log('❌ HTML5 Audio also failed:', error2);
        
        // Method 3: Simple frequency beep (last resort)
        try {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          oscillator.frequency.value = 1000;
          oscillator.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.2);
          console.log('✅ Simple frequency beep played');
        } catch (error3) {
          console.log('❌ All audio methods failed:', error3);
        }
      }
    }
  };

  const handleScanSuccess = async (qrData: string) => {
    if (!activePatrol || isProcessing) {
      console.log('⚠️ No active patrol or already processing');
      return;
    }
    
    console.log('🔍 Processing QR scan:', qrData);
    console.log('📍 Active patrol site ID:', activePatrol.site_id);
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
          checkpointId = parsedData.checkpointId;
          console.log('✅ Extracted checkpointId from structured JSON:', checkpointId);
          
          // Validate that the QR code is for the correct site
          if (parsedData.siteId && parsedData.siteId !== activePatrol.site_id) {
            console.log('❌ Site mismatch - Expected:', activePatrol.site_id, 'Found:', parsedData.siteId);
            throw new Error(`This checkpoint belongs to a different site. Expected site: ${activePatrol.site_id}, but QR code is for site: ${parsedData.siteId}`);
          }
        } else if (parsedData.checkpointId) {
          checkpointId = parsedData.checkpointId;
          console.log('✅ Extracted checkpointId from simple JSON:', checkpointId);
        } else {
          console.log('⚠️ JSON found but no checkpointId field, using raw data');
        }
      } catch (e) {
        console.log('📝 Not JSON format, using raw string as checkpointId:', qrData);
      }
      
      console.log('🎯 Final checkpointId to validate:', checkpointId);
      console.log('🔐 Validating against site:', activePatrol.site_id);
      
      // Check if already visited
      if (visitedCheckpointIds.has(checkpointId)) {
        throw new Error('This checkpoint has already been scanned in this patrol session.');
      }
      
      // Validate checkpoint belongs to the current patrol site
      const checkpoint = await PatrolService.validateCheckpoint(checkpointId, activePatrol.site_id);
      
      if (!checkpoint) {
        console.log('❌ Checkpoint validation failed for:', checkpointId, 'at site:', activePatrol.site_id);
        throw new Error(`Invalid checkpoint or checkpoint not found at this site. Checkpoint ID: ${checkpointId}, Expected Site: ${activePatrol.site_id}`);
      }
      
      console.log('✅ Checkpoint validated:', checkpoint);
      
      // Record the visit
      await PatrolService.recordCheckpointVisit(
        activePatrol.id,
        checkpointId,
        undefined,
        user?.id
      );
      
      // Trigger haptic feedback and beep sound on success
      triggerSuccessFeedback();
      
      // Update local state
      const newVisitedIds = new Set([...visitedCheckpointIds, checkpointId]);
      setVisitedCheckpointIds(newVisitedIds);
      setRemainingCheckpoints(prev => prev.filter(cp => cp.id !== checkpointId));
      
      // Update progress
      const newProgress = {
        totalCheckpoints: progress.totalCheckpoints,
        visitedCheckpoints: newVisitedIds.size,
        progress: Math.round((newVisitedIds.size / progress.totalCheckpoints) * 100)
      };
      setProgress(newProgress);
      
      // Stop scanning temporarily and show success
      setIsScanning(false);
      setScanResult(`${checkpoint.name} - ${checkpoint.location}`);
      
      toast({
        title: "Checkpoint Scanned",
        description: `Successfully recorded visit to ${checkpoint.name}`,
      });
      
      // Check if patrol is complete (all checkpoints in group scanned)
      const isComplete = newProgress.progress >= 100 && newProgress.totalCheckpoints > 0;
      console.log(`📊 Progress: ${newProgress.visitedCheckpoints}/${newProgress.totalCheckpoints} (${newProgress.progress}%)`);
      console.log(`🏁 Is patrol complete? ${isComplete}`);
      
      if (isComplete) {
        console.log('🎉 Patrol completed! Auto-ending patrol session...');
        
        setTimeout(async () => {
          try {
            await PatrolService.endPatrol(activePatrol.id);
            toast({
              title: "🎉 Patrol Completed!",
              description: `All ${newProgress.totalCheckpoints} checkpoints scanned. Patrol session ended automatically.`,
            });
            onBack(); // Return to dashboard
          } catch (error) {
            console.error('Error ending patrol:', error);
            toast({
              title: "Error",
              description: "Failed to end patrol automatically. Please end it manually.",
              variant: "destructive",
            });
          }
        }, 3000);
      } else {
        // Reset after showing result for incomplete patrol
        console.log(`⏳ Patrol incomplete - ${newProgress.totalCheckpoints - newProgress.visitedCheckpoints} checkpoints remaining`);
        setTimeout(() => {
          setScanResult(null);
          setIsProcessing(false);
          setIsScanning(true);
          console.log('🔄 Resuming QR scanning...');
        }, 3000);
      }
      
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
      {/* Header - Fixed with better responsive handling */}
      <div className="p-3 flex items-center justify-between bg-black/50 relative z-10">
        <Button variant="ghost" onClick={onBack} className="text-white p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold truncate mx-2">Scan Checkpoint</h1>
        <Button 
          variant="ghost" 
          onClick={toggleFlashlight}
          className={`text-white p-2 ${flashlightOn ? 'bg-yellow-600' : ''}`}
        >
          <Flashlight className="h-5 w-5" />
        </Button>
      </div>

      {/* Debug Info - More compact */}
      {activePatrol && (
        <div className="px-2 py-1 bg-blue-900/50 text-xs text-blue-200 truncate">
          Active Patrol: {activePatrol.id.slice(0, 8)}... | Site: {activePatrol.site_id.slice(0, 8)}...
        </div>
      )}

      {/* Camera View */}
      <div className="relative bg-gray-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 sm:h-80 object-cover"
          style={{ display: isVideoReady ? 'block' : 'none' }}
        />
        
        {!isVideoReady && (
          <div className="w-full h-64 sm:h-80 bg-gray-800 flex items-center justify-center">
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
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
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
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm bg-green-600 text-white border-green-600">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scan Successful!</h3>
                <p className="text-sm opacity-90 mb-4">Checkpoint: {scanResult}</p>
                <p className="text-xs opacity-75">
                  Location recorded • Time: {new Date().toLocaleTimeString()}
                </p>
                {progress.progress >= 100 && (
                  <p className="text-sm font-semibold mt-2 text-yellow-300">
                    🎉 Patrol Complete! Ending session...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Progress and Instructions */}
      <div className="p-4 bg-black/90 space-y-4">
        {/* Progress Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Patrol Progress
              </span>
              <span className="text-2xl font-bold text-green-400">
                {progress.progress}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Checkpoints Scanned</span>
              <span className="font-semibold text-white">
                {progress.visitedCheckpoints} / {progress.totalCheckpoints}
              </span>
            </div>
            <Progress value={progress.progress} className="h-3" />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Completed</span>
              <span className="font-medium text-green-400">
                {progress.totalCheckpoints - progress.visitedCheckpoints} remaining
              </span>
            </div>
            
            {progress.totalCheckpoints === 0 && (
              <div className="mt-3 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                <p className="text-xs text-yellow-200">
                  ⚠️ No checkpoints found for this patrol group. Please contact your supervisor.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remaining Checkpoints */}
        {remainingCheckpoints.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Remaining Checkpoints ({remainingCheckpoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {remainingCheckpoints.map((checkpoint) => (
                  <div key={checkpoint.id} className="flex justify-between items-center p-2 bg-gray-700 rounded text-sm">
                    <span className="text-white font-medium truncate">{checkpoint.name}</span>
                    <span className="text-gray-300 text-xs ml-2 flex-shrink-0">{checkpoint.location}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-white">Instructions:</h3>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Hold phone steady over QR code</li>
              <li>• Ensure good lighting or use flashlight</li>
              <li>• Wait for automatic scan detection</li>
              <li>• QR must belong to current patrol site</li>
              <li>• Successful scans will vibrate and beep</li>
              <li className="text-green-400 font-medium">• Patrol ends automatically when all checkpoints are scanned</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRScanner;
