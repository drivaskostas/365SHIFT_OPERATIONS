import { useState, useEffect } from 'react';
import { Shield, Camera, AlertTriangle, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import LoginScreen from '@/components/LoginScreen';
import PatrolDashboard from '@/components/PatrolDashboard';
import QRScanner from '@/components/QRScanner';
import ObligationQRScanner from '@/components/ObligationQRScanner';
import PatrolObservation from '@/components/PatrolObservation';
import EnhancedEmergencyReport from '@/components/EnhancedEmergencyReport';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';
import { Toaster } from '@/components/ui/toaster';
import { usePersistentPatrol } from '@/hooks/usePersistentPatrol';
import { useToast } from '@/hooks/use-toast';
import { TenantFeatureService } from '@/services/TenantFeatureService';
import type { TenantFeatureSettings } from '@/types/database';

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [branding, setBranding] = useState<{
    app_name: string;
    app_subtitle: string;
    logo_url: string;
    primary_color: string;
  }>({ app_name: 'SENTINEL', app_subtitle: 'SECURITY.SYS', logo_url: '', primary_color: '#3B82F6' });
  
  // Add persistent patrol hook at app level for proper patrol lifecycle management
  const { endPersistentPatrol } = usePersistentPatrol(profile?.id);

  // Fetch tenant branding settings
  useEffect(() => {
    const fetchBranding = async () => {
      if (!profile?.id) return;
      try {
        const settings = await TenantFeatureService.getCurrentUserSettings();
        if (settings) {
          setBranding({
            app_name: settings.app_name || 'SENTINEL',
            app_subtitle: settings.app_subtitle || 'SECURITY.SYS',
            logo_url: settings.logo_url || '',
            primary_color: settings.primary_color || '#3B82F6',
          });
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
      }
    };
    fetchBranding();
  }, [profile?.id]);
  
  // Handle patrol completion from QR scanner
  const handlePatrolComplete = async () => {
    try {
      await endPersistentPatrol(false); // false = auto-ended (not user initiated)
      console.log('✅ Patrol auto-ended successfully through persistent patrol system');
    } catch (error) {
      console.error('❌ Error auto-ending patrol:', error);
      throw error; // Re-throw to let QRScanner handle the toast
    }
  };
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
              <h2 className="text-lg font-semibold text-foreground">Loading 365Shift Sidecar</h2>
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
        return <QRScanner 
          onBack={() => setCurrentScreen('dashboard')} 
          onPatrolComplete={handlePatrolComplete}
        />;
      case 'taskScanner':
        return <ObligationQRScanner 
          onBack={() => setCurrentScreen('dashboard')}
          onObligationScanned={(obligation, existingCompletion) => {
            // Navigate to completion page
            navigate(`/complete-obligation/${obligation.id}`);
          }}
        />;
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
        {user && <header className="sticky top-0 z-50 bg-gradient-to-r from-background/95 via-card/90 to-background/95 backdrop-blur-xl border-b border-border/20 text-foreground p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between shadow-card">
            <div className="flex items-center space-x-3 animate-fade-in">
              {branding.logo_url ? (
                <div className="p-1 rounded-xl backdrop-blur-sm border border-primary/20 shadow-glow">
                  <img src={branding.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
                </div>
              ) : (
                <div className="p-2 bg-primary/10 rounded-xl backdrop-blur-sm border border-primary/20 shadow-glow" style={branding.primary_color !== '#3B82F6' ? { backgroundColor: `${branding.primary_color}20` } : undefined}>
                  <Shield className="h-6 w-6" style={branding.primary_color !== '#3B82F6' ? { color: branding.primary_color } : undefined} />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={branding.primary_color !== '#3B82F6' ? { color: branding.primary_color, backgroundImage: 'none' } : undefined}>
                  {branding.app_name}
                </h1>
                <div className="text-xs text-muted-foreground font-mono">{branding.app_subtitle}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <Button variant="glass" size="sm" onClick={() => setDarkMode(!darkMode)} className="hover:scale-110 hover:glow-primary">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <LanguageToggle />
              <Button variant="glass" size="sm" onClick={handleSettingsClick} title="Settings" className="hover:scale-110 hover:glow-primary">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </header>}

        {/* Main Content */}
        <main className="flex-1">
          {renderScreen()}
        </main>
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