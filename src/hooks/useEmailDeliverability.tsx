import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Use untyped client until schema is updated
const supabaseUrl = 'https://igcqqrcdtqpecopvuuva.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnY3FxcmNkdHFwZWNvcHZ1dXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0OTI5MzAsImV4cCI6MjA1NjA2ODkzMH0.w5Ac9bpsfXpkAa4FJi2pDlMzpM6j1pEe3bL36fpzuQE';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
      
      const { data: deliverabilityData, error: fetchError } = await supabaseClient
        .from('email_deliverability')
        .select('*')
        .eq('reference_type', referenceType)
        .eq('reference_id', reportId)
        .order('occurred_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const typedData = (deliverabilityData || []) as DeliverabilityEvent[];
      setData(typedData);

      // Calculate stats
      const statsData = typedData.reduce((acc, event) => {
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

    const channel = supabaseClient
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
      supabaseClient.removeChannel(channel);
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