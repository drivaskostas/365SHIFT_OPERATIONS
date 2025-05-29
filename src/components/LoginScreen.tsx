
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ShiftValidationService } from '@/services/ShiftValidationService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shiftWarning, setShiftWarning] = useState<string | null>(null);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setShiftWarning(null);

    try {
      // First, attempt to sign in to get the user
      await signIn(email, password);
      
      // Get the current user to validate their shift access
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Validate shift access
        const shiftValidation = await ShiftValidationService.validateGuardShiftAccess(user.id);
        
        if (!shiftValidation.canLogin) {
          // Sign out the user if they don't have valid shift access
          await supabase.auth.signOut();
          setShiftWarning(shiftValidation.message || 'You are not authorized to login at this time.');
          return;
        }

        // Store shift information in localStorage for patrol creation
        if (shiftValidation.assignedSite && shiftValidation.assignedTeam) {
          localStorage.setItem('guardShiftInfo', JSON.stringify({
            siteId: shiftValidation.assignedSite.id,
            teamId: shiftValidation.assignedTeam.id,
            siteName: shiftValidation.assignedSite.name,
            teamName: shiftValidation.assignedTeam.name,
            shift: shiftValidation.currentShift
          }));
        }

        // Show success message with shift info
        toast({
          title: "Welcome back!",
          description: shiftValidation.message || "Successfully signed in to Sentinel Guard.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <img 
                src="/lovable-uploads/1f595242-f32f-4d2b-95fa-e458a1f0a6df.png" 
                alt="Sentinel Guard Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Sentinel Guard</CardTitle>
            <p className="text-gray-600 mt-2">Security Patrol Management</p>
          </div>
        </CardHeader>
        <CardContent>
          {shiftWarning && (
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {shiftWarning}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="guard@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Shift-Based Access</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              You can only login during your assigned shift times or 30 minutes before your shift starts. Patrols are restricted to your assigned site.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;
