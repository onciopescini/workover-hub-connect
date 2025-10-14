-- Migration: Create Storage Buckets for Invoicing System

-- =====================================================
-- STORAGE BUCKETS CREATION
-- =====================================================

-- Bucket: invoices (WorkOver service fee invoices)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  FALSE,
  5242880, -- 5MB
  ARRAY['application/xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: host-invoices-guide (PDF guides for hosts to issue invoices)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'host-invoices-guide',
  'host-invoices-guide',
  FALSE,
  2097152, -- 2MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: non-fiscal-receipts (receipts for private hosts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'non-fiscal-receipts',
  'non-fiscal-receipts',
  FALSE,
  2097152, -- 2MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;