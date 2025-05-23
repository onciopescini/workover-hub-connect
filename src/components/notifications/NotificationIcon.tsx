
import React from "react";
import { Bell, MessageSquare, Calendar, Star, Settings, LifeBuoy } from "lucide-react";
import { UserNotification } from "@/types/notification";

interface NotificationIconProps {
  type: UserNotification['type'];
  className?: string;
}

export function NotificationIcon({ type, className = "w-4 h-4" }: NotificationIconProps) {
  const iconProps = { className };

  switch (type) {
    case 'message':
      return <MessageSquare {...iconProps} className={`${className} text-blue-500`} />;
    case 'booking':
      return <Calendar {...iconProps} className={`${className} text-green-500`} />;
    case 'event':
      return <Calendar {...iconProps} className={`${className} text-purple-500`} />;
    case 'review':
      return <Star {...iconProps} className={`${className} text-yellow-500`} />;
    case 'ticket':
      return <LifeBuoy {...iconProps} className={`${className} text-orange-500`} />;
    case 'system':
    default:
      return <Settings {...iconProps} className={`${className} text-gray-500`} />;
  }
}
