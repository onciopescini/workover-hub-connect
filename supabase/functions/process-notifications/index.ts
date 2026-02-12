import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.1";

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

function requireEnv(name: "SUPABASE_SERVICE_ROLE_KEY" | "RESEND_API_KEY" | "RESEND_FROM_EMAIL"): string {
  const value = Deno.env.get(name);

  if (!value) {
    console.error(`Missing var: ${name}`);
    throw new Error(`Required environment variable is missing: ${name}`);
  }

  return value;
}

serve(async (req) => {
  console.log("Function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!supabaseUrl) {
      console.error("Missing var: SUPABASE_URL");
      throw new Error("Required environment variable is missing: SUPABASE_URL");
    }

    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const resendFromEmail = requireEnv("RESEND_FROM_EMAIL");

    console.log("Environment variables check passed");

    console.log("Initializing Supabase Admin...");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });

    console.log("Initializing Resend...");
    const resend = new Resend(resendApiKey);

    console.log("Fetching notifications...");
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
    console.log(`Fetched notifications: ${notifications.length}`);

    if (notifications.length === 0) {
      console.log("No notifications to process");
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, errors: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const userIds = [...new Set(notifications.map((notification) => notification.user_id))];
    console.log(`Unique users to resolve emails for: ${userIds.length}`);

    console.log("Fetching profile emails...");
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
    console.log(`Users missing profile email: ${missingEmailUserIds.length}`);

    if (missingEmailUserIds.length > 0) {
      console.log("Fetching fallback emails from auth.users...");
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
      console.log(`Processing notification ${notification.id}`);

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

        console.log(`Sending email via Resend for notification ${notification.id}`);
        const { error: resendError } = await resend.emails.send({
          from: resendFromEmail,
          to: [recipientEmail],
          subject,
          html,
        });

        if (resendError) {
          throw new Error(`Resend error: ${resendError.message}`);
        }

        console.log(`Marking notification ${notification.id} as sent`);
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

    console.log(`Processing completed. processed=${notifications.length}, sent=${sent}, errors=${errors}`);
    return new Response(
      JSON.stringify({ processed: notifications.length, sent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("CRITICAL ERROR:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ processed: 0, sent: 0, errors: 1, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
