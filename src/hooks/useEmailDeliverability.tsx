import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeliverabilityEvent {
  id: string;
  email_id: string;
  recipient_email: string;
  status: string;
  event_type: string;
  event_data: any;
  occurred_at: string;
  created_at: string;
}

interface DeliverabilityStats {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  delivery_delayed: number;
  total: number;
}

interface UseEmailDeliverabilityProps {
  reportId: string;
  referenceType: 'supervisor_report' | 'patrol_observation' | 'emergency_report';
}

export const useEmailDeliverability = ({ reportId, referenceType }: UseEmailDeliverabilityProps) => {
  const [data, setData] = useState<DeliverabilityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DeliverabilityStats>({
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
    delivery_delayed: 0,
    total: 0
  });

  const fetchDeliverabilityData = async () => {
    try {
      setLoading(true);
      
      const { data: deliverabilityData, error: fetchError } = await supabase
        .from('email_deliverability')
        .select('*')
        .eq('reference_type', referenceType)
        .eq('reference_id', reportId)
        .order('occurred_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setData(deliverabilityData || []);

      // Calculate stats
      const statsData = (deliverabilityData || []).reduce((acc, event) => {
        acc.total++;
        switch (event.status) {
          case 'delivered':
            acc.delivered++;
            break;
          case 'opened':
            acc.opened++;
            break;
          case 'clicked':
            acc.clicked++;
            break;
          case 'bounced':
            acc.bounced++;
            break;
          case 'complained':
            acc.complained++;
            break;
          case 'delivery_delayed':
            acc.delivery_delayed++;
            break;
        }
        return acc;
      }, {
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        delivery_delayed: 0,
        total: 0
      });

      setStats(statsData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching deliverability data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId && referenceType) {
      fetchDeliverabilityData();
    }
  }, [reportId, referenceType]);

  // Set up real-time subscription for new deliverability events
  useEffect(() => {
    if (!reportId || !referenceType) return;

    const channel = supabase
      .channel('email-deliverability-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_deliverability',
          filter: `reference_id=eq.${reportId}`
        },
        () => {
          // Refresh data when new deliverability event is received
          fetchDeliverabilityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId, referenceType]);

  return {
    data,
    loading,
    error,
    stats,
    refetch: fetchDeliverabilityData
  };
};