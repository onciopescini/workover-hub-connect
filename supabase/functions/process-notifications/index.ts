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
const BRAND_PRIMARY_COLOR = "#2F4063";
const EMAIL_BACKGROUND_COLOR = "#F9FAFB";
const MAIN_TEXT_COLOR = "#1F2937";
const LOGO_ORIZZONTALE_URL = "URL_LOGO_ORIZZONTALE";
const BRAND_ICON_URL = "URL_ICONA_BRAND";

type NotificationType = "booking_update" | "payment_action" | "dispute_alert" | "system_alert";

type NotificationMetadata = {
  booking_id?: string | number;
  dispute_id?: string | number;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string | null;
  message: string | null;
  created_at: string;
  email_sent_at: string | null;
  metadata: unknown;
};

type CtaDetails = {
  href: string;
  label: string;
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

function isMetadataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMetadata(raw: unknown): NotificationMetadata {
  if (!isMetadataRecord(raw)) {
    return {};
  }

  const bookingId = raw.booking_id;
  const disputeId = raw.dispute_id;

  return {
    booking_id: typeof bookingId === "string" || typeof bookingId === "number" ? bookingId : undefined,
    dispute_id: typeof disputeId === "string" || typeof disputeId === "number" ? disputeId : undefined,
  };
}

function buildCtaDetails(type: NotificationType, metadata: NotificationMetadata, appUrl: string): CtaDetails | null {
  if (!appUrl) {
    return null;
  }

  if (type === "booking_update" && metadata.booking_id !== undefined) {
    return {
      href: `${appUrl}/bookings/${encodeURIComponent(String(metadata.booking_id))}`,
      label: "Gestisci Prenotazione",
    };
  }

  if (type === "dispute_alert" && metadata.dispute_id !== undefined) {
    return {
      href: `${appUrl}/disputes/${encodeURIComponent(String(metadata.dispute_id))}`,
      label: "Risolvi Contestazione",
    };
  }

  return null;
}

function buildNotificationHtml(notification: NotificationRow, appUrl: string): string {
  const intro = templateIntroByType(notification.type);
  const title = escapeHtml(notification.title ?? DEFAULT_SUBJECT);
  const message = escapeHtml(notification.message ?? DEFAULT_MESSAGE);
  const metadata = extractMetadata(notification.metadata);
  const ctaDetails = buildCtaDetails(notification.type, metadata, appUrl);
  const ctaHtml = ctaDetails
    ? `
      <div style="margin: 24px 0 8px;">
        <a
          href="${escapeHtml(ctaDetails.href)}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: inline-block; background-color: ${BRAND_PRIMARY_COLOR}; color: #FFFFFF; border-radius: 10px; padding: 12px 18px; text-decoration: none; font-size: 14px; font-weight: 600;"
        >
          ${escapeHtml(ctaDetails.label)}
        </a>
      </div>
    `
    : "";

  return `
    <div style="margin: 0; padding: 32px 16px; background-color: ${EMAIL_BACKGROUND_COLOR}; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: ${MAIN_TEXT_COLOR};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
        <tr>
          <td style="padding: 0 0 20px 0; text-align: center;">
            <img src="${LOGO_ORIZZONTALE_URL}" alt="WorkOver" style="max-width: 220px; width: 100%; height: auto; display: inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 14px rgba(17, 24, 39, 0.08); padding: 24px;">
            <p style="margin: 0 0 10px; font-size: 15px; color: #4B5563;">${escapeHtml(intro)}</p>
            <h2 style="margin: 0 0 12px; font-size: 22px; line-height: 1.3; color: ${MAIN_TEXT_COLOR};">${title}</h2>
            <p style="margin: 0; font-size: 16px; color: ${MAIN_TEXT_COLOR};">${message}</p>
            ${ctaHtml}
          </td>
        </tr>
        <tr>
          <td style="padding: 18px 8px 0; text-align: center;">
            <img src="${BRAND_ICON_URL}" alt="Icona WorkOver" width="28" height="28" style="display: inline-block; margin: 0 0 10px;" />
            <p style="margin: 0; font-size: 12px; color: #6B7280;">
              Hai ricevuto questa email perché sei registrato su WorkOver.it.com. Se hai domande, rispondi a questa email.
            </p>
          </td>
        </tr>
      </table>
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
    const appUrl = (Deno.env.get("APP_URL") ?? "").trim().replace(/\/$/, "");

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
      .select("id, user_id, type, title, message, created_at, email_sent_at, metadata")
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

    let sent = 0;
    let errors = 0;

    for (const notification of notifications) {
      console.log(`Processing notification ${notification.id}`);

      try {
        console.log(`Fetching auth user for notification ${notification.id}`);
        const { data: authUserResponse, error: authUserError } = await supabaseAdmin
          .auth
          .admin
          .getUserById(notification.user_id);

        if (authUserError) {
          errors += 1;
          console.error("[PROCESS-NOTIFICATIONS] Failed to fetch auth user", {
            notificationId: notification.id,
            userId: notification.user_id,
            message: authUserError.message,
          });
          continue;
        }

        const recipientEmail = authUserResponse.user?.email;

        if (!recipientEmail) {
          errors += 1;
          console.error("[PROCESS-NOTIFICATIONS] Recipient email not found", {
            notificationId: notification.id,
            userId: notification.user_id,
          });
          continue;
        }

        const subject = notification.title ?? DEFAULT_SUBJECT;
        const html = buildNotificationHtml(notification, appUrl);

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
