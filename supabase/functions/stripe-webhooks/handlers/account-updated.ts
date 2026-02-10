import Stripe from "npm:stripe@16.5.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.3";
import { SRELogger } from "../../_shared/sre-logger.ts";

type StripeOnboardingStatus = "none" | "pending" | "completed" | "restricted";

type IdempotencyTable = "stripe_webhooks" | "webhook_events";

type IdempotencyRecord = {
  table: IdempotencyTable;
  processed: boolean;
};

export type AccountUpdatedHandlerResult = {
  success: boolean;
  statusCode?: 400 | 500;
  duplicate?: boolean;
  error?: string;
  message?: string;
};

export class AccountUpdatedHandler {
  static async handle(
    event: Stripe.Event,
    supabase: SupabaseClient,
  ): Promise<AccountUpdatedHandlerResult> {
    const account = event.data.object;

    if (!this.isValidAccountPayload(account)) {
      return {
        success: false,
        statusCode: 400,
        error: "Invalid account.updated payload",
      };
    }

    try {
      const idempotency = await this.readIdempotencyRecord(supabase, event.id);
      if (idempotency?.processed) {
        SRELogger.info("account.updated already processed", {
          eventId: event.id,
          table: idempotency.table,
        });

        return {
          success: true,
          duplicate: true,
          message: "Duplicate event ignored",
        };
      }

      const onboardingStatus = this.mapOnboardingStatus(account);
      const stripeConnected = onboardingStatus === "completed";

      const { data: profile, error: profileReadError } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_account_id", account.id)
        .maybeSingle();

      if (profileReadError) {
        throw new Error(`Failed to read profile: ${profileReadError.message}`);
      }

      if (!profile) {
        return {
          success: false,
          statusCode: 400,
          error: `Profile not found for stripe_account_id ${account.id}`,
        };
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          stripe_connected: stripeConnected,
          stripe_onboarding_status: onboardingStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (profileUpdateError) {
        throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
      }

      await this.upsertIdempotencyRecord(supabase, event, idempotency?.table);

      SRELogger.info("account.updated processed", {
        eventId: event.id,
        stripeAccountId: account.id,
        profileId: profile.id,
        onboardingStatus,
      });

      return {
        success: true,
        message: "account.updated processed",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown database error";

      SRELogger.error("account.updated DB failure", {
        eventId: event.id,
        error: message,
      });

      return {
        success: false,
        statusCode: 500,
        error: message,
      };
    }
  }

  private static isValidAccountPayload(account: unknown): account is Stripe.Account {
    if (typeof account !== "object" || account === null) {
      return false;
    }

    if (!("id" in account) || typeof account.id !== "string") {
      return false;
    }

    if (!("payouts_enabled" in account) || typeof account.payouts_enabled !== "boolean") {
      return false;
    }

    if (!("details_submitted" in account) || typeof account.details_submitted !== "boolean") {
      return false;
    }

    return true;
  }

  private static mapOnboardingStatus(account: Stripe.Account): StripeOnboardingStatus {
    const disabledReason = account.requirements?.disabled_reason;

    if (disabledReason || !account.payouts_enabled) {
      return "restricted";
    }

    if (account.details_submitted) {
      return "completed";
    }

    return "pending";
  }

  private static async readIdempotencyRecord(
    supabase: SupabaseClient,
    eventId: string,
  ): Promise<IdempotencyRecord | null> {
    const stripeWebhooksResult = await supabase
      .from("stripe_webhooks")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle<{ status: string }>();

    if (stripeWebhooksResult.error && stripeWebhooksResult.error.code !== "42P01") {
      throw new Error(`Failed to query stripe_webhooks: ${stripeWebhooksResult.error.message}`);
    }

    if (stripeWebhooksResult.data) {
      return {
        table: "stripe_webhooks",
        processed: stripeWebhooksResult.data.status === "processed",
      };
    }

    const webhookEventsResult = await supabase
      .from("webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle<{ status: string }>();

    if (webhookEventsResult.error && webhookEventsResult.error.code !== "42P01") {
      throw new Error(`Failed to query webhook_events: ${webhookEventsResult.error.message}`);
    }

    if (webhookEventsResult.data) {
      return {
        table: "webhook_events",
        processed: webhookEventsResult.data.status === "processed",
      };
    }

    return null;
  }

  private static async upsertIdempotencyRecord(
    supabase: SupabaseClient,
    event: Stripe.Event,
    preferredTable?: IdempotencyTable,
  ): Promise<void> {
    const payload = event.data.object as Record<string, unknown>;

    if (!preferredTable || preferredTable === "stripe_webhooks") {
      const { error: stripeWebhooksError } = await supabase
        .from("stripe_webhooks")
        .upsert(
          {
            event_id: event.id,
            event_type: event.type,
            payload,
            status: "processed",
            error_message: null,
          },
          { onConflict: "event_id" },
        );

      if (!stripeWebhooksError) {
        return;
      }

      if (stripeWebhooksError.code !== "42P01") {
        throw new Error(`Failed to upsert stripe_webhooks: ${stripeWebhooksError.message}`);
      }
    }

    const { error: webhookEventsError } = await supabase
      .from("webhook_events")
      .upsert(
        {
          event_id: event.id,
          event_type: event.type,
          payload,
          status: "processed",
          last_error: null,
          processed_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );

    if (webhookEventsError) {
      throw new Error(`Failed to upsert webhook_events: ${webhookEventsError.message}`);
    }
  }
}
