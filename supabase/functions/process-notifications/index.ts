import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH_SIZE = 50;
const DEFAULT_SUBJECT = "Aggiornamento WorkOver";
const DEFAULT_MESSAGE = "Hai una nuova notifica.";

type NotificationType = "booking_update" | "payment_action" | "dispute_alert" | "system_alert";

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string | null;
  message: string | null;
  created_at: string;
  email_sent_at: string | null;
};

type ProfileEmailRow = {
  id: string;
  email: string | null;
};

type AuthUserEmailRow = {
  id: string;
  email: string | null;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function templateIntroByType(type: NotificationType): string {
  switch (type) {
    case "booking_update":
      return "Aggiornamento sulla tua prenotazione.";
    case "payment_action":
      return "Azione richiesta sul pagamento.";
    case "dispute_alert":
      return "Attenzione: Nuova contestazione.";
    default:
      return "Hai ricevuto una nuova notifica da WorkOver.";
  }
}

function buildNotificationHtml(notification: NotificationRow): string {
  const intro = templateIntroByType(notification.type);
  const title = escapeHtml(notification.title ?? DEFAULT_SUBJECT);
  const message = escapeHtml(notification.message ?? DEFAULT_MESSAGE);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>${escapeHtml(intro)}</p>
      <h2 style="margin: 16px 0 8px;">${title}</h2>
      <p style="margin: 0 0 16px;">${message}</p>
      <p style="font-size: 12px; color: #6b7280;">Messaggio automatico di WorkOver.</p>
    </div>
  `;
}

async function sendEmailWithResend(params: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WorkOver <noreply@workover.app>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Resend error (${response.status}): ${responseBody}`);
  }
}

serve(async (req) => {
  console.log("[Process Notifications] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const isDevelopment = Deno.env.get("DENO_ENV") === "development";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!resendApiKey) {
      const message = "Missing RESEND_API_KEY: email worker cannot send notifications";
      if (isDevelopment) {
        console.warn(`[PROCESS-NOTIFICATIONS] ${message}`);
        return new Response(
          JSON.stringify({ processed: 0, sent: 0, errors: 0, warning: message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }
      throw new Error(message);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });

    const { data: notificationData, error: notificationError } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, type, title, message, created_at, email_sent_at")
      .is("email_sent_at", null)
      .order("created_at", { ascending: true })
      .limit(MAX_BATCH_SIZE);

    if (notificationError) {
      throw notificationError;
    }

    const notifications = (notificationData ?? []) as NotificationRow[];

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, errors: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const userIds = [...new Set(notifications.map((notification) => notification.user_id))];

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profileError) {
      throw profileError;
    }

    const emailByUserId = new Map<string, string>();

    for (const profile of (profileData ?? []) as ProfileEmailRow[]) {
      if (profile.email) {
        emailByUserId.set(profile.id, profile.email);
      }
    }

    const missingEmailUserIds = userIds.filter((userId) => !emailByUserId.has(userId));

    if (missingEmailUserIds.length > 0) {
      const { data: authUsersData, error: authUsersError } = await supabaseAdmin
        .schema("auth")
        .from("users")
        .select("id, email")
        .in("id", missingEmailUserIds);

      if (authUsersError) {
        console.error("[PROCESS-NOTIFICATIONS] Unable to fetch auth.users emails", {
          message: authUsersError.message,
        });
      } else {
        for (const authUser of (authUsersData ?? []) as AuthUserEmailRow[]) {
          if (authUser.email) {
            emailByUserId.set(authUser.id, authUser.email);
          }
        }
      }
    }

    let sent = 0;
    let errors = 0;

    for (const notification of notifications) {
      try {
        const recipientEmail = emailByUserId.get(notification.user_id);

        if (!recipientEmail) {
          errors += 1;
          console.error("[PROCESS-NOTIFICATIONS] Recipient email not found", {
            notificationId: notification.id,
            userId: notification.user_id,
          });
          continue;
        }

        const subject = notification.title ?? DEFAULT_SUBJECT;
        const html = buildNotificationHtml(notification);

        await sendEmailWithResend({
          apiKey: resendApiKey,
          to: recipientEmail,
          subject,
          html,
        });

        const { error: updateError } = await supabaseAdmin
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        if (updateError) {
          errors += 1;
          console.error("[PROCESS-NOTIFICATIONS] Failed to update email_sent_at", {
            notificationId: notification.id,
            message: updateError.message,
          });
          continue;
        }

        sent += 1;
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[PROCESS-NOTIFICATIONS] Failed to process notification", {
          notificationId: notification.id,
          message,
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: notifications.length, sent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PROCESS-NOTIFICATIONS] Fatal error", { message });

    return new Response(
      JSON.stringify({ processed: 0, sent: 0, errors: 1, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
