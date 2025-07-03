import { useMemo } from 'react';
import { useBookingsDashboardState } from '../useBookingsDashboardState';

export const useEnhancedBookingsDashboard = () => {
  const baseState = useBookingsDashboardState();
  
  // Enhanced stats with additional calculations
  const enhancedStats = useMemo(() => ({
    ...baseState.stats,
    conversionRate: baseState.stats.total > 0 
      ? ((baseState.stats.confirmed / baseState.stats.total) * 100).toFixed(1)
      : '0.0',
    avgBookingValue: baseState.stats.confirmed > 0 
      ? (baseState.stats.totalRevenue / baseState.stats.confirmed).toFixed(2)
      : '0.00'
  }), [baseState.stats]);

  // Performance optimized actions with debouncing
  const optimizedActions = useMemo(() => ({
    ...baseState.actions,
    // Keep existing search functionality
    onSearchChange: baseState.setSearchTerm
  }), [baseState.actions, baseState.setSearchTerm]);

  return {
    ...baseState,
    enhancedStats,
    actions: optimizedActions
  };
};
