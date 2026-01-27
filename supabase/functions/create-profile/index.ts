import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle CORS preflight before initializing anything
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  // Initialize Supabase admin client after CORS check
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    ErrorHandler.logError('Missing environment variables', new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set'));
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  let user_id, email, first_name, last_name, role, bio, linkedin_url;

  try {
    ({ 
      user_id, 
      email, 
      first_name, 
      last_name, 
      role = 'coworker',
      bio,
      linkedin_url 
    } = await req.json() as ProfileRequest);

    // Validate required fields (only user_id and email are mandatory)
    if (!user_id || !email) {
      throw new Error('Missing required fields: user_id, email');
    }

    // CRITICAL FIX: Verify that the user has a role assigned in user_roles.
    // If user_roles is empty, we must NOT create a profile because it would fail
    // due to database constraints/triggers or create an invalid "limbo" state.
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id);

    if (rolesError) {
      throw rolesError;
    }

    // If no roles found, return 400 Bad Request to stop the process gracefully
    if (!userRoles || userRoles.length === 0) {
      ErrorHandler.logWarning('Attempted to create profile for user without roles', { user_id, email });
      return new Response(
        JSON.stringify({ error: 'Role missing' }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Provide fallbacks for first_name and last_name
    const finalFirstName = first_name || email.split('@')[0];
    const finalLastName = last_name || '';

    ErrorHandler.logInfo('Creating profile for user', {
      user_id,
      email,
      role,
      first_name: finalFirstName,
      last_name: finalLastName
    });

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
          first_name: finalFirstName,
          last_name: finalLastName,
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
        first_name: finalFirstName,
        last_name: finalLastName,
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
            firstName: finalFirstName,
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
    const contextData = {
      user_id: user_id || 'unknown',
      email: email || 'unknown'
    };
    ErrorHandler.logError('Error creating/updating profile', error, contextData);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
