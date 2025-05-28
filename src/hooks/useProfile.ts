
import { useOptimizedProfile } from './useOptimizedProfile';

// Re-export dell'hook ottimizzato per mantenere compatibilità
export const useProfile = () => {
  return useOptimizedProfile();
};
