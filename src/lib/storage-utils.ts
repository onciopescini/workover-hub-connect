
import { supabase } from '@/integrations/supabase/client';

export const initializeAvatarBucket = async () => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) throw listError;
    
    const avatarBucket = buckets.find(bucket => bucket.id === 'avatars');
    
    if (!avatarBucket) {
      // Create bucket if it doesn't exist (this would need to be done by admin)
      console.log('Avatar bucket does not exist');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking avatar bucket:', error);
    return false;
  }
};
