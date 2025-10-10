-- Create enum for setting categories
CREATE TYPE setting_category AS ENUM ('general', 'payment', 'booking', 'moderation', 'gdpr', 'integration');

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category setting_category NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create settings_audit_log table
CREATE TABLE IF NOT EXISTS public.settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  setting_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_settings
CREATE POLICY "Admins manage system settings"
ON public.system_settings
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for email_templates
CREATE POLICY "Admins manage email templates"
ON public.email_templates
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for settings_audit_log
CREATE POLICY "Admins view audit log"
ON public.settings_audit_log
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (key, value, category, description) VALUES
('platform_name', '"CoWork Space"'::jsonb, 'general', 'Nome della piattaforma'),
('platform_currency', '"EUR"'::jsonb, 'general', 'Valuta predefinita'),
('platform_timezone', '"Europe/Rome"'::jsonb, 'general', 'Timezone predefinita'),
('platform_fee_percentage', '5'::jsonb, 'payment', 'Percentuale fee piattaforma'),
('stripe_fee_percentage', '1.5'::jsonb, 'payment', 'Percentuale fee Stripe'),
('min_booking_duration', '60'::jsonb, 'booking', 'Durata minima prenotazione (minuti)'),
('max_booking_duration', '480'::jsonb, 'booking', 'Durata massima prenotazione (minuti)'),
('booking_approval_timeout_hours', '24'::jsonb, 'booking', 'Timeout approvazione prenotazione (ore)'),
('payment_deadline_minutes', '15'::jsonb, 'booking', 'Deadline pagamento (minuti)'),
('cancellation_fee_percentage', '20'::jsonb, 'booking', 'Percentuale fee cancellazione'),
('enable_auto_moderation', 'true'::jsonb, 'moderation', 'Abilita moderazione automatica'),
('enable_private_messaging', 'true'::jsonb, 'general', 'Abilita messaggistica privata'),
('enable_events', 'true'::jsonb, 'general', 'Abilita eventi'),
('enable_networking', 'true'::jsonb, 'general', 'Abilita networking'),
('maintenance_mode', 'false'::jsonb, 'general', 'Modalità manutenzione'),
('data_retention_months', '24'::jsonb, 'gdpr', 'Mesi di retention dati'),
('cookie_consent_required', 'true'::jsonb, 'gdpr', 'Richiedi consenso cookie');

-- Insert default email templates
INSERT INTO public.email_templates (template_key, subject, body, variables) VALUES
('booking_confirmation', 'Prenotazione Confermata', 'Ciao {{user_name}},\n\nLa tua prenotazione per {{space_title}} il {{booking_date}} è stata confermata.\n\nDettagli:\n- Orario: {{start_time}} - {{end_time}}\n- Host: {{host_name}}\n\nGrazie per aver scelto la nostra piattaforma!', '["user_name", "space_title", "booking_date", "start_time", "end_time", "host_name"]'::jsonb),
('booking_cancellation', 'Prenotazione Cancellata', 'Ciao {{user_name}},\n\nLa tua prenotazione per {{space_title}} è stata cancellata.\n\nSe hai domande, contattaci.', '["user_name", "space_title"]'::jsonb),
('payment_receipt', 'Ricevuta Pagamento', 'Ciao {{user_name}},\n\nHai completato il pagamento di €{{amount}} per la prenotazione di {{space_title}}.\n\nGrazie!', '["user_name", "amount", "space_title"]'::jsonb),
('host_new_booking', 'Nuova Prenotazione Ricevuta', 'Ciao {{host_name}},\n\n{{user_name}} ha prenotato {{space_title}} per il {{booking_date}}.\n\nDettagli:\n- Orario: {{start_time}} - {{end_time}}\n- Ospiti: {{guests_count}}', '["host_name", "user_name", "space_title", "booking_date", "start_time", "end_time", "guests_count"]'::jsonb);