import React from 'react';
import { EnhancedBookingsDashboard } from '@/components/bookings/EnhancedBookingsDashboard';
import { usePaymentLink } from '@/hooks/usePaymentLink';

const Bookings = () => {
  usePaymentLink();
  return <EnhancedBookingsDashboard />;
};

export default Bookings;
