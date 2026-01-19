import { useState, useEffect } from 'react';
import type { CoworkerFiscalData } from '@/types/booking';

const STORAGE_KEY = 'pending_fiscal_data_save';

interface PendingFiscalData {
  data: CoworkerFiscalData;
  timestamp: number;
  shown: boolean;
}

/**
 * Hook to manage prompting users to save fiscal data to their profile
 * after providing it during checkout
 */
export function useFiscalDataPersistence() {
  const [pendingData, setPendingData] = useState<PendingFiscalData | null>(null);

  // Load pending data on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PendingFiscalData;
        // Only show if less than 24 hours old and not already shown
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && !parsed.shown) {
          setPendingData(parsed);
        } else {
          // Clean up old data
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error loading pending fiscal data:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  /**
   * Save fiscal data to show save prompt later
   */
  const savePendingData = (data: CoworkerFiscalData) => {
    // Only save if user provided meaningful data
    if (!data.tax_id || !data.billing_address) {
      return;
    }

    const pending: PendingFiscalData = {
      data,
      timestamp: Date.now(),
      shown: false
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    setPendingData(pending);
  };

  /**
   * Mark prompt as shown
   */
  const markPromptShown = () => {
    if (pendingData) {
      const updated = { ...pendingData, shown: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setPendingData(updated);
    }
  };

  /**
   * Clear pending data
   */
  const clearPendingData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPendingData(null);
  };

  return {
    hasPendingData: !!pendingData && !pendingData.shown,
    pendingData: pendingData?.data,
    savePendingData,
    markPromptShown,
    clearPendingData
  };
}
