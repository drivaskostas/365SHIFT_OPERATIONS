
import { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

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
