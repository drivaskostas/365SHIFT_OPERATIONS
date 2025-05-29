
import { useState, useEffect } from 'react';
import { Fingerprint, Scan, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import { useToast } from '@/hooks/use-toast';

interface BiometricAuthProps {
  userEmail?: string;
  onSuccess: (userId: string) => void;
  onRegister?: () => void;
  mode: 'login' | 'register';
  userId?: string;
}

const BiometricAuth = ({ userEmail, onSuccess, onRegister, mode, userId }: BiometricAuthProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const supported = await BiometricAuthService.isSupported();
    setIsSupported(supported);
  };

  const handleBiometricLogin = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    setError(null);

    const result = await BiometricAuthService.authenticateWithBiometric(userEmail);
    
    if (result.success && result.userId) {
      onSuccess(result.userId);
      toast({
        title: "Authentication successful",
        description: "Welcome back! You've been signed in with biometric authentication.",
      });
    } else {
      setError(result.error || 'Biometric authentication failed');
    }
    
    setIsLoading(false);
  };

  const handleBiometricRegister = async () => {
    if (!userId || !userEmail) return;
    
    setIsLoading(true);
    setError(null);

    const result = await BiometricAuthService.registerBiometric(userId, userEmail);
    
    if (result.success) {
      setRegistrationSuccess(true);
      toast({
        title: "Biometric authentication enabled",
        description: "You can now use fingerprint or face recognition to sign in.",
      });
      onRegister?.();
    } else {
      setError(result.error || 'Failed to register biometric authentication');
    }
    
    setIsLoading(false);
  };

  if (!isSupported) {
    return null;
  }

  if (registrationSuccess) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Biometric authentication has been successfully enabled for your account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {mode === 'login' ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleBiometricLogin}
          disabled={isLoading || !userEmail}
        >
          <Fingerprint className="h-4 w-4 mr-2" />
          {isLoading ? 'Authenticating...' : 'Sign in with Biometrics'}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleBiometricRegister}
          disabled={isLoading || !userId || !userEmail}
        >
          <Scan className="h-4 w-4 mr-2" />
          {isLoading ? 'Setting up...' : 'Enable Biometric Authentication'}
        </Button>
      )}

      <div className="text-xs text-gray-500 text-center">
        {mode === 'login' 
          ? 'Use your fingerprint, face, or device PIN to sign in securely'
          : 'Enable biometric authentication for faster and more secure sign-ins'
        }
      </div>
    </div>
  );
};

export default BiometricAuth;
