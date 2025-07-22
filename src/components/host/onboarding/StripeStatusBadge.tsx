import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Ban } from "lucide-react";

interface StripeStatusBadgeProps {
  status: 'none' | 'pending' | 'completed' | 'restricted';
}

export const StripeStatusBadge = ({ status }: StripeStatusBadgeProps) => {
  let label: string;
  let icon: React.ReactNode;
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  
  switch (status) {
    case 'none':
      label = "Non configurato";
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
      badgeVariant = "outline";
      break;
    case 'pending':
      label = "In verifica";
      icon = <Clock className="w-3 h-3 mr-1" />;
      badgeVariant = "secondary";
      break;
    case 'completed':
      label = "Verificato";
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
      badgeVariant = "default";
      break;
    case 'restricted':
      label = "Limitato";
      icon = <Ban className="w-3 h-3 mr-1" />;
      badgeVariant = "destructive";
      break;
  }
  
  return (
    <Badge variant={badgeVariant} className="text-xs flex items-center">
      {icon}
      {label}
    </Badge>
  );
};