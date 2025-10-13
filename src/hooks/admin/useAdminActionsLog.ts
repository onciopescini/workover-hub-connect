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
  setSearchTerm: (term: string) => void;
  setFilterActionType: (type: string) => void;
  setFilterTargetType: (type: string) => void;
  refreshLogs: () => Promise<void>;
}

export const useAdminActionsLog = (): UseAdminActionsLogReturn => {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AdminActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActionType, setFilterActionType] = useState<string>("all");
  const [filterTargetType, setFilterTargetType] = useState<string>("all");

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

      return matchesSearch && matchesActionType && matchesTargetType;
    });
  }, [logs, searchTerm, filterActionType, filterTargetType]);

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
    setSearchTerm,
    setFilterActionType,
    setFilterTargetType,
    refreshLogs
  };
};