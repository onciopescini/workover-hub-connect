import { supabase } from "@/integrations/supabase/client";

export async function fetchOptimizedSpaceAvailability(spaceId: string, dateFrom: string, dateTo: string) {
  const { data, error } = await supabase.rpc("get_space_availability_optimized", {
    space_id_param: spaceId,
    start_date_param: dateFrom,
    end_date_param: dateTo,
  });
  
  if (error) throw error;
  
  // Data attesa: [{ start_time: 'HH:MM', end_time: 'HH:MM', ... }]
  return data ?? [];
}