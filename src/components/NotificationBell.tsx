import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  team_id?: string;
}

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', profile?.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast({
        title: "Επιτυχία",
        description: "Όλες οι ειδοποιήσεις σημειώθηκαν ως αναγνωσμένες",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης ειδοποιήσεων",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format notification time
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: el 
      });
    } catch {
      return 'πριν από λίγο';
    }
  };

  // Get notification icon color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return 'text-red-600';
      case 'SYSTEM': return 'text-blue-600';
      case 'WARNING': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast({
            title: "Νέα Ειδοποίηση",
            description: (payload.new as Notification).title,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!profile) return null;

  return (
    <div className="relative">
      <Button
        variant="glass"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:scale-105"
        title="Ειδοποιήσεις"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notifications Panel */}
          <Card className="absolute right-0 top-full mt-2 w-80 sm:w-80 w-[95vw] sm:w-[400px] max-w-[400px] max-h-[80vh] z-50 shadow-lg border">
            <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm sm:text-base">Ειδοποιήσεις</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs hidden sm:flex"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Όλα ως αναγνωσμένα
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs sm:hidden p-1"
                      title="Όλα ως αναγνωσμένα"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Δεν υπάρχουν ειδοποιήσεις</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs px-2 py-1 ${getNotificationColor(notification.type)}`}
                              >
                                {notification.type}
                              </Badge>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words">
                              {notification.body}
                            </p>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}