-- SIMPLIFIED SECURITY FIXES (Phase 1)

-- 1. Secure waitlists table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waitlists') THEN
    ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view waitlists" ON public.waitlists;
    DROP POLICY IF EXISTS "Users can view their own waitlists" ON public.waitlists;
    DROP POLICY IF EXISTS "Space hosts can view waitlists for their spaces" ON public.waitlists;
    DROP POLICY IF EXISTS "Users can create their own waitlists" ON public.waitlists;
    DROP POLICY IF EXISTS "Users can update their own waitlists" ON public.waitlists;
    DROP POLICY IF EXISTS "Users can delete their own waitlists" ON public.waitlists;
    
    CREATE POLICY "Users can view their own waitlists"
    ON public.waitlists FOR SELECT
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Space hosts can view waitlists for their spaces"
    ON public.waitlists FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.spaces
      WHERE spaces.id = waitlists.space_id AND spaces.host_id = auth.uid()
    ));
    
    CREATE POLICY "Users can create their own waitlists"
    ON public.waitlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- 2. Lock down rate_limits table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limits') THEN
    ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow public access to rate_limits" ON public.rate_limits;
    DROP POLICY IF EXISTS "Public can view rate limits" ON public.rate_limits;
    DROP POLICY IF EXISTS "System functions can access rate_limits" ON public.rate_limits;
    DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limits;
    DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;
    
    CREATE POLICY "Admins can manage rate limits"
    ON public.rate_limits FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END
$$;

-- 3. Secure data_access_logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_access_logs') THEN
    ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Auto-log data access" ON public.data_access_logs;
    DROP POLICY IF EXISTS "Only system can log data access" ON public.data_access_logs;
    DROP POLICY IF EXISTS "Authenticated users can log data access" ON public.data_access_logs;
    
    CREATE POLICY "Authenticated users can log data access"
    ON public.data_access_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;