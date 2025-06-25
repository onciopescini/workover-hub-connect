
import { supabase } from "@/integrations/supabase/client";
import { DAC7Data, Dac7ThresholdResult } from "../types/host-revenue-types";

export const getHostDAC7Data = async (hostId: string, year: number): Promise<DAC7Data> => {
  const { data, error } = await supabase
    .from('dac7_reports')
    .select('*')
    .eq('host_id', hostId)
    .eq('reporting_year', year)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching DAC7 data:', error);
    throw error;
  }

  if (!data) {
    // Calculate DAC7 thresholds if no report exists
    const { data: calculatedData, error: calcError } = await supabase.rpc('calculate_dac7_thresholds', {
      host_id_param: hostId,
      year_param: year
    });

    if (calcError) {
      console.error('Error calculating DAC7 thresholds:', calcError);
      throw calcError;
    }

    const dac7: Dac7ThresholdResult = calculatedData as unknown as Dac7ThresholdResult;

    return {
      totalIncome: dac7?.total_income || 0,
      totalTransactions: dac7?.total_transactions || 0,
      thresholdMet: dac7?.threshold_met || false,
      reportingYear: year
    };
  }

  return {
    totalIncome: data.total_income || 0,
    totalTransactions: data.total_transactions || 0,
    thresholdMet: data.reporting_threshold_met || false,
    reportingYear: data.reporting_year
  };
};
