-- Allow users to insert their own connection suggestions (needed for refresh function)
DO $$ BEGIN
  -- Create INSERT policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'connection_suggestions' 
      AND policyname = 'Users insert own suggestions'
  ) THEN
    CREATE POLICY "Users insert own suggestions"
    ON public.connection_suggestions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;