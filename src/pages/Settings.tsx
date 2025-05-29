import { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Fingerprint, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import BiometricAuth from '@/components/BiometricAuth';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [checkingBiometrics, setCheckingBiometrics] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Check if biometrics are already enabled when component mounts
  useEffect(() => {
    const checkBiometricStatus = async () => {
      if (user?.id) {
        try {
          const hasCredentials = await BiometricAuthService.hasBiometricCredentials(user.id);
          setBiometricEnabled(hasCredentials);
        } catch (error) {
          console.error('Error checking biometric status:', error);
        } finally {
          setCheckingBiometrics(false);
        }
      }
    };

    checkBiometricStatus();
  }, [user?.id]);

  const handleBiometricRegister = async () => {
    setBiometricEnabled(true);
    toast({
      title: "Biometric authentication enabled",
      description: "You can now use fingerprint or face recognition to sign in.",
    });
  };

  const handleBiometricDisable = async () => {
    if (!user?.id) return;

    try {
      const result = await BiometricAuthService.removeBiometric(user.id);
      if (result.success) {
        setBiometricEnabled(false);
        toast({
          title: "Biometric authentication disabled",
          description: "You will need to use email and password to sign in.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to disable biometric authentication",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error disabling biometrics:', error);
      toast({
        title: "Error",
        description: "Failed to disable biometric authentication",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    
    try {
      setSigningOut(true);
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSigningOut(false);
    }
  };

  const goBack = () => {
    navigate('/');
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="text-white hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-gray-100">{profile.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <p className="text-gray-900 dark:text-gray-100">
                  {profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <p className="text-gray-900 dark:text-gray-100 capitalize">
                  {profile.Role || 'Guard'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Phone</label>
                <p className="text-gray-900 dark:text-gray-100">
                  {profile.mobile_phone || 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Fingerprint className="h-5 w-5" />
              <span>Security Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkingBiometrics ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Checking biometric status...</p>
              </div>
            ) : biometricEnabled ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                        <Fingerprint className="h-4 w-4" />
                        <span className="font-medium">Biometric Authentication Enabled</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        You can now use biometric authentication to sign in.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBiometricDisable}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Biometric Authentication
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Enable fingerprint or face recognition for faster and more secure sign-ins.
                  </p>
                </div>
                <BiometricAuth
                  userEmail={profile.email}
                  userId={user.id}
                  onRegister={handleBiometricRegister}
                  onSuccess={() => {}}
                  mode="register"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full"
            >
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
