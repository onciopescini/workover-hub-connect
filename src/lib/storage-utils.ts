
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

export const initializeAvatarBucket = async () => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) throw listError;
    
    const avatarBucket = buckets.find(bucket => bucket.id === 'avatars');
    
    if (!avatarBucket) {
      // Create bucket if it doesn't exist (this would need to be done by admin)
      sreLogger.warn('Avatar bucket does not exist');
      return false;
    }
    
    return true;
  } catch (error) {
    sreLogger.error('Error checking avatar bucket', { error });
    return false;
  }
};
