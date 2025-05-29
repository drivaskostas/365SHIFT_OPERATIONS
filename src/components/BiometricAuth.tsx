
import { useState, useEffect } from 'react';
import { Fingerprint, Scan, AlertCircle, CheckCircle, Info, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
  const [hasCredentials, setHasCredentials] = useState(false);
  const [checkingCredentials, setCheckingCredentials] = useState(true);
  const [testingSupport, setTestingSupport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  useEffect(() => {
    if (userEmail && mode === 'login') {
      checkExistingCredentials();
    } else {
      setCheckingCredentials(false);
    }
  }, [userEmail, mode]);

  const checkBiometricSupport = async () => {
    console.log('Checking biometric support...');
    const supported = await BiometricAuthService.isSupported();
    console.log('Biometric support result:', supported);
    setIsSupported(supported);
  };

  const testBiometricSupport = async () => {
    setTestingSupport(true);
    setError(null);
    
    try {
      console.log('=== TESTING BIOMETRIC SUPPORT ===');
      console.log('1. Checking WebAuthn availability...');
      
      if (!window.PublicKeyCredential) {
        setError('WebAuthn is not supported in this browser');
        return;
      }
      
      console.log('2. WebAuthn is available');
      console.log('3. Checking platform authenticator...');
      
      if (!window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        setError('Platform authenticator check not available');
        return;
      }
      
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('4. Platform authenticator available:', available);
      
      if (available) {
        toast({
          title: "Biometric Support Test",
          description: "✅ Your device supports biometric authentication!",
        });
        setIsSupported(true);
      } else {
        setError('Platform authenticator not available. Make sure Face ID or Touch ID is enabled in your device settings.');
      }
    } catch (error) {
      console.error('Biometric support test failed:', error);
      setError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingSupport(false);
    }
  };

  const checkExistingCredentials = async () => {
    if (!userEmail) {
      setCheckingCredentials(false);
      return;
    }

    setCheckingCredentials(true);
    setError(null);
    
    try {
      console.log('=== CHECKING EXISTING CREDENTIALS ===');
      console.log('Email to check:', userEmail);
      
      // First try to get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user:', currentUser?.id, currentUser?.email);
      
      let targetUserId: string | null = null;

      if (currentUser && currentUser.email === userEmail) {
        targetUserId = currentUser.id;
        console.log('Using current user ID:', targetUserId);
      } else {
        // Try profiles table lookup
        console.log('Looking up user in profiles table...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', userEmail)
          .single();

        console.log('Profile lookup result:', { profileData, profileError });

        if (profileError) {
          console.log('Profile lookup failed:', profileError);
          setHasCredentials(false);
          setCheckingCredentials(false);
          return;
        }

        targetUserId = profileData?.id;
      }

      if (targetUserId) {
        console.log('Checking credentials for user:', targetUserId);
        const hasCredentials = await BiometricAuthService.hasBiometricCredentials(targetUserId);
        console.log('Has credentials result:', hasCredentials);
        setHasCredentials(hasCredentials);
      } else {
        console.log('No user ID found');
        setHasCredentials(false);
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
      setHasCredentials(false);
    } finally {
      setCheckingCredentials(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!userEmail) {
      setError('Email is required for biometric authentication');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    console.log('=== STARTING BIOMETRIC LOGIN ===');
    const result = await BiometricAuthService.authenticateWithBiometric(userEmail);
    
    if (result.success && result.userId) {
      setHasCredentials(true);
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

    console.log('=== STARTING BIOMETRIC REGISTRATION ===');
    const result = await BiometricAuthService.registerBiometric(userId, userEmail);
    
    if (result.success) {
      setRegistrationSuccess(true);
      setHasCredentials(true);
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
    return (
      <div className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Biometric authentication appears to be unavailable. This could be because:
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Face ID or Touch ID is not enabled in your device settings</li>
              <li>Your browser doesn't support WebAuthn</li>
              <li>You're using an incompatible device</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={testBiometricSupport}
          disabled={testingSupport}
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testingSupport ? 'Testing Support...' : 'Test Biometric Support'}
        </Button>
      </div>
    );
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
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleBiometricLogin}
            disabled={isLoading || !userEmail || checkingCredentials}
          >
            <Fingerprint className="h-4 w-4 mr-2" />
            {isLoading ? 'Authenticating...' : 
             checkingCredentials ? 'Checking credentials...' : 
             'Sign in with Biometrics'}
          </Button>
          
          {!hasCredentials && !checkingCredentials && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                No biometric credentials found. Please sign in with password first, then enable biometric authentication in Settings.
              </AlertDescription>
            </Alert>
          )}
        </>
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
          ? 'Use your fingerprint, face, or device PIN to sign in securely.'
          : 'Enable biometric authentication for faster and more secure sign-ins'
        }
      </div>
    </div>
  );
};

export default BiometricAuth;
