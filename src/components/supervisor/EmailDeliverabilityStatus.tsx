import React from 'react';
import { useEmailDeliverability } from '@/hooks/useEmailDeliverability';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, AlertTriangle, Eye, MousePointer } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface EmailDeliverabilityStatusProps {
  reportId: string;
  referenceType: 'supervisor_report' | 'patrol_observation' | 'emergency_report';
  compact?: boolean;
}

const EmailDeliverabilityStatus: React.FC<EmailDeliverabilityStatusProps> = ({ 
  reportId, 
  referenceType, 
  compact = false 
}) => {
  const { data, loading, error, stats } = useEmailDeliverability({ reportId, referenceType });

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Φόρτωση κατάστασης email...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-destructive">
        <XCircle className="h-4 w-4" />
        <span className="text-sm">Σφάλμα φόρτωσης</span>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm">Δεν υπάρχουν δεδομένα παράδοσης</span>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'opened':
        return <Eye className="h-3 w-3 text-blue-500" />;
      case 'clicked':
        return <MousePointer className="h-3 w-3 text-purple-500" />;
      case 'bounced':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'complained':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      case 'delivery_delayed':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Παραδόθηκε';
      case 'opened':
        return 'Ανοίχθηκε';
      case 'clicked':
        return 'Κλικ';
      case 'bounced':
        return 'Απορρίφθηκε';
      case 'complained':
        return 'Spam';
      case 'delivery_delayed':
        return 'Καθυστέρηση';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'delivered':
      case 'opened':
      case 'clicked':
        return 'default';
      case 'bounced':
      case 'complained':
        return 'destructive';
      case 'delivery_delayed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {stats.delivered > 0 && (
          <Badge variant="default" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            {stats.delivered}
          </Badge>
        )}
        {stats.opened > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            {stats.opened}
          </Badge>
        )}
        {stats.bounced > 0 && (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            {stats.bounced}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          Κατάσταση Παράδοσης Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{stats.delivered}</div>
            <div className="text-xs text-muted-foreground">Παραδόθηκαν</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{stats.opened}</div>
            <div className="text-xs text-muted-foreground">Ανοίχθηκαν</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{stats.clicked}</div>
            <div className="text-xs text-muted-foreground">Κλικ</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{stats.bounced}</div>
            <div className="text-xs text-muted-foreground">Απορρίφθηκαν</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{stats.complained}</div>
            <div className="text-xs text-muted-foreground">Spam</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{stats.delivery_delayed}</div>
            <div className="text-xs text-muted-foreground">Καθυστέρηση</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Πρόσφατα Γεγονότα</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(event.status)}
                  <span>{getStatusText(event.status)}</span>
                  <span className="text-muted-foreground">
                    {event.recipient_email}
                  </span>
                </div>
                <Badge variant={getStatusVariant(event.status)} className="text-xs">
                  {format(new Date(event.occurred_at), 'dd/MM HH:mm', { locale: el })}
                </Badge>
              </div>
            ))}
          </div>
          {data.length > 5 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              +{data.length - 5} περισσότερα γεγονότα
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailDeliverabilityStatus;