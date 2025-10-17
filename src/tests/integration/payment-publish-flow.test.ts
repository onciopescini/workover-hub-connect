import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from '@/integrations/supabase/client';

// Test helper: Create test host
async function createTestHost(overrides: any = {}) {
  const email = `test-host-${Date.now()}@test.com`;
  const { data: authData } = await supabase.auth.signUp({
    email,
    password: 'Test1234!'
  });
  
  if (!authData.user) throw new Error('Failed to create test user');
  
  const stripeAccountId = 'acct_test_' + Date.now();
  
  await supabase.from('profiles').update({
    role: 'host',
    stripe_connected: true,
    stripe_account_id: stripeAccountId,
    kyc_documents_verified: true,
    fiscal_regime: 'forfettario',
    ...overrides
  }).eq('id', authData.user.id);
  
  return { ...authData.user, stripe_account_id: stripeAccountId };
}

// Test helper: Create test space
async function createTestSpace(hostId: string, overrides: any = {}) {
  const { data, error } = await supabase.from('spaces').insert({
    host_id: hostId,
    title: 'Test Space ' + Date.now(),
    description: 'Test description',
    category: 'office',
    work_environment: 'indoor',
    max_capacity: 10,
    price_per_hour: 15,
    price_per_day: 100,
    address: 'Via Test 1, Milano',
    latitude: 45.4642,
    longitude: 9.1900,
    photos: ['https://example.com/photo.jpg'],
    workspace_features: ['wifi'],
    amenities: ['coffee'],
    seating_types: ['desk'],
    published: false,
    ...overrides
  }).select().single();
  
  if (error) throw error;
  return data!;
}

describe('Payment-Publish Integration Tests', () => {
  let testHostId: string;
  
  beforeAll(async () => {
    // Setup test environment
    const { data: { user } } = await supabase.auth.getUser();
    if (user) testHostId = user.id;
  });
  
  afterAll(async () => {
    // Cleanup would go here
  });

  it('should prevent space publish without Stripe connected', async () => {
    const host = await createTestHost({ stripe_connected: false });
    const space = await createTestSpace(host.id);
    
    const { error } = await supabase
      .from('spaces')
      .update({ published: true })
      .eq('id', space.id);
    
    expect(error).toBeDefined();
    expect(error!.message).toContain('Stripe account not connected');
  });
  
  it('should block booking creation if host revokes Stripe', async () => {
    const host = await createTestHost({ stripe_connected: true });
    const space = await createTestSpace(host.id, { published: true });
    
    // Revoke Stripe
    await supabase
      .from('profiles')
      .update({ stripe_connected: false })
      .eq('id', host.id);
    
    // Attempt to create booking
    const { error } = await supabase
      .from('bookings')
      .insert({
        space_id: space.id,
        user_id: testHostId,
        booking_date: '2025-10-25',
        start_time: '09:00',
        end_time: '17:00',
        guests_count: 2,
        status: 'pending'
      });
    
    expect(error).toBeDefined();
    expect(error!.message).toContain('Stripe account not connected');
  });
  
  it('should prevent payment for booking with incomplete fiscal_regime', async () => {
    const host = await createTestHost({ 
      stripe_connected: true,
      fiscal_regime: null
    });
    const space = await createTestSpace(host.id, { published: true });
    
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        space_id: space.id,
        user_id: testHostId,
        booking_date: '2025-10-25',
        start_time: '09:00',
        end_time: '17:00',
        guests_count: 2,
        status: 'pending_payment'
      })
      .select()
      .single();
    
    // Attempt payment session with invoice request
    const { error } = await supabase.functions.invoke('create-payment-session', {
      body: {
        booking_id: booking!.id,
        space_id: space.id,
        durationHours: 8,
        pricePerHour: 15,
        pricePerDay: 100,
        host_stripe_account_id: host.stripe_account_id,
        fiscal_data: { 
          request_invoice: true, 
          tax_id: 'RSSMRA80A01H501U',
          billing_address: 'Via Test 1',
          billing_city: 'Milano',
          billing_postal_code: '20100'
        }
      }
    });
    
    expect(error).toBeDefined();
    expect(error.message).toContain('fiscal_regime');
  });
  
  it('should create system alarm when Stripe revoked with active bookings', async () => {
    const host = await createTestHost({ stripe_connected: true });
    const space = await createTestSpace(host.id, { published: true });
    
    // Create confirmed booking
    await supabase.from('bookings').insert({
      space_id: space.id,
      user_id: testHostId,
      booking_date: '2025-10-25',
      start_time: '09:00',
      end_time: '17:00',
      guests_count: 2,
      status: 'confirmed'
    });
    
    // Revoke Stripe
    await supabase
      .from('profiles')
      .update({ stripe_connected: false })
      .eq('id', host.id);
    
    // Check system alarm created
    const { data: alarms } = await supabase
      .from('system_alarms')
      .select('*')
      .eq('alarm_type', 'stripe_revoked_with_active_bookings')
      .eq('metadata->>host_id', host.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    expect(alarms).toBeDefined();
    expect(alarms?.length).toBeGreaterThan(0);
    expect(alarms?.[0]?.severity).toBe('critical');
  });
});

export const runPaymentPublishFlowTests = async () => {
  const results = await Promise.all([
    // Test implementations would go here
  ]);
  
  return {
    total: results.length,
    passed: results.filter(r => r).length,
    failed: results.filter(r => !r).length,
    results
  };
};
