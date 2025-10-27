/**
 * Admin Actions Log Business Logic Hook
 * 
 * Extracted from AdminActionsLog.tsx to separate concerns and improve maintainability
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminActionLog } from '@/types/admin';
import { getAdminActionsLog } from '@/lib/admin-utils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useLogger } from '@/hooks/useLogger';

interface UseAdminActionsLogReturn {
  logs: AdminActionLog[];
  filteredLogs: AdminActionLog[];
  isLoading: boolean;
  searchTerm: string;
  filterActionType: string;
  filterTargetType: string;
  dateRange: '7d' | '30d' | 'all';
  filterAdminId: string;
  filterIpAddress: string;
  setSearchTerm: (term: string) => void;
  setFilterActionType: (type: string) => void;
  setFilterTargetType: (type: string) => void;
  setDateRange: (range: '7d' | '30d' | 'all') => void;
  setFilterAdminId: (id: string) => void;
  setFilterIpAddress: (ip: string) => void;
  refreshLogs: () => Promise<void>;
}

export const useAdminActionsLog = (): UseAdminActionsLogReturn => {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AdminActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActionType, setFilterActionType] = useState<string>("all");
  const [filterTargetType, setFilterTargetType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('all');
  const [filterAdminId, setFilterAdminId] = useState<string>("all");
  const [filterIpAddress, setFilterIpAddress] = useState<string>("");

  const { handleAsyncError } = useErrorHandler('AdminActionsLog');
  const { info } = useLogger({ context: 'useAdminActionsLog' });

  /**
   * Fetch admin actions logs from the API
   */
  const fetchLogs = async () => {
    setIsLoading(true);
    
    const logsData = await handleAsyncError(async () => {
      info("Starting to fetch admin actions logs");
      const data = await getAdminActionsLog();
      info(`Successfully fetched ${data.length} log entries`);
      return data;
    }, { 
      context: 'fetch_logs',
      toastMessage: "Errore nel caricamento dei log"
    });

    if (logsData) {
      setLogs(logsData);
    }
    
    setIsLoading(false);
  };

  /**
   * Public refresh function
   */
  const refreshLogs = useCallback(async () => {
    await fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate filtered logs using useMemo instead of useEffect
  const computedFilteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActionType = filterActionType === "all" || log.action_type === filterActionType;
      const matchesTargetType = filterTargetType === "all" || log.target_type === filterTargetType;

      // Date range filter
      let matchesDate = true;
      if (dateRange === '7d' && log.created_at) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(log.created_at) >= weekAgo;
      } else if (dateRange === '30d' && log.created_at) {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        matchesDate = new Date(log.created_at) >= monthAgo;
      }

      // Admin ID filter
      const matchesAdmin = filterAdminId === "all" || log.admin_id === filterAdminId;

      // IP Address filter
      const matchesIp = !filterIpAddress || 
        (log.ip_address && String(log.ip_address).includes(filterIpAddress));

      return matchesSearch && matchesActionType && matchesTargetType && matchesDate && matchesAdmin && matchesIp;
    });
  }, [logs, searchTerm, filterActionType, filterTargetType, dateRange, filterAdminId, filterIpAddress]);

  // Update filteredLogs when computed value changes
  useEffect(() => {
    setFilteredLogs(computedFilteredLogs);
  }, [computedFilteredLogs]);

  return {
    logs,
    filteredLogs,
    isLoading,
    searchTerm,
    filterActionType,
    filterTargetType,
    dateRange,
    filterAdminId,
    filterIpAddress,
    setSearchTerm,
    setFilterActionType,
    setFilterTargetType,
    setDateRange,
    setFilterAdminId,
    setFilterIpAddress,
    refreshLogs
  };
};