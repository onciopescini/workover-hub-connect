# Stripe Onboarding Analysis

## 1. Edge Function Identity
The functionality to connect a Stripe account is triggered by the **`create-stripe-connect-account`** Supabase Edge Function.

- **Trigger**: The user clicks the "Connetti Stripe" button in the `StripeConnectButton` component (`src/components/stripe/StripeConnectButton.tsx`).
- **Client Call**: `supabase.functions.invoke('create-stripe-connect-account')`.
- **Response**: Returns a JSON object containing a `url` for the Stripe Onboarding flow.

## 2. Database Storage & Status
The user's Stripe status and account information are stored in two primary locations in the database, with `stripe_accounts` being the source of truth for detailed status.

### A. `stripe_accounts` Table (Primary)
This table tracks the detailed state of the Stripe Connect account.
- **`user_id`**: Links to the `profiles` table.
- **`stripe_account_id`**: The Stripe Connect Account ID (e.g., `acct_...`).
- **`onboarding_completed`** (`boolean`): Indicates if the user completed the Stripe onboarding flow.
- **`charges_enabled`** (`boolean`): Indicates if Stripe has enabled charges for this account (KYC passed on Stripe side).
- **`account_status`**: Text status field.

### B. `profiles` Table (Denormalized/Legacy)
The `profiles` table contains summary fields often used for quick access or RLS policies.
- **`stripe_account_id`**: Copy of the Connect Account ID.
- **`stripe_connected`** (`boolean`): Summary flag indicating if the account is fully connected.
- **`stripe_onboarding_status`** (`enum`): Status of onboarding (`none`, `pending`, `completed`, `restricted`).

**Sync Mechanism**: Updates to these tables are typically handled by the **`stripe-webhook`** Edge Function, which listens for Stripe events (like `account.updated`) and syncs the data back to Supabase.

## 3. Admin KYC & Publishing Restrictions
Apart from Stripe's own verification (which sets `charges_enabled`), there are internal platform controls.

### Publishing Restrictions
- **`profiles.space_creation_restricted`** (`boolean`): If this column is `true`, the user is blocked from accessing the space creation page (`useSpaceCreation.ts`).
- **Stripe Status Check**: The `useSpaceFormSubmission` hook checks if `stripeOnboardingStatus === 'completed'` (currently temporarily bypassed) before allowing a space to be published (`formData.published`).

### Admin Verification
- **`profiles.kyc_documents_verified`** (`boolean`): Indicates if the platform admin has verified the user's uploaded KYC documents (`kyc_documents` table).
- While Stripe handles payment KYC, this flag represents an internal trust level.

## 4. Required Environment Variables (Secrets)
For the Stripe onboarding flow to function correctly, the following secrets must be set in the Supabase project (via `supabase secrets set` or dashboard):

| Variable Name | Description | Used By |
| :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | The Stripe Secret API Key (`sk_...`). Required for performing server-side operations like creating accounts and links. | `create-stripe-connect-account`, `stripe-webhook` |
| `STRIPE_WEBHOOK_SECRET` | The signing secret for Stripe Webhooks (`whsec_...`). Required to verify events sent to the `stripe-webhook` function. | `stripe-webhook` |
| `STRIPE_PUBLISHABLE_KEY` | The Stripe Publishable Key (`pk_...`). Used by the frontend client (Vite env var `VITE_STRIPE_PUBLISHABLE_KEY` should match this). | Client / Frontend |

### Frontend Environment Variables
These must be present in `.env` (or `.env.local`) for local development and build:
- `VITE_STRIPE_PUBLISHABLE_KEY`
