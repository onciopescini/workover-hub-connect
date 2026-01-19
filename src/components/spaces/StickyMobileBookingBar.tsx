import React from 'react';
import { Button } from "@/components/ui/button";

interface StickyMobileBookingBarProps {
  pricePerDay: number | null;
  pricePerHour: number | null;
  onBookClick: () => void;
  isVisible: boolean;
}

export const StickyMobileBookingBar: React.FC<StickyMobileBookingBarProps> = ({
  pricePerDay,
  pricePerHour,
  onBookClick,
  isVisible
}) => {
  if (!isVisible) return null;

  const displayPrice = pricePerHour
    ? { amount: pricePerHour, unit: '/h' }
    : { amount: pricePerDay || 0, unit: '/giorno' };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gray-900">
            €{displayPrice.amount}
            <span className="text-sm font-normal text-gray-500">{displayPrice.unit}</span>
          </span>
        </div>
        <Button onClick={onBookClick} className="px-8 font-semibold">
          Prenota
        </Button>
      </div>
    </div>
  );
};
