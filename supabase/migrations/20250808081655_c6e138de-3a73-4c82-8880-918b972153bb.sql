
-- 1) Tipo enum per la categoria dei template (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_template_type') THEN
    CREATE TYPE public.message_template_type AS ENUM ('confirmation', 'reminder', 'cancellation_notice');
  END IF;
END$$;

-- 2) Tabella per i template messaggi degli host
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.message_template_type NOT NULL DEFAULT 'confirmation',
  content text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trg_message_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_message_templates_updated_at
    BEFORE UPDATE ON public.message_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Policies: host può fare CRUD solo sui propri template
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='message_templates' 
      AND policyname='Hosts can view their own templates'
  ) THEN
    CREATE POLICY "Hosts can view their own templates"
      ON public.message_templates
      FOR SELECT
      USING (auth.uid() = host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='message_templates' 
      AND policyname='Hosts can create their own templates'
  ) THEN
    CREATE POLICY "Hosts can create their own templates"
      ON public.message_templates
      FOR INSERT
      WITH CHECK (auth.uid() = host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='message_templates' 
      AND policyname='Hosts can update their own templates'
  ) THEN
    CREATE POLICY "Hosts can update their own templates"
      ON public.message_templates
      FOR UPDATE
      USING (auth.uid() = host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='message_templates' 
      AND policyname='Hosts can delete their own templates'
  ) THEN
    CREATE POLICY "Hosts can delete their own templates"
      ON public.message_templates
      FOR DELETE
      USING (auth.uid() = host_id);
  END IF;
END$$;

-- 3) Tabella per preferenza report mensile (opt-in)
CREATE TABLE IF NOT EXISTS public.host_report_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'monthly',
  day_of_month int NOT NULL DEFAULT 1,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_host_report_subscription UNIQUE (host_id)
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trg_host_report_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER trg_host_report_subscriptions_updated_at
    BEFORE UPDATE ON public.host_report_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- RLS
ALTER TABLE public.host_report_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: host può gestire la propria sottoscrizione
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='host_report_subscriptions' 
      AND policyname='Hosts can view their own report subscription'
  ) THEN
    CREATE POLICY "Hosts can view their own report subscription"
      ON public.host_report_subscriptions
      FOR SELECT
      USING (auth.uid() = host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='host_report_subscriptions' 
      AND policyname='Hosts can create their own report subscription'
  ) THEN
    CREATE POLICY "Hosts can create their own report subscription"
      ON public.host_report_subscriptions
      FOR INSERT
      WITH CHECK (auth.uid() = host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='host_report_subscriptions' 
      AND policyname='Hosts can update their own report subscription'
  ) THEN
    CREATE POLICY "Hosts can update their own report subscription"
      ON public.host_report_subscriptions
      FOR UPDATE
      USING (auth.uid() = host_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='host_report_subscriptions' 
      AND policyname='Hosts can delete their own report subscription'
  ) THEN
    CREATE POLICY "Hosts can delete their own report subscription"
      ON public.host_report_subscriptions
      FOR DELETE
      USING (auth.uid() = host_id);
  END IF;
END$$;
