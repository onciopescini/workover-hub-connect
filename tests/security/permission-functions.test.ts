import { supabase } from '@/integrations/supabase/client';
import { TEST_USERS } from './helpers/test-users';

describe('Permission Functions Security Tests', () => {
  describe('has_role() function', () => {
    it('should return true for admin with admin role', async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: TEST_USERS.admin.id,
        _role: 'admin',
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for admin with moderator role', async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: TEST_USERS.admin.id,
        _role: 'moderator',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: '00000000-0000-0000-0000-999999999999',
        _role: 'admin',
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should handle null user_id gracefully', async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: null,
        _role: 'admin',
      });

      expect(data).toBe(false);
    });
  });

  describe('is_admin() function', () => {
    it('should return true for admin user', async () => {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: TEST_USERS.admin.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for moderator user', async () => {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: TEST_USERS.moderator.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for coworker user', async () => {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: TEST_USERS.coworker.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for null user_id', async () => {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: null,
      });

      expect(data).toBe(false);
    });
  });

  describe('is_moderator() function', () => {
    it('should return true for moderator user', async () => {
      const { data, error } = await supabase.rpc('is_moderator', {
        user_id: TEST_USERS.moderator.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for admin user', async () => {
      const { data, error } = await supabase.rpc('is_moderator', {
        user_id: TEST_USERS.admin.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for coworker user', async () => {
      const { data, error } = await supabase.rpc('is_moderator', {
        user_id: TEST_USERS.coworker.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('can_moderate_content() function', () => {
    it('should return true for admin user', async () => {
      const { data, error } = await supabase.rpc('can_moderate_content', {
        user_id: TEST_USERS.admin.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return true for moderator user', async () => {
      const { data, error } = await supabase.rpc('can_moderate_content', {
        user_id: TEST_USERS.moderator.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for coworker user', async () => {
      const { data, error } = await supabase.rpc('can_moderate_content', {
        user_id: TEST_USERS.coworker.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for host user', async () => {
      const { data, error } = await supabase.rpc('can_moderate_content', {
        user_id: TEST_USERS.host.id,
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('Security: Function Immutability', () => {
    it('should have immutable search_path for has_role', async () => {
      const { data, error } = await supabase.rpc('sql', {
        query: `
          SELECT proconfig 
          FROM pg_proc 
          WHERE proname = 'has_role' 
          AND pronamespace = 'public'::regnamespace
        `,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data[0].proconfig).toContain('search_path=public');
    });

    it('should be security definer for has_role', async () => {
      const { data, error } = await supabase.rpc('sql', {
        query: `
          SELECT prosecdef 
          FROM pg_proc 
          WHERE proname = 'has_role' 
          AND pronamespace = 'public'::regnamespace
        `,
      });

      expect(error).toBeNull();
      expect(data[0].prosecdef).toBe(true);
    });
  });
});
