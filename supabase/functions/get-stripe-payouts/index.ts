import Stripe from 'https://esm.sh/stripe@14.21.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { combineHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: combineHeaders() });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');
    
    const { host_id } = await req.json();
    
    // Verify user is the host or admin
    if (user.id !== host_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }
    }
    
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_connected')
      .eq('id', host_id)
      .single();
    
    if (!hostProfile?.stripe_connected || !hostProfile.stripe_account_id) {
      return new Response(
        JSON.stringify({ 
          available_balance: 0,
          pending_balance: 0,
          currency: 'EUR',
          last_payout: null
        }),
        { status: 200, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16'
    });
    
    const balance = await stripe.balance.retrieve({
      stripeAccount: hostProfile.stripe_account_id
    });
    
    const payouts = await stripe.payouts.list({
      limit: 1,
      stripeAccount: hostProfile.stripe_account_id
    });
    
    const lastPayout = payouts.data[0];
    
    return new Response(
      JSON.stringify({
        available_balance: (balance.available[0]?.amount || 0) / 100,
        pending_balance: (balance.pending[0]?.amount || 0) / 100,
        currency: balance.available[0]?.currency?.toUpperCase() || 'EUR',
        last_payout: lastPayout ? {
          amount: lastPayout.amount / 100,
          arrival_date: new Date(lastPayout.arrival_date * 1000).toISOString(),
          status: lastPayout.status
        } : null
      }),
      { status: 200, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  } catch (error: any) {
    console.error('Error fetching Stripe payouts:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
});
