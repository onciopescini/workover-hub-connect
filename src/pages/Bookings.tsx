
import React from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { EnhancedBookingsDashboard } from '@/components/bookings/EnhancedBookingsDashboard';

const Bookings = () => {
  const { authState } = useAuth();
  
  // Usa sempre EnhancedBookingsDashboard per tutti gli utenti
  // La dashboard gestisce internamente le differenze tra host e coworker
  return <EnhancedBookingsDashboard />;
};

export default Bookings;
