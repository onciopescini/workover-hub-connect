import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Admin Compliance & Security', () => {
  let supabase: SupabaseClient;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Setup test users
    const { data: adminAuth } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'testpassword123'
    });
    adminUser = adminAuth.user;

    const { data: userAuth } = await supabase.auth.signInWithPassword({
      email: 'user@test.com',
      password: 'testpassword123'
    });
    regularUser = userAuth.user;
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  describe('CSV Export Security', () => {
    it('should prevent non-admin CSV export', async () => {
      const { error } = await supabase.rpc('check_rate_limit_advanced', {
        p_identifier: regularUser!.id,
        p_action: 'csv_export',
        p_max_requests: 10,
        p_window_ms: 3600000
      });

      // Regular users should not have access
      expect(error).toBeTruthy();
    });

    it('should enforce rate limiting for CSV exports', async () => {
      // Make 11 export attempts (limit is 10/hour)
      for (let i = 0; i < 11; i++) {
        const { data } = await supabase.rpc('check_rate_limit_advanced', {
          p_identifier: adminUser!.id,
          p_action: 'csv_export',
          p_max_requests: 10,
          p_window_ms: 3600000
        });

        if (i < 10) {
          expect(data.allowed).toBe(true);
        } else {
          expect(data.allowed).toBe(false);
        }
      }
    });

    it('should log CSV export audit', async () => {
      const { data, error } = await supabase
        .from('admin_csv_exports')
        .insert({
          admin_id: adminUser!.id,
          export_type: 'payments',
          filters: { status: 'completed' },
          row_count: 100
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.export_type).toBe('payments');
      expect(data.row_count).toBe(100);
    });
  });

  describe('KYC Document Validation', () => {
    it('should reject invalid MIME types', async () => {
      const { error } = await supabase
        .from('kyc_documents')
        .insert({
          profile_id: regularUser!.id,
          document_type: 'id_card',
          file_url: 'https://example.com/doc.exe',
          mime_type: 'application/x-executable', // Invalid
          file_size_bytes: 50000
        });

      expect(error).toBeTruthy();
      expect(error!.message).toContain('Invalid file type');
    });

    it('should reject files too small', async () => {
      const { error } = await supabase
        .from('kyc_documents')
        .insert({
          profile_id: regularUser!.id,
          document_type: 'id_card',
          file_url: 'https://example.com/doc.pdf',
          mime_type: 'application/pdf',
          file_size_bytes: 5000 // Too small (min 10KB)
        });

      expect(error).toBeTruthy();
      expect(error!.message).toContain('File size must be between 10KB and 10MB');
    });

    it('should reject files too large', async () => {
      const { error } = await supabase
        .from('kyc_documents')
        .insert({
          profile_id: regularUser!.id,
          document_type: 'id_card',
          file_url: 'https://example.com/doc.pdf',
          mime_type: 'application/pdf',
          file_size_bytes: 15000000 // Too large (max 10MB)
        });

      expect(error).toBeTruthy();
      expect(error!.message).toContain('File size must be between 10KB and 10MB');
    });

    it('should prevent duplicate file hash uploads', async () => {
      const fileHash = 'test-hash-' + Date.now();

      // First upload
      const { error: error1 } = await supabase
        .from('kyc_documents')
        .insert({
          profile_id: regularUser!.id,
          document_type: 'id_card',
          file_url: 'https://example.com/doc1.pdf',
          mime_type: 'application/pdf',
          file_size_bytes: 50000,
          file_hash: fileHash
        });

      expect(error1).toBeNull();

      // Duplicate upload (within 24h)
      const { error: error2 } = await supabase
        .from('kyc_documents')
        .insert({
          profile_id: regularUser!.id,
          document_type: 'passport',
          file_url: 'https://example.com/doc2.pdf',
          mime_type: 'application/pdf',
          file_size_bytes: 50000,
          file_hash: fileHash
        });

      expect(error2).toBeTruthy();
      expect(error2!.message).toContain('Duplicate file detected');
    });
  });

  describe('DAC7 Retry Queue', () => {
    it('should create DAC7 queue entry', async () => {
      const { data, error } = await supabase
        .from('dac7_generation_queue')
        .insert({
          reporting_year: 2024,
          status: 'pending',
          next_retry_at: new Date(Date.now() + 3600000).toISOString()
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('pending');
      expect(data.retry_count).toBe(0);
    });

    it('should schedule retry with exponential backoff', async () => {
      const { data: queueEntry } = await supabase
        .from('dac7_generation_queue')
        .insert({
          reporting_year: 2024,
          status: 'failed',
          retry_count: 0
        })
        .select()
        .single();

      await supabase.rpc('schedule_dac7_retry', {
        queue_id_param: queueEntry!.id
      });

      const { data: updated } = await supabase
        .from('dac7_generation_queue')
        .select('*')
        .eq('id', queueEntry!.id)
        .single();

      expect(updated!.retry_count).toBe(1);
      expect(updated!.status).toBe('pending');
      expect(updated!.next_retry_at).toBeTruthy();
    });

    it('should mark as failed after max retries', async () => {
      const { data: queueEntry } = await supabase
        .from('dac7_generation_queue')
        .insert({
          reporting_year: 2024,
          status: 'failed',
          retry_count: 3 // Max retries
        })
        .select()
        .single();

      await supabase.rpc('schedule_dac7_retry', {
        queue_id_param: queueEntry!.id
      });

      const { data: updated } = await supabase
        .from('dac7_generation_queue')
        .select('*')
        .eq('id', queueEntry!.id)
        .single();

      expect(updated!.status).toBe('failed');
      expect(updated!.retry_count).toBe(3);
    });
  });

  describe('Fiscal Stats Optimization', () => {
    it('should fetch optimized fiscal stats', async () => {
      const { data, error } = await supabase.rpc('get_fiscal_stats_optimized', {
        year_param: 2024
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('reporting_year');
      expect(data).toHaveProperty('total_hosts');
      expect(data).toHaveProperty('total_income');
      expect(data).toHaveProperty('total_transactions');
      expect(data.reporting_year).toBe(2024);
    });

    it('should return default year if not specified', async () => {
      const { data } = await supabase.rpc('get_fiscal_stats_optimized');
      const currentYear = new Date().getFullYear();

      expect(data.reporting_year).toBe(currentYear);
    });
  });

  describe('Compliance Monitoring View', () => {
    it('should fetch compliance metrics', async () => {
      const { data, error } = await supabase
        .from('compliance_monitoring_metrics')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('kyc_pending_count');
      expect(data).toHaveProperty('dac7_failed_count');
      expect(data).toHaveProperty('csv_exports_24h');
      expect(data).toHaveProperty('admin_actions_7d');
      expect(data).toHaveProperty('last_refresh');
    });
  });
});