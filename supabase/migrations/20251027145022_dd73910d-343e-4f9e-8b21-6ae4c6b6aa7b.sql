-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own deletion requests
CREATE POLICY "Users can create their own deletion requests"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX idx_account_deletion_requests_token ON public.account_deletion_requests(token);
CREATE INDEX idx_account_deletion_requests_status ON public.account_deletion_requests(status);

-- Create legal_documents_versions table
CREATE TABLE IF NOT EXISTS public.legal_documents_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('tos', 'privacy_policy')),
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read access)
ALTER TABLE public.legal_documents_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view legal documents
CREATE POLICY "Anyone can view legal documents"
ON public.legal_documents_versions
FOR SELECT
USING (true);

-- Create unique constraint on document_type + version
CREATE UNIQUE INDEX idx_legal_documents_type_version ON public.legal_documents_versions(document_type, version);

-- Create user_legal_acceptances table
CREATE TABLE IF NOT EXISTS public.user_legal_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('tos', 'privacy_policy')),
  version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view their own legal acceptances"
ON public.user_legal_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own acceptances
CREATE POLICY "Users can create their own legal acceptances"
ON public.user_legal_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_legal_acceptances_user_id ON public.user_legal_acceptances(user_id);
CREATE INDEX idx_user_legal_acceptances_document_type ON public.user_legal_acceptances(document_type);

-- Insert initial legal document versions
INSERT INTO public.legal_documents_versions (document_type, version, content, effective_date) VALUES
('tos', '1.0', 'Terms of Service Version 1.0', '2025-01-01'),
('privacy_policy', '1.0', 'Privacy Policy Version 1.0', '2025-01-01');