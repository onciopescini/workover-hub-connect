
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { ReviewStatus } from '@/types/review';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  if (status.canWriteReview) {
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-200">
        <Clock className="w-3 h-3 mr-1" />
        In attesa di recensione
      </Badge>
    );
  }

  if (status.hasWrittenReview && !status.isVisible) {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-200">
        <EyeOff className="w-3 h-3 mr-1" />
        {status.hasReceivedReview 
          ? 'Visibile a breve' 
          : `Visibile tra ${status.daysUntilVisible || 0} giorni`
        }
      </Badge>
    );
  }

  if (status.hasWrittenReview && status.isVisible) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200">
        <Eye className="w-3 h-3 mr-1" />
        Recensione visibile
      </Badge>
    );
  }

  if (status.hasReceivedReview && !status.hasWrittenReview) {
    return (
      <Badge variant="outline" className="text-purple-600 border-purple-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ricevuta - scrivi la tua
      </Badge>
    );
  }

  return null;
}
