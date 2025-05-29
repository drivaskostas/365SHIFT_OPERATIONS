import { useState, useEffect } from 'react';
import { Shield, Camera, AlertTriangle, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoginScreen from '@/components/LoginScreen';
import PatrolDashboard from '@/components/PatrolDashboard';
import QRScanner from '@/components/QRScanner';
import PatrolObservation from '@/components/PatrolObservation';
import EnhancedEmergencyReport from '@/components/EnhancedEmergencyReport';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';
import { Toaster } from '@/components/ui/toaster';

// Component to initialize location tracking only when user is authenticated
function LocationTrackingInitializer() {
  const {
    profile,
    loading
  } = useAuth();
  useLocationTracking();

  // Only render after authentication is resolved and user is logged in
  if (loading || !profile) {
    return null;
  }
  return null;
}

function AppContent() {
  const {
    user,
    profile,
    loading,
    signOut
  } = useAuth();
  const {
    t
  } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  const renderScreen = () => {
    if (loading) {
      return <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>;
    }
    if (!user) {
      return <LoginScreen />;
    }
    switch (currentScreen) {
      case 'dashboard':
        return <PatrolDashboard onNavigate={setCurrentScreen} />;
      case 'scanner':
        return <QRScanner onBack={() => setCurrentScreen('dashboard')} />;
      case 'observation':
        return <PatrolObservation onBack={() => setCurrentScreen('dashboard')} />;
      case 'emergency':
        return <EnhancedEmergencyReport onBack={() => setCurrentScreen('dashboard')} />;
      default:
        return <PatrolDashboard onNavigate={setCurrentScreen} />;
    }
  };
  return <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Initialize location tracking only when authenticated */}
      <LocationTrackingInitializer />
      
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        {user && <header className="sticky top-0 z-50 bg-blue-900 text-white p-4 flex items-center justify-between py-[73px]">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-lg font-bold">{t('app.title')}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)} className="text-white hover:bg-blue-800">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <LanguageToggle />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:bg-blue-800" title={t('button.sign_out')}>
                <User className="h-4 w-4" />
              </Button>
            </div>
          </header>}

        {/* Main Content */}
        <main className="flex-1">
          {renderScreen()}
        </main>

        {/* Bottom Navigation */}
        {user && currentScreen === 'dashboard' && <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-around">
              <Button variant="ghost" className="flex flex-col items-center space-y-1" onClick={() => setCurrentScreen('dashboard')}>
                <Shield className="h-5 w-5" />
                <span className="text-xs">{t('nav.dashboard')}</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center space-y-1" onClick={() => setCurrentScreen('scanner')}>
                <Camera className="h-5 w-5" />
                <span className="text-xs">{t('nav.scan')}</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center space-y-1" onClick={() => setCurrentScreen('observation')}>
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">{t('nav.report')}</span>
              </Button>
            </div>
          </nav>}
      </div>
      <Toaster />
    </div>;
}

const Index = () => {
  return <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>;
};
export default Index;
