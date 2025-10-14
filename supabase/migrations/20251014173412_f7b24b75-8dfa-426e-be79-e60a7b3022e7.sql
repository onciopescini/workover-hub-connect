-- FASE 3: KYC DOCUMENTALE & STRIPE
-- Step 1: Create KYC documents table

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'identity_card', 'drivers_license', 'tax_code')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON public.kyc_documents(verification_status);

-- Enable RLS
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for KYC documents
CREATE POLICY "Users can view their own KYC documents"
ON public.kyc_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own KYC documents"
ON public.kyc_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending KYC documents"
ON public.kyc_documents
FOR UPDATE
USING (auth.uid() = user_id AND verification_status = 'pending');

CREATE POLICY "Admins can manage all KYC documents"
ON public.kyc_documents
FOR ALL
USING (public.is_admin(auth.uid()));

-- Create Stripe accounts table
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'disabled')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  requirements_due JSONB DEFAULT '[]'::jsonb,
  account_type TEXT CHECK (account_type IN ('express', 'standard', 'custom')),
  country_code TEXT,
  currency TEXT DEFAULT 'eur',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_stripe_accounts_user_id ON public.stripe_accounts(user_id);
CREATE INDEX idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);

-- Enable RLS
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Stripe accounts
CREATE POLICY "Users can view their own Stripe account"
ON public.stripe_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all Stripe accounts"
ON public.stripe_accounts
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can manage Stripe accounts"
ON public.stripe_accounts
FOR ALL
USING (true)
WITH CHECK (true);

-- Storage buckets for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']),
  ('identity-verification', 'identity-verification', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for KYC documents bucket
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND public.is_admin(auth.uid())
);

-- Storage RLS policies for identity-verification bucket
CREATE POLICY "Users can upload identity verification documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'identity-verification' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own identity documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'identity-verification' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'identity-verification' 
  AND public.is_admin(auth.uid())
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_kyc_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_documents_timestamp
BEFORE UPDATE ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_kyc_documents_updated_at();

CREATE TRIGGER update_stripe_accounts_timestamp
BEFORE UPDATE ON public.stripe_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_kyc_documents_updated_at();