import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, XCircle, FileText } from 'lucide-react';

interface FiscalStatusBadgeProps {
  type: 'dac7-threshold' | 'report-status' | 'tax-details';
  status: string | boolean;
}

export const FiscalStatusBadge = ({ type, status }: FiscalStatusBadgeProps) => {
  if (type === 'dac7-threshold') {
    const thresholdMet = status as boolean;
    return (
      <Badge 
        variant={thresholdMet ? 'destructive' : 'secondary'}
        className="gap-1"
      >
        {thresholdMet ? (
          <>
            <AlertCircle className="h-3 w-3" />
            Soglia Superata
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3 w-3" />
            Sotto Soglia
          </>
        )}
      </Badge>
    );
  }

  if (type === 'report-status') {
    const reportStatus = status as string;
    
    const variants = {
      draft: { variant: 'outline' as const, icon: FileText, label: 'Bozza' },
      final: { variant: 'secondary' as const, icon: CheckCircle2, label: 'Finale' },
      submitted: { variant: 'default' as const, icon: CheckCircle2, label: 'Inviato' },
      error: { variant: 'destructive' as const, icon: XCircle, label: 'Errore' }
    };

    const config = variants[reportStatus as keyof typeof variants] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  if (type === 'tax-details') {
    const hasDetails = status as boolean;
    return (
      <Badge 
        variant={hasDetails ? 'default' : 'outline'}
        className="gap-1"
      >
        {hasDetails ? (
          <>
            <CheckCircle2 className="h-3 w-3" />
            Completati
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" />
            Mancanti
          </>
        )}
      </Badge>
    );
  }

  return null;
};
