
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

interface ProfileRequest {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: 'host' | 'coworker';
  bio?: string;
  linkedin_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      user_id, 
      email, 
      first_name, 
      last_name, 
      role = 'coworker',
      bio,
      linkedin_url 
    }: ProfileRequest = await req.json();

    ErrorHandler.logInfo('Creating profile for user', {
      user_id,
      email,
      role
    });

    // Validate required fields
    if (!user_id || !email || !first_name || !last_name) {
      throw new Error('Missing required fields: user_id, email, first_name, last_name');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (existingProfile) {
      ErrorHandler.logInfo('Profile already exists, updating', {
        user_id
      });
      
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name,
          last_name,
          role,
          bio,
          linkedin_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        profile: updatedProfile,
        action: 'updated'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create new profile
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user_id,
        first_name,
        last_name,
        role,
        bio,
        linkedin_url,
        onboarding_completed: false,
        networking_enabled: true,
        stripe_connected: false
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    ErrorHandler.logSuccess('Profile created successfully', {
      profile_id: newProfile.id,
      role
    });

    // Send welcome email
    try {
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: email,
          data: {
            firstName: first_name,
            dashboardUrl: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://workover.app'}/dashboard`
          }
        }
      });
    } catch (emailError) {
      ErrorHandler.logWarning('Failed to send welcome email', {
        error: emailError,
        user_id,
        email
      });
      // Don't fail the profile creation if email fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      profile: newProfile,
      action: 'created'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error creating/updating profile', error, {
      user_id,
      email
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
