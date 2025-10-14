-- =====================================================
-- FASE 1: ITALIAN FISCAL COMPLIANCE - DATABASE SCHEMA
-- Step 1.1: Profiles Fiscal Fields
-- =====================================================

-- Add fiscal regime and tax details to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fiscal_regime TEXT CHECK (fiscal_regime IN ('privato', 'forfettario', 'ordinario')),
  ADD COLUMN IF NOT EXISTS pec_email TEXT,
  ADD COLUMN IF NOT EXISTS sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS kyc_documents_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS dac7_data_collected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dac7_threshold_notified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_blocked_actions TEXT[] DEFAULT '{}';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_fiscal_regime ON public.profiles(fiscal_regime) 
  WHERE fiscal_regime IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_verified ON public.profiles(kyc_documents_verified);

-- =====================================================
-- Step 1.2: Payments Invoice Tracking
-- =====================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS workover_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS workover_invoice_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS workover_invoice_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS host_invoice_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS host_invoice_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS host_invoice_reminder_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_note_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_note_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS credit_note_issued_by_host BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_note_xml_url TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_workover_invoice ON public.payments(workover_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_host_invoice_required ON public.payments(host_invoice_required, host_invoice_deadline) 
  WHERE host_invoice_required = TRUE;

-- =====================================================
-- Step 1.3: Invoices Table (WorkOver Service Fee)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Parties
  issuer TEXT DEFAULT 'WORKOVER_IT',
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('host_piva', 'host_privato', 'coworker_piva', 'coworker_privato')),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Invoice data
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Amounts (EUR)
  base_amount NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 22.00,
  vat_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  
  -- Discount
  discount_amount NUMERIC(10,2) DEFAULT 0,
  discount_reason TEXT,
  
  -- Electronic invoicing (SdI)
  xml_file_url TEXT,
  xml_sdi_id TEXT,
  xml_sent_at TIMESTAMP WITH TIME ZONE,
  xml_delivery_status TEXT CHECK (xml_delivery_status IN ('pending', 'delivered', 'rejected', 'error')),
  xml_rejection_reason TEXT,
  
  -- PDF
  pdf_file_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Legal compliance
  conservazione_sostitutiva_url TEXT,
  conservazione_completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON public.invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON public.invoices(recipient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_xml_status ON public.invoices(xml_delivery_status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Recipient can view their own invoices
CREATE POLICY "invoices_select_recipient" ON public.invoices
  FOR SELECT USING (auth.uid() = recipient_id);

-- Admin full access
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL USING (public.is_admin(auth.uid()));

-- =====================================================
-- Step 1.4: Non-Fiscal Receipts Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.non_fiscal_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  
  -- Parties
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  coworker_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Receipt data
  receipt_number TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  
  -- Amounts
  canone_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  
  -- Fiscal note
  includes_coworker_cf BOOLEAN DEFAULT FALSE,
  
  -- Files
  pdf_url TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Legal disclaimer
  disclaimer TEXT DEFAULT 'Documento non valido ai fini fiscali, emesso esclusivamente per tracciabilità della transazione.'
);

-- Indexes for non_fiscal_receipts
CREATE INDEX IF NOT EXISTS idx_nfr_booking ON public.non_fiscal_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_nfr_host ON public.non_fiscal_receipts(host_id);
CREATE INDEX IF NOT EXISTS idx_nfr_coworker ON public.non_fiscal_receipts(coworker_id);
CREATE INDEX IF NOT EXISTS idx_nfr_date ON public.non_fiscal_receipts(receipt_date DESC);

-- Enable RLS on non_fiscal_receipts
ALTER TABLE public.non_fiscal_receipts ENABLE ROW LEVEL SECURITY;

-- Host and coworker can view their own receipts
CREATE POLICY "nfr_select_own" ON public.non_fiscal_receipts
  FOR SELECT USING (
    auth.uid() = host_id OR 
    auth.uid() = coworker_id
  );

-- Admin full access
CREATE POLICY "nfr_admin_all" ON public.non_fiscal_receipts
  FOR ALL USING (public.is_admin(auth.uid()));