-- Migration to fix missing system dependencies for User Registration
-- 1. Adds 'subject' column to message_templates (if missing)
-- 2. Seeds default system templates (welcome_email, etc) owned by Admin

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- 1. Find the Admin User
  SELECT id INTO admin_id FROM auth.users WHERE email = 'alfonso@pescini.org' LIMIT 1;

  -- If Admin exists, proceed with seeding
  IF admin_id IS NOT NULL THEN

    ---------------------------------------------------------------------------
    -- Step 1: Schema Adjustment (Add Subject if missing)
    ---------------------------------------------------------------------------
    BEGIN
      ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS subject TEXT;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error adding subject column to message_templates: %', SQLERRM;
    END;

    ---------------------------------------------------------------------------
    -- Step 2: Seed Templates
    ---------------------------------------------------------------------------

    -- Template: Welcome Email
    IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE host_id = admin_id AND name = 'welcome_email') THEN
       INSERT INTO public.message_templates (host_id, name, type, subject, content, is_active, is_favorite)
       VALUES (
         admin_id,
         'welcome_email',
         'confirmation'::message_template_type,
         'Benvenuto in WorkOver',
         'Ciao {{name}}, benvenuto nella community di WorkOver! Siamo felici di averti con noi. Completa il tuo profilo per iniziare a prenotare spazi o ospitare coworker.',
         true,
         true
       );
    END IF;

    -- Template: New Booking (Notification for Host)
    IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE host_id = admin_id AND name = 'new_booking') THEN
       INSERT INTO public.message_templates (host_id, name, type, subject, content, is_active, is_favorite)
       VALUES (
         admin_id,
         'new_booking',
         'confirmation'::message_template_type,
         'Nuova Richiesta di Prenotazione',
         'Ciao! Hai ricevuto una nuova richiesta di prenotazione per il tuo spazio. Accedi alla dashboard per visualizzare i dettagli e rispondere.',
         true,
         true
       );
    END IF;

    -- Template: Booking Confirmation (For Guest)
    IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE host_id = admin_id AND name = 'booking_confirmation') THEN
       INSERT INTO public.message_templates (host_id, name, type, subject, content, is_active, is_favorite)
       VALUES (
         admin_id,
         'booking_confirmation',
         'confirmation'::message_template_type,
         'Prenotazione Confermata',
         'La tua prenotazione è stata confermata! Ti aspettiamo nello spazio. Ricorda di controllare i dettagli dell''accesso nella tua area personale.',
         true,
         true
       );
    END IF;

    RAISE NOTICE 'System templates seeded successfully for Admin ID: %', admin_id;

  ELSE
    RAISE WARNING 'Admin user (alfonso@pescini.org) NOT FOUND. Skipping template seeding. Registration may fail if triggers rely on this data.';
  END IF;

END $$;
