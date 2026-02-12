import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: "booking_update" | "payment_action" | "dispute_alert" | "system_alert";
  title: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  email_sent_at: string | null;
  push_sent_at: string | null;
};

type ProfileContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

const ONE_MINUTE_MS = 60 * 1000;
const DEFAULT_BATCH_SIZE = 100;

function getBatchSize(): number {
  const raw = Deno.env.get("NOTIFICATIONS_BATCH_SIZE");
  if (!raw) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(parsed, 1000);
}

async function sendEmail(
  resendApiKey: string | null,
  email: string,
  subject: string,
  message: string,
): Promise<void> {
  if (!resendApiKey) {
    console.log("[PROCESS-NOTIFICATIONS] RESEND_API_KEY missing, email stub used", { email, subject });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WorkOver <noreply@workover.app>",
      to: [email],
      subject,
      html: `<p>${message}</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email dispatch failed: ${response.status} ${body}`);
  }
}

async function sendPush(
  pushApiKey: string | null,
  userId: string,
  title: string,
  message: string,
): Promise<void> {
  if (!pushApiKey) {
    console.log("[PROCESS-NOTIFICATIONS] PUSH_API_KEY missing, push stub used", { userId, title });
    return;
  }

  // Stub endpoint placeholder for OneSignal/Expo integration.
  // Replace with provider-specific API once credentials and player tokens are available.
  const endpoint = Deno.env.get("PUSH_PROVIDER_ENDPOINT") ?? "https://example-push-provider.local/send";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pushApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      title,
      message,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Push dispatch failed: ${response.status} ${body}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? null;
    const pushApiKey = Deno.env.get("PUSH_API_KEY") ?? null;
    const batchSize = getBatchSize();

    const { data: queueData, error: queueError } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, type, title, message, metadata, created_at, email_sent_at, push_sent_at")
      .or("email_sent_at.is.null,push_sent_at.is.null")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (queueError) {
      throw queueError;
    }

    const queue = (queueData ?? []) as NotificationRow[];
    if (queue.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, emailSent: 0, pushSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const userIds = Array.from(new Set(queue.map((notification) => notification.user_id)));

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);

    if (profileError) {
      throw profileError;
    }

    const profileById = new Map<string, ProfileContact>();
    for (const profile of (profileData ?? []) as ProfileContact[]) {
      profileById.set(profile.id, profile);
    }

    const lastEmailByUser = new Map<string, number>();
    let processed = 0;
    let emailSent = 0;
    let pushSent = 0;

    for (const notification of queue) {
      const now = Date.now();
      const updates: { email_sent_at?: string; push_sent_at?: string } = {};
      const title = notification.title ?? "Aggiornamento WorkOver";
      const message = notification.message ?? "Hai una nuova notifica.";

      if (!notification.email_sent_at) {
        const last = lastEmailByUser.get(notification.user_id);
        const withinRateLimit = typeof last === "number" && now - last < ONE_MINUTE_MS;

        if (withinRateLimit) {
          console.log("[PROCESS-NOTIFICATIONS] Email skipped by rate-limit", {
            notificationId: notification.id,
            userId: notification.user_id,
          });
        } else {
          const profile = profileById.get(notification.user_id);
          if (profile?.email) {
            await sendEmail(resendApiKey, profile.email, title, message);
            updates.email_sent_at = new Date(now).toISOString();
            lastEmailByUser.set(notification.user_id, now);
            emailSent++;
          } else {
            updates.email_sent_at = new Date(now).toISOString();
            console.log("[PROCESS-NOTIFICATIONS] Missing profile email, marked as processed", {
              notificationId: notification.id,
              userId: notification.user_id,
            });
          }
        }
      }

      if (!notification.push_sent_at) {
        await sendPush(pushApiKey, notification.user_id, title, message);
        updates.push_sent_at = new Date(now).toISOString();
        pushSent++;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("notifications")
          .update(updates)
          .eq("id", notification.id);

        if (updateError) {
          throw updateError;
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed, emailSent, pushSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PROCESS-NOTIFICATIONS] Error", { message });

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
