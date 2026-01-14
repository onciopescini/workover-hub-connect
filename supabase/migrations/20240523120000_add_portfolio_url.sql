ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Grant access to authenticated users
GRANT SELECT ON profiles TO authenticated;
-- Users can update their own profile
CREATE POLICY "Users can update their own portfolio_url" ON profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
