import { supabase } from '@/integrations/supabase/client';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'moderator' | 'coworker' | 'host';
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: 'b3da9e60-db1e-47bb-ab95-70d74fd1d4c9', // Existing admin from user_roles
    email: 'admin@test.com',
    password: 'TestAdmin123!',
    role: 'admin',
  },
  moderator: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'moderator@test.com',
    password: 'TestModerator123!',
    role: 'moderator',
  },
  coworker: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'coworker@test.com',
    password: 'TestCoworker123!',
    role: 'coworker',
  },
  host: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'host@test.com',
    password: 'TestHost123!',
    role: 'host',
  },
};

/**
 * Create test users in Supabase (to be run in setup)
 * Note: This requires admin privileges
 */
export async function createTestUsers() {
  const results: Array<{ user: TestUser; success: boolean; error?: string }> = [];

  for (const [key, user] of Object.entries(TEST_USERS)) {
    try {
      // Skip admin - already exists
      if (key === 'admin') {
        results.push({ user, success: true });
        continue;
      }

      // Create auth user via Supabase Admin API
      // Note: This requires SUPABASE_SERVICE_ROLE_KEY
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role,
        },
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: user.email,
        role: user.role,
        first_name: `Test ${user.role}`,
        last_name: 'User',
      });

      if (profileError) throw profileError;

      // Assign role if admin or moderator
      if (user.role === 'admin' || user.role === 'moderator') {
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: user.role,
        });

        if (roleError) throw roleError;
      }

      results.push({ user, success: true });
    } catch (error) {
      results.push({
        user,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Clean up test users (to be run in teardown)
 */
export async function cleanupTestUsers() {
  const results: Array<{ user: TestUser; success: boolean; error?: string }> = [];

  for (const [key, user] of Object.entries(TEST_USERS)) {
    try {
      // Skip admin - don't delete
      if (key === 'admin') {
        results.push({ user, success: true });
        continue;
      }

      // Delete user via Supabase Admin API
      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) throw error;

      results.push({ user, success: true });
    } catch (error) {
      results.push({
        user,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Sign in as a test user
 */
export async function signInAsTestUser(userKey: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userKey];
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) throw error;

  return data;
}

/**
 * Sign out current user
 */
export async function signOutTestUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
