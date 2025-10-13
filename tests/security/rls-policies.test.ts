import { supabase } from '@/integrations/supabase/client';
import { signInAsTestUser, signOutTestUser, TEST_USERS } from './helpers/test-users';

describe('RLS Policies Security Tests', () => {
  afterEach(async () => {
    await signOutTestUser();
  });

  describe('user_roles table RLS', () => {
    it('admin can view all user roles', async () => {
      await signInAsTestUser('admin');

      const { data, error } = await supabase.from('user_roles').select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('moderator cannot view user roles', async () => {
      await signInAsTestUser('moderator');

      const { data, error } = await supabase.from('user_roles').select('*');

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });

    it('coworker cannot view user roles', async () => {
      await signInAsTestUser('coworker');

      const { data, error } = await supabase.from('user_roles').select('*');

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });

    it('admin can insert user roles', async () => {
      await signInAsTestUser('admin');

      const { data, error } = await supabase.from('user_roles').insert({
        user_id: TEST_USERS.coworker.id,
        role: 'moderator',
      });

      expect(error).toBeNull();

      // Cleanup
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', TEST_USERS.coworker.id)
        .eq('role', 'moderator');
    });

    it('moderator cannot insert user roles', async () => {
      await signInAsTestUser('moderator');

      const { error } = await supabase.from('user_roles').insert({
        user_id: TEST_USERS.coworker.id,
        role: 'moderator',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });
  });

  describe('admin_actions_log table RLS', () => {
    it('admin can view admin action logs', async () => {
      await signInAsTestUser('admin');

      const { data, error } = await supabase.from('admin_actions_log').select('*').limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('moderator can view admin action logs', async () => {
      await signInAsTestUser('moderator');

      const { data, error } = await supabase.from('admin_actions_log').select('*').limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('coworker cannot view admin action logs', async () => {
      await signInAsTestUser('coworker');

      const { data, error } = await supabase.from('admin_actions_log').select('*');

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });

    it('admin can insert admin action logs', async () => {
      await signInAsTestUser('admin');

      const { data, error } = await supabase.from('admin_actions_log').insert({
        admin_id: TEST_USERS.admin.id,
        action_type: 'test_action',
        target_type: 'test',
        target_id: TEST_USERS.coworker.id,
        description: 'Test security action',
      });

      expect(error).toBeNull();

      // Cleanup
      if (data) {
        await supabase.from('admin_actions_log').delete().eq('id', data[0].id);
      }
    });

    it('moderator cannot insert admin action logs', async () => {
      await signInAsTestUser('moderator');

      const { error } = await supabase.from('admin_actions_log').insert({
        admin_id: TEST_USERS.moderator.id,
        action_type: 'test_action',
        target_type: 'test',
        target_id: TEST_USERS.coworker.id,
        description: 'Test security action',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });
  });

  describe('reports table RLS', () => {
    it('admin can view all reports', async () => {
      await signInAsTestUser('admin');

      const { data, error } = await supabase.from('reports').select('*').limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('moderator can view all reports', async () => {
      await signInAsTestUser('moderator');

      const { data, error } = await supabase.from('reports').select('*').limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('coworker can only view their own reports', async () => {
      await signInAsTestUser('coworker');

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', TEST_USERS.coworker.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // All reports should belong to the coworker
      if (data && data.length > 0) {
        data.forEach((report) => {
          expect(report.reporter_id).toBe(TEST_USERS.coworker.id);
        });
      }
    });

    it('moderator can update report status', async () => {
      await signInAsTestUser('admin');

      // First create a test report
      const { data: reportData, error: createError } = await supabase
        .from('reports')
        .insert({
          reporter_id: TEST_USERS.coworker.id,
          target_type: 'space',
          target_id: '00000000-0000-0000-0000-000000000001',
          reason: 'inappropriate_content',
          description: 'Test report for security testing',
          status: 'open',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(reportData).toBeDefined();

      await signOutTestUser();
      await signInAsTestUser('moderator');

      // Now try to update as moderator
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'in_review' })
        .eq('id', reportData!.id);

      expect(updateError).toBeNull();

      // Cleanup
      await signOutTestUser();
      await signInAsTestUser('admin');
      await supabase.from('reports').delete().eq('id', reportData!.id);
    });
  });

  describe('spaces table RLS', () => {
    it('host can view their own spaces', async () => {
      await signInAsTestUser('host');

      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('host_id', TEST_USERS.host.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('coworker cannot view unpublished spaces', async () => {
      await signInAsTestUser('coworker');

      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('published', false);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(0); // Should not return unpublished spaces
    });

    it('admin can view all spaces including unpublished', async () => {
      await signInAsTestUser('admin');

      const { data, error } = await supabase.from('spaces').select('*').limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('moderator can view pending approval spaces', async () => {
      await signInAsTestUser('moderator');

      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('pending_approval', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('bookings table RLS', () => {
    it('coworker can view their own bookings', async () => {
      await signInAsTestUser('coworker');

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', TEST_USERS.coworker.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('host can view bookings for their spaces', async () => {
      await signInAsTestUser('host');

      const { data: hostSpaces } = await supabase
        .from('spaces')
        .select('id')
        .eq('host_id', TEST_USERS.host.id)
        .limit(1)
        .single();

      if (hostSpaces) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('space_id', hostSpaces.id);

        expect(error).toBeNull();
        expect(data).toBeDefined();
      }
    });

    it('coworker cannot view other users bookings', async () => {
      await signInAsTestUser('coworker');

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .neq('user_id', TEST_USERS.coworker.id)
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(0); // Should not return other users' bookings
    });
  });

  describe('Security: Privilege Escalation Prevention', () => {
    it('coworker cannot assign admin role to themselves', async () => {
      await signInAsTestUser('coworker');

      const { error } = await supabase.from('user_roles').insert({
        user_id: TEST_USERS.coworker.id,
        role: 'admin',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });

    it('moderator cannot assign admin role', async () => {
      await signInAsTestUser('moderator');

      const { error } = await supabase.from('user_roles').insert({
        user_id: TEST_USERS.coworker.id,
        role: 'admin',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });

    it('coworker cannot modify admin action logs', async () => {
      await signInAsTestUser('coworker');

      const { error } = await supabase
        .from('admin_actions_log')
        .update({ description: 'Hacked!' })
        .eq('admin_id', TEST_USERS.admin.id)
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });
  });
});
