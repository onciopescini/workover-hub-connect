import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays } from "date-fns";

interface ReviewVisibilityBadgeProps {
  isVisible: boolean;
  createdAt: string;
  hasReceivedReview: boolean;
}

export const ReviewVisibilityBadge = ({
  isVisible,
  createdAt,
  hasReceivedReview,
}: ReviewVisibilityBadgeProps) => {
  if (isVisible) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span className="text-xs">Visibile</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Entrambe le recensioni sono state inviate</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Calculate days since review was written
  const daysSinceReview = differenceInDays(new Date(), new Date(createdAt));
  const daysUntilVisible = hasReceivedReview ? 0 : Math.max(0, 14 - daysSinceReview);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {hasReceivedReview ? "In attesa" : `${daysUntilVisible}g rimanenti`}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {hasReceivedReview ? (
            <p>In attesa che l'altra parte invii la sua recensione</p>
          ) : (
            <p>
              Recensione nascosta fino a quando l'altra parte non risponde o passano 14
              giorni ({daysUntilVisible} giorni rimanenti)
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
