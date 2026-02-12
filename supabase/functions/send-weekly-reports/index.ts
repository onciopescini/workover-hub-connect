import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPORT_SUBJECT = "Il tuo report settimanale WorkOver 📈";
const BRAND_PRIMARY_COLOR = "#2F4063";
const EMAIL_BACKGROUND_COLOR = "#F9FAFB";
const MAIN_TEXT_COLOR = "#1F2937";
const LOGO_ORIZZONTALE_URL =
  "https://khtqwzvrxzsgfhsslwyz.supabase.co/storage/v1/object/public/public-assets/ChatGPT%20Image%2031%20gen%202026,%2018_07_29.png";
const BRAND_ICON_URL =
  "https://khtqwzvrxzsgfhsslwyz.supabase.co/storage/v1/object/public/public-assets/ChatGPT%20Image%2031%20gen%202026,%2018_07_26.png";

type WeeklyHostStatsRow = {
  host_id: string;
  host_email: string;
  total_bookings: number;
  total_revenue: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toWeeklyHostStatsRow(value: unknown): WeeklyHostStatsRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const hostId = value.host_id;
  const hostEmail = value.host_email;
  const totalBookings = value.total_bookings;
  const totalRevenue = value.total_revenue;

  const parsedBookings =
    typeof totalBookings === "number"
      ? totalBookings
      : typeof totalBookings === "string"
      ? Number(totalBookings)
      : Number.NaN;

  const parsedRevenue =
    typeof totalRevenue === "number"
      ? totalRevenue
      : typeof totalRevenue === "string"
      ? Number(totalRevenue)
      : Number.NaN;

  if (
    typeof hostId !== "string" ||
    typeof hostEmail !== "string" ||
    !Number.isFinite(parsedBookings) ||
    !Number.isFinite(parsedRevenue)
  ) {
    return null;
  }

  return {
    host_id: hostId,
    host_email: hostEmail,
    total_bookings: parsedBookings,
    total_revenue: parsedRevenue,
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildWeeklyReportHtml(stats: WeeklyHostStatsRow): string {
  return `
    <div style="margin: 0; padding: 32px 16px; background-color: ${EMAIL_BACKGROUND_COLOR}; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: ${MAIN_TEXT_COLOR};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
        <tr>
          <td style="padding: 0 0 20px 0; text-align: center;">
            <img src="${LOGO_ORIZZONTALE_URL}" alt="WorkOver" style="max-width: 180px; width: 100%; height: auto; display: inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 14px rgba(17, 24, 39, 0.08); padding: 24px;">
            <h1 style="margin: 0 0 8px; font-size: 18px; line-height: 1.3; color: ${BRAND_PRIMARY_COLOR};">Report settimanale host</h1>
            <p style="margin: 0 0 18px; font-size: 15px; color: #4B5563;">Ecco i tuoi risultati degli ultimi 7 giorni.</p>

            <div style="margin: 0 0 14px; background: #F3F4F6; border-radius: 12px; padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #6B7280;">Prenotazioni ricevute</p>
              <p style="margin: 0; font-size: 34px; line-height: 1.2; font-weight: 700; color: ${BRAND_PRIMARY_COLOR};">${stats.total_bookings}</p>
            </div>

            <div style="margin: 0; background: #EEF2FF; border-radius: 12px; padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #6B7280;">Totale guadagnato</p>
              <p style="margin: 0; font-size: 34px; line-height: 1.2; font-weight: 700; color: ${BRAND_PRIMARY_COLOR};">${escapeHtml(formatCurrency(stats.total_revenue))}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 18px 8px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6B7280; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <img src="${BRAND_ICON_URL}" alt="Icona WorkOver" width="30" height="30" style="display: inline-block; vertical-align: middle;" />
              Ricevi questo riepilogo perché sei registrato come host su WorkOver.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function requireEnv(
  name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "RESEND_API_KEY" | "RESEND_FROM_EMAIL",
): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Required environment variable is missing: ${name}`);
  }

  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const resendFromEmail = requireEnv("RESEND_FROM_EMAIL");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const resend = new Resend(resendApiKey);

    const { data, error } = await supabase.rpc("get_weekly_host_stats");

    if (error) {
      throw new Error(`Failed to fetch weekly stats: ${error.message}`);
    }

    const statsRows = Array.isArray(data)
      ? data.map(toWeeklyHostStatsRow).filter((row): row is WeeklyHostStatsRow => row !== null)
      : [];

    let sentCount = 0;
    const failedHosts: string[] = [];

    for (const row of statsRows) {
      if (row.host_email.length === 0) {
        failedHosts.push(row.host_id);
        continue;
      }

      const { error: sendError } = await resend.emails.send({
        from: resendFromEmail,
        to: [row.host_email],
        subject: REPORT_SUBJECT,
        html: buildWeeklyReportHtml(row),
      });

      if (sendError) {
        console.error("Failed sending weekly report", {
          hostId: row.host_id,
          hostEmail: row.host_email,
          error: sendError.message,
        });
        failedHosts.push(row.host_id);
        continue;
      }

      sentCount += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalHosts: statsRows.length,
        sentCount,
        failedHosts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
