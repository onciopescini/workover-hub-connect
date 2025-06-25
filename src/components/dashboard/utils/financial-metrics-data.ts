
import { MonthlyData, RevenueByCategory } from '../types/financial-metrics-types';

export const getMonthlyData = (monthlyRevenue: number): MonthlyData[] => [
  { month: 'Gen', revenue: 2400, bookings: 24 },
  { month: 'Feb', revenue: 3200, bookings: 30 },
  { month: 'Mar', revenue: 2800, bookings: 28 },
  { month: 'Apr', revenue: 4500, bookings: 42 },
  { month: 'Mag', revenue: monthlyRevenue, bookings: 38 },
];

export const getRevenueByCategory = (): RevenueByCategory[] => [
  { name: 'Uffici Privati', value: 45, color: '#3B82F6' },
  { name: 'Sale Riunioni', value: 30, color: '#10B981' },
  { name: 'Postazioni Desk', value: 25, color: '#F59E0B' },
];
