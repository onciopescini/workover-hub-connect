
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

interface AdminActionRequest {
  action: 'suspend_user' | 'reactivate_user' | 'moderate_space' | 'approve_tag';
  target_id: string;
  admin_id: string;
  reason?: string;
  approve?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let action, target_id, admin_id, reason, approve;
  
  try {
    ({ action, target_id, admin_id, reason, approve } = await req.json() as AdminActionRequest);

    ErrorHandler.logInfo('Admin action initiated', {
      action,
      admin_id,
      target_id,
      reason: reason || 'none'
    });

    // Verify admin/moderator permissions
    const moderationActions = ['moderate_space', 'approve_tag'];
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: admin_id });
    
    // For moderation actions, allow moderators too
    if (!isAdmin && moderationActions.includes(action)) {
      const { data: canModerate } = await supabaseAdmin.rpc('can_moderate_content', { _user_id: admin_id });
      
      if (!canModerate) {
        ErrorHandler.logError('Unauthorized admin action attempt', null, {
          attempted_by: admin_id,
          action,
          target_id,
          reason: 'Not admin or moderator'
        });
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Admin or Moderator role required' }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else if (!isAdmin) {
      ErrorHandler.logError('Unauthorized admin action attempt', null, {
        attempted_by: admin_id,
        action,
        target_id,
        reason: 'Not admin'
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin role required' }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let result;

    switch (action) {
      case 'suspend_user':
        if (!reason) {
          throw new Error('Reason is required for user suspension');
        }
        
        const { data: suspendResult, error: suspendError } = await supabaseAdmin
          .rpc('suspend_user', {
            target_user_id: target_id,
            reason,
            suspended_by_admin: admin_id
          });

        if (suspendError) throw suspendError;
        result = suspendResult;
        break;

      case 'reactivate_user':
        const { data: reactivateResult, error: reactivateError } = await supabaseAdmin
          .rpc('reactivate_user', {
            target_user_id: target_id,
            reactivated_by_admin: admin_id
          });

        if (reactivateError) throw reactivateError;
        result = reactivateResult;
        break;

      case 'moderate_space':
        if (approve === undefined) {
          throw new Error('Approve parameter is required for space moderation');
        }

        const { data: moderateResult, error: moderateError } = await supabaseAdmin
          .rpc('moderate_space', {
            space_id: target_id,
            approve,
            moderator_id: admin_id,
            rejection_reason: reason
          });

        if (moderateError) throw moderateError;
        result = moderateResult;

        // Send email notification to host
        if (approve || reason) {
          try {
            const { data: space } = await supabaseAdmin
              .from('spaces')
              .select('title, host_id')
              .eq('id', target_id)
              .single();

            if (space) {
              const { data: hostAuth } = await supabaseAdmin.auth.admin.getUserById(space.host_id);
              
              if (hostAuth?.user?.email) {
                await supabaseAdmin.functions.invoke('send-email', {
                  body: {
                    type: approve ? 'space_approved' : 'space_rejected',
                    to: hostAuth.user.email,
                    data: {
                      spaceTitle: space.title,
                      reason: reason,
                      approved: approve
                    }
                  }
                });
              }
            }
          } catch (emailError) {
            ErrorHandler.logWarning('Failed to send space moderation email', {
              error: emailError,
              space_id: target_id,
              action: approve ? 'approve' : 'reject'
            });
          }
        }
        break;

      case 'approve_tag':
        const { data: tagResult, error: tagError } = await supabaseAdmin
          .rpc('approve_tag', {
            tag_id: target_id,
            approver_id: admin_id
          });

        if (tagError) throw tagError;
        result = tagResult;
        break;

      default:
        throw new Error(`Unknown admin action: ${action}`);
    }

    ErrorHandler.logSuccess('Admin action completed successfully', {
      action,
      target_id,
      admin_id,
      result
    });

    return new Response(JSON.stringify({ 
      success: true,
      result,
      message: `Action ${action} completed successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error executing admin action', error, {
      action: action || 'unknown',
      target_id: target_id || 'unknown',
      admin_id: admin_id || 'unknown'
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
