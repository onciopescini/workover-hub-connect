import React from 'react';

// STUBBED FOR STABILITY - DO NOT ENABLE WITHOUT FIXING THE UNDEFINED ERROR
// Previous error: [RealtimeBookingsSync] Realtime connection error Object undefined
export const RealtimeBookingsSync = () => {
  if (import.meta.env.DEV) {
    console.warn('RealtimeBookingsSync disabled for stability');
  }
  return null;
};

export default RealtimeBookingsSync;
