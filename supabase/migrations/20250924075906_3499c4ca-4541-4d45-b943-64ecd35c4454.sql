-- Seed test host with Stripe account data
WITH target AS (
  SELECT host_id
  FROM public.spaces
  WHERE id = 'ca2ae744-61e9-47d7-98bf-62904994c608'
  LIMIT 1
)
UPDATE public.profiles p
SET
  stripe_account_id = COALESCE(p.stripe_account_id, 'acct_test_DEV_1234567890'),
  stripe_connected = true,
  stripe_onboarding_status = COALESCE(p.stripe_onboarding_status, 'completed')
FROM target
WHERE p.id = target.host_id;

-- Verification query
SELECT p.id AS host_id, p.stripe_account_id, p.stripe_connected, p.stripe_onboarding_status
FROM public.profiles p
JOIN public.spaces s ON s.host_id = p.id
WHERE s.id = 'ca2ae744-61e9-47d7-98bf-62904994c608';