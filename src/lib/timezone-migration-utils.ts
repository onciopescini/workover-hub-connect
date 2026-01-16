import { supabase } from "@/integrations/supabase/client";
import { nowUtc, createUtcIsoString } from "./date-time";

/**
 * Simple timezone-aware utilities for UTC database operations  
 */

/**
 * Gets the current UTC time for database operations
 * @returns Current UTC time as ISO string
 */
export function getCurrentUtcTime(): string {
  return nowUtc();
}