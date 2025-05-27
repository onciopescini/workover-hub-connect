
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { StatusConfig, StatusType } from '@/types/common';

export const STATUS_CONFIGS: Record<StatusType, StatusConfig> = {
  pending: {
    label: 'In sospeso',
    variant: 'secondary',
    color: 'text-yellow-600 bg-yellow-50',
    icon: Clock
  },
  confirmed: {
    label: 'Confermato',
    variant: 'default',
    color: 'text-green-600 bg-green-50',
    icon: CheckCircle
  },
  completed: {
    label: 'Completato',
    variant: 'default',
    color: 'text-green-600 bg-green-50',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Annullato',
    variant: 'outline',
    color: 'text-gray-600 bg-gray-50',
    icon: XCircle
  },
  failed: {
    label: 'Fallito',
    variant: 'destructive',
    color: 'text-red-600 bg-red-50',
    icon: XCircle
  },
  active: {
    label: 'Attivo',
    variant: 'default',
    color: 'text-green-600 bg-green-50',
    icon: CheckCircle
  },
  inactive: {
    label: 'Inattivo',
    variant: 'secondary',
    color: 'text-gray-600 bg-gray-50',
    icon: AlertCircle
  }
};

export function getStatusConfig(status: StatusType): StatusConfig {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.pending;
}

export function getStatusLabel(status: StatusType): string {
  return getStatusConfig(status).label;
}

export function getStatusColor(status: StatusType): string {
  return getStatusConfig(status).color;
}
