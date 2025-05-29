
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BiometricAuthProps {
  userEmail?: string;
  onSuccess: (userId: string) => void;
  onRegister?: () => void;
  mode: 'login' | 'register';
  userId?: string;
}

const BiometricAuth = ({ userEmail, onSuccess, onRegister, mode, userId }: BiometricAuthProps) => {
  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Biometric authentication is currently unavailable. Please use email and password to sign in.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BiometricAuth;
