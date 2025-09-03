import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TestEmailButtonProps {
  userRoles: string[];
}

export const TestEmailButton: React.FC<TestEmailButtonProps> = ({ userRoles }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  // Only show to admin users
  if (!userRoles.includes('admin')) {
    return null;
  }

  const handleTestEmail = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { 
          recipientEmail: user.email,
          recipientName: user.user_metadata?.full_name || 'Admin User'
        }
      });

      if (error) {
        console.error('Test email error:', error);
        toast.error(`Failed to send test email: ${error.message}`);
      } else {
        console.log('Test email success:', data);
        toast.success("Test email sent successfully!");
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error("Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Admin Test Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleTestEmail} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Sending..." : "Send Test Email"}
        </Button>
      </CardContent>
    </Card>
  );
};