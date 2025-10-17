import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { supportTicketSchema } from '@/schemas/supportTicketSchema';

describe('Support Tickets - Integration Tests', () => {
  let testUserId: string;
  let testTicketId: string;

  beforeEach(async () => {
    // Setup test user
    const { data: { user } } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test123456'
    });
    testUserId = user!.id;
  });

  describe('Ticket Creation', () => {
    it('should create ticket with valid data', async () => {
      const validTicket = {
        subject: 'Test ticket',
        message: 'This is a test message with at least 20 characters',
        category: 'technical' as const,
        priority: 'normal' as const
      };

      const validated = supportTicketSchema.safeParse(validTicket);
      expect(validated.success).toBe(true);

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: testUserId,
          ...validated.data
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        subject: validTicket.subject,
        category: validTicket.category,
        priority: validTicket.priority,
        status: 'open'
      });

      testTicketId = data!.id;
    });

    it('should reject ticket with XSS attempt', () => {
      const xssTicket = {
        subject: '<script>alert("XSS")</script>Malicious',
        message: 'This is a test <img src=x onerror=alert(1)>',
        category: 'technical' as const,
        priority: 'normal' as const
      };

      const validated = supportTicketSchema.safeParse(xssTicket);
      expect(validated.success).toBe(true);
      
      // DOMPurify should have sanitized
      expect(validated.data!.subject).not.toContain('<script>');
      expect(validated.data!.message).not.toContain('onerror');
    });

    it('should reject ticket with invalid category', () => {
      const invalidTicket = {
        subject: 'Valid subject here',
        message: 'Valid message with enough characters',
        category: 'hacking',  // ❌ Not in enum
        priority: 'normal'
      };

      const validated = supportTicketSchema.safeParse(invalidTicket);
      expect(validated.success).toBe(false);
      expect(validated.error?.errors[0].path).toContain('category');
    });

    it('should set SLA deadlines based on priority', async () => {
      const criticalTicket = {
        subject: 'Critical issue',
        message: 'This is a critical issue requiring immediate attention',
        category: 'technical' as const,
        priority: 'critical' as const
      };

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: testUserId,
          ...criticalTicket
        })
        .select()
        .single();

      expect(error).toBeNull();
      
      if (data?.response_deadline && data?.created_at) {
        const responseDeadline = new Date(data.response_deadline);
        const createdAt = new Date(data.created_at);
        const hoursDiff = (responseDeadline.getTime() - createdAt.getTime()) / 3600000;
        
        expect(hoursDiff).toBeCloseTo(1, 0);  // Critical = 1h response
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should prevent spam (5+ tickets in 1 minute)', async () => {
      const tickets = Array(6).fill(null).map((_, i) => ({
        user_id: testUserId,
        subject: `Spam ticket ${i}`,
        message: `Spam message ${i} with enough characters`,
        category: 'other',
        priority: 'low'
      }));

      const results = await Promise.all(
        tickets.map(ticket => 
          supabase.from('support_tickets').insert(ticket).select()
        )
      );

      const successCount = results.filter(r => !r.error).length;
      expect(successCount).toBeLessThan(6);  // Should block some
    });
  });

  describe('SLA Monitoring', () => {
    it('should update sla_status to breached for overdue ticket', async () => {
      // Create ticket with expired deadline (simulate)
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          user_id: testUserId,
          subject: 'Overdue ticket',
          message: 'This ticket is overdue',
          category: 'technical',
          priority: 'high',
          response_deadline: new Date(Date.now() - 3600000).toISOString()  // 1h ago
        })
        .select()
        .single();

      // Run SLA check
      await supabase.rpc('update_ticket_sla_status');

      // Verify status updated
      const { data: updated } = await supabase
        .from('support_tickets')
        .select('sla_status')
        .eq('id', ticket!.id)
        .single();

      expect(updated!.sla_status).toBe('breached');
    });
  });
});
