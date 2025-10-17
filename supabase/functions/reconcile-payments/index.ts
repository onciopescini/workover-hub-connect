import Stripe from 'https://esm.sh/stripe@14.21.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { combineHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: combineHeaders() });
  }

  try {
    // Verify cron/service role request
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: combineHeaders({ 'Content-Type': 'application/json' })
      });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? ''
    );
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16'
    });
    
    console.log('[RECONCILE] Starting payment reconciliation...');
    
    // 1. Detect anomalies
    const { data: anomalies, error: anomaliesError } = await supabase
      .rpc('detect_payment_anomalies');
    
    if (anomaliesError) {
      console.error('[RECONCILE] Failed to detect anomalies:', anomaliesError);
    }
    
    if (anomalies && anomalies.length > 0) {
      const critical = anomalies.filter((a: any) => a.severity === 'critical');
      
      if (critical.length > 0) {
        console.warn(`[RECONCILE] Found ${critical.length} critical anomalies`);
        
        // Create system alarm
        await supabase.from('system_alarms').insert({
          alarm_type: 'payment_reconciliation_failed',
          severity: 'critical',
          title: `Payment Reconciliation: ${critical.length} Critical Issues`,
          message: `Daily reconciliation detected ${critical.length} critical payment anomalies.`,
          metadata: {
            total_anomalies: anomalies.length,
            critical_count: critical.length,
            anomaly_types: [...new Set(critical.map((a: any) => a.anomaly_type))],
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    // 2. Sync Stripe payouts status
    const { data: hosts } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, email')
      .eq('stripe_connected', true)
      .not('stripe_account_id', 'is', null);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const host of hosts || []) {
      try {
        const balance = await stripe.balance.retrieve({
          stripeAccount: host.stripe_account_id
        });
        
        console.log(`[RECONCILE] Synced balance for host ${host.email}: €${balance.available[0]?.amount / 100}`);
        syncedCount++;
      } catch (error: any) {
        console.error(`[RECONCILE] Failed to sync balance for host ${host.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`[RECONCILE] Completed: ${syncedCount} synced, ${errorCount} errors`);
    
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        anomalies_detected: anomalies?.length || 0,
        critical_anomalies: anomalies?.filter((a: any) => a.severity === 'critical').length || 0,
        hosts_synced: syncedCount,
        sync_errors: errorCount
      }),
      { status: 200, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  } catch (error: any) {
    console.error('[RECONCILE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
});
