
import { useState } from 'react';
import { Camera, ArrowLeft, Flashlight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  onBack: () => void;
}

const QRScanner = ({ onBack }: QRScannerProps) => {
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  const handleScan = () => {
    // Simulate QR scan
    setIsScanning(false);
    setScanResult('Checkpoint-A1-Lobby');
    setTimeout(() => {
      setScanResult(null);
      setIsScanning(true);
    }, 3000);
  };

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
          onClick={() => setFlashlightOn(!flashlightOn)}
          className={`text-white ${flashlightOn ? 'bg-yellow-600' : ''}`}
        >
          <Flashlight className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera View Simulation */}
      <div className="relative flex-1 bg-gray-800">
        <div className="h-96 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
          {/* Scanning overlay */}
          <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
          </div>
          
          {/* Scanning line */}
          {isScanning && (
            <div className="absolute w-full h-1 bg-green-500 animate-pulse"></div>
          )}
          
          <div className="text-center">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">Position QR code within the frame</p>
          </div>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <Card className="mx-4 bg-green-600 text-white border-green-600">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scan Successful!</h3>
                <p className="text-sm opacity-90 mb-4">Checkpoint: {scanResult}</p>
                <p className="text-xs opacity-75">Location recorded • Time: {new Date().toLocaleTimeString()}</p>
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
        
        <Button onClick={handleScan} className="w-full bg-green-600 hover:bg-green-700" size="lg">
          <Camera className="h-5 w-5 mr-2" />
          Simulate Scan
        </Button>
      </div>
    </div>
  );
};

export default QRScanner;
