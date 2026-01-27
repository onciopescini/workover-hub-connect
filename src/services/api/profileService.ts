/**
 * Profile Service Layer
 * 
 * Handles all profile-related operations with proper error handling
 * and type safety. Follows the Result Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface ProfileData {
  first_name?: string;
  last_name?: string;
  profession?: string;
  bio?: string;
  phone?: string;
  linkedin_url?: string;
  profile_photo_url?: string;
  role?: string;
  is_verified?: boolean;
  onboarding_completed?: boolean;
  city?: string;
  country?: string;
}

export interface UpdateProfileParams {
  userId: string;
  data: Partial<ProfileData>;
}

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export interface GetProfileResult {
  success: boolean;
  data?: ProfileData & { id: string; email?: string };
  error?: string;
}

export interface CompleteOnboardingParams {
  userId: string;
  data: ProfileData;
}

// ============= METHODS =============

/**
 * Get user profile by ID.
 */
export async function getProfile(userId: string): Promise<GetProfileResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching profile', { component: 'profileService', userId });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      sreLogger.error('Error fetching profile', { component: 'profileService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ProfileData & { id: string } };
  } catch (err) {
    sreLogger.error('Exception fetching profile', { component: 'profileService' }, err as Error);
    return { success: false, error: 'Failed to fetch profile' };
  }
}

/**
 * Update user profile.
 */
export async function updateProfile(params: UpdateProfileParams): Promise<UpdateProfileResult> {
  const { userId, data } = params;

  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Updating profile', { component: 'profileService', userId });

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      sreLogger.error('Profile update failed', { component: 'profileService' }, error);
      return { success: false, error: error.message };
    }

    sreLogger.info('Profile updated successfully', { component: 'profileService', userId });
    return { success: true };
  } catch (err) {
    sreLogger.error('Exception updating profile', { component: 'profileService' }, err as Error);
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Complete onboarding process for a user.
 */
export async function completeOnboarding(params: CompleteOnboardingParams): Promise<UpdateProfileResult> {
  const { userId, data } = params;

  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Completing onboarding', { component: 'profileService', userId });

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      sreLogger.error('Onboarding completion failed', { component: 'profileService' }, error);
      return { success: false, error: error.message };
    }

    sreLogger.info('Onboarding completed successfully', { component: 'profileService', userId });
    return { success: true };
  } catch (err) {
    sreLogger.error('Exception completing onboarding', { component: 'profileService' }, err as Error);
    return { success: false, error: 'Failed to complete onboarding' };
  }
}

/**
 * Check if user profile is suspended.
 */
export async function checkSuspensionStatus(userId: string): Promise<{ 
  success: boolean; 
  isSuspended?: boolean; 
  error?: string; 
}> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', userId)
      .single();

    if (error) {
      sreLogger.error('Error checking suspension status', { component: 'profileService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, isSuspended: data?.is_suspended ?? false };
  } catch (err) {
    sreLogger.error('Exception checking suspension', { component: 'profileService' }, err as Error);
    return { success: false, error: 'Failed to check suspension status' };
  }
}

/**
 * Update profile role.
 */
export async function updateRole(
  userId: string, 
  role: 'coworker' | 'host'
): Promise<UpdateProfileResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      sreLogger.error('Failed to update role', { component: 'profileService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    sreLogger.error('Exception updating role', { component: 'profileService' }, err as Error);
    return { success: false, error: 'Failed to update role' };
  }
}
