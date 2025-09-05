import { useState, useEffect } from 'react';
import { Shield, Camera, AlertTriangle, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import LoginScreen from '@/components/LoginScreen';
import PatrolDashboard from '@/components/PatrolDashboard';
import QRScanner from '@/components/QRScanner';
import PatrolObservation from '@/components/PatrolObservation';
import EnhancedEmergencyReport from '@/components/EnhancedEmergencyReport';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
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
  const navigate = useNavigate();
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
  const handleSettingsClick = () => {
    navigate('/settings');
  };
  const renderScreen = () => {
    if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary mx-auto"></div>
              <Shield className="h-8 w-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Loading Sentinel Patrol</h2>
              <p className="text-sm text-muted-foreground">Initializing security dashboard...</p>
            </div>
          </div>
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
        {user && <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Sentinel</h1>
                
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <Button variant="glass" size="sm" onClick={() => setDarkMode(!darkMode)} className="hover:scale-105">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <LanguageToggle />
              <Button variant="glass" size="sm" onClick={handleSettingsClick} title="Settings" className="hover:scale-105">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </header>}

        {/* Main Content */}
        <main className="flex-1">
          {renderScreen()}
        </main>

        {/* Bottom Navigation */}
        {user && currentScreen === 'dashboard' && <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
            <div className="flex justify-around max-w-md mx-auto">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 transition-all hover:scale-105 hover:bg-primary/10" onClick={() => setCurrentScreen('dashboard')}>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium">{t('nav.dashboard')}</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center space-y-1 transition-all hover:scale-105 hover:bg-primary/10" onClick={() => setCurrentScreen('scanner')}>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium">{t('nav.scan')}</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center space-y-1 transition-all hover:scale-105 hover:bg-primary/10" onClick={() => setCurrentScreen('observation')}>
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium">{t('nav.report')}</span>
              </Button>
            </div>
          </nav>}
      </div>
      <Toaster />
    </div>;
}
const Index = () => {
  return <LanguageProvider>
        <AppContent />
      </LanguageProvider>;
};
export default Index;