import * as fiscalService from "@/services/api/fiscalService";
import { DAC7Data, Dac7ThresholdResult } from "../types/host-revenue-types";

export const getHostDAC7Data = async (hostId: string, year: number): Promise<DAC7Data> => {
  // First try to get existing report
  try {
    const reports = await fiscalService.getDAC7Reports({ hostId, year });
    
    if (reports.length > 0) {
      const data = reports[0];
      return {
        totalIncome: data?.total_income || 0,
        totalTransactions: data?.total_transactions || 0,
        thresholdMet: data?.reporting_threshold_met || false,
        reportingYear: data?.reporting_year || year
      };
    }
  } catch {
    // If no report exists, calculate thresholds
  }

  // Calculate DAC7 thresholds if no report exists
  try {
    const dac7 = await fiscalService.calculateDAC7Thresholds(hostId, year);

    return {
      totalIncome: dac7?.total_income || 0,
      totalTransactions: dac7?.total_transactions || 0,
      thresholdMet: dac7?.threshold_met || false,
      reportingYear: year
    };
  } catch {
    // Return default values on error
    return {
      totalIncome: 0,
      totalTransactions: 0,
      thresholdMet: false,
      reportingYear: year
    };
  }
};
