-- Fiscal Test Data Seed Script
-- This script populates the database with test data for E2E fiscal tests
-- Run this script before executing fiscal E2E tests

-- Clean up existing test data
DELETE FROM public.profiles WHERE email LIKE '%@test.workover.app';
DELETE FROM auth.users WHERE email LIKE '%@test.workover.app';

-- Insert test users in auth.users (this should be done via Supabase Auth API in actual tests)
-- The following is for reference only - actual user creation should happen via signup flow

-- Insert test profiles for hosts
INSERT INTO public.profiles (id, email, first_name, last_name, role, fiscal_regime, tax_id, vat_number, pec_email, sdi_code, iban, legal_address, stripe_connected, kyc_documents_verified)
VALUES 
  -- Forfettario host (KYC approved)
  ('11111111-1111-1111-1111-111111111111', 'host.forfettario@test.workover.app', 'Mario', 'Rossi', 'host', 'forfettario', 'RSSMRA85M01H501Z', NULL, 'mario.rossi@pec.it', NULL, 'IT60X0542811101000000123456', 'Via Roma 123, 20100 Milano MI', true, true),
  
  -- Ordinario host (KYC approved)
  ('22222222-2222-2222-2222-222222222222', 'host.ordinario@test.workover.app', 'Azienda', 'SRL', 'host', 'ordinario', NULL, 'IT12345678901', 'azienda@pec.it', 'ABCDE12', 'IT60X0542811101000000789012', 'Viale Milano 45, 00100 Roma RM', true, true),
  
  -- Private host (KYC approved)
  ('33333333-3333-3333-3333-333333333333', 'host.privato@test.workover.app', 'Giovanni', 'Bianchi', 'host', 'privato', NULL, NULL, NULL, NULL, 'IT60X0542811101000000345678', 'Corso Vittorio 78, 10100 Torino TO', true, true),
  
  -- Host without Stripe
  ('44444444-4444-4444-4444-444444444444', 'host.nostripe@test.workover.app', 'Luigi', 'Verdi', 'host', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false),
  
  -- Pending KYC host
  ('55555555-5555-5555-5555-555555555555', 'host.pendingkyc@test.workover.app', 'Pending', 'Host', 'host', 'forfettario', 'PNDLGI90A01F205X', NULL, 'pending@pec.it', NULL, 'IT60X0542811101000000999999', 'Via Test 1, 50100 Firenze FI', true, false)
ON CONFLICT (id) DO UPDATE SET
  fiscal_regime = EXCLUDED.fiscal_regime,
  tax_id = EXCLUDED.tax_id,
  vat_number = EXCLUDED.vat_number,
  pec_email = EXCLUDED.pec_email,
  sdi_code = EXCLUDED.sdi_code,
  iban = EXCLUDED.iban,
  legal_address = EXCLUDED.legal_address,
  stripe_connected = EXCLUDED.stripe_connected,
  kyc_documents_verified = EXCLUDED.kyc_documents_verified;

-- Insert test profiles for coworkers
INSERT INTO public.profiles (id, email, first_name, last_name, role, tax_id)
VALUES 
  -- Verified coworker
  ('66666666-6666-6666-6666-666666666666', 'coworker.verified@test.workover.app', 'Anna', 'Neri', 'coworker', NULL),
  
  -- Unverified coworker
  ('77777777-7777-7777-7777-777777777777', 'coworker.unverified@test.workover.app', 'Unverified', 'User', 'coworker', NULL),
  
  -- Coworker with fiscal data
  ('88888888-8888-8888-8888-888888888888', 'coworker.fiscal@test.workover.app', 'Paolo', 'Gialli', 'coworker', 'GLLPLA92B15H501W')
ON CONFLICT (id) DO UPDATE SET
  tax_id = EXCLUDED.tax_id;

-- Insert admin profile
INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES 
  ('99999999-9999-9999-9999-999999999999', 'admin@test.workover.app', 'Admin', 'User', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('99999999-9999-9999-9999-999999999999', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert test spaces
INSERT INTO public.spaces (id, host_id, title, description, price_per_day, city, address, capacity, confirmation_type, published)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Test Coworking Milano', 'Space per test forfettario', 45.00, 'Milano', 'Via Test 1', 10, 'instant', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Test Coworking Roma', 'Space per test ordinario', 50.00, 'Roma', 'Via Test 2', 15, 'instant', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Test Coworking Torino', 'Space per test privato', 40.00, 'Torino', 'Via Test 3', 8, 'instant', true)
ON CONFLICT (id) DO UPDATE SET
  price_per_day = EXCLUDED.price_per_day,
  published = EXCLUDED.published;

-- Note: Bookings, payments, invoices, and receipts should be created dynamically during tests
-- to ensure proper testing of edge function triggers and automation

COMMENT ON TABLE public.profiles IS 'Test data seed completed. Users must be created via Supabase Auth API.';
