
import { useState } from 'react';
import { Shield, Camera, AlertTriangle, MapPin, Clock, User, Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import LoginScreen from '@/components/LoginScreen';
import PatrolDashboard from '@/components/PatrolDashboard';
import QRScanner from '@/components/QRScanner';
import IncidentReport from '@/components/IncidentReport';
import EmergencyReport from '@/components/EmergencyReport';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };

  const renderScreen = () => {
    if (!isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (currentScreen) {
      case 'dashboard':
        return <PatrolDashboard onNavigate={setCurrentScreen} />;
      case 'scanner':
        return <QRScanner onBack={() => setCurrentScreen('dashboard')} />;
      case 'incident':
        return <IncidentReport onBack={() => setCurrentScreen('dashboard')} />;
      case 'emergency':
        return <EmergencyReport onBack={() => setCurrentScreen('dashboard')} />;
      default:
        return <PatrolDashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        {isAuthenticated && (
          <header className="bg-blue-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-lg font-bold">Sentinel Guard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className="text-white hover:bg-blue-800"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <User className="h-6 w-6" />
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className="flex-1">
          {renderScreen()}
        </main>

        {/* Bottom Navigation */}
        {isAuthenticated && currentScreen === 'dashboard' && (
          <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-around">
              <Button
                variant="ghost"
                className="flex flex-col items-center space-y-1"
                onClick={() => setCurrentScreen('dashboard')}
              >
                <Shield className="h-5 w-5" />
                <span className="text-xs">Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                className="flex flex-col items-center space-y-1"
                onClick={() => setCurrentScreen('scanner')}
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">Scan</span>
              </Button>
              <Button
                variant="ghost"
                className="flex flex-col items-center space-y-1"
                onClick={() => setCurrentScreen('incident')}
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Report</span>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

export default Index;
