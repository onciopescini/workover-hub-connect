-- Migration: FASE 2 - Persistent achievements and profile views

-- Create user_achievements table for persistent achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('connections', 'engagement', 'activity')),
  progress INTEGER DEFAULT 100,
  icon TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- Create profile_views table for tracking profile views
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view unlocked achievements"
  ON public.user_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = user_achievements.user_id
      AND networking_enabled = true
    )
  );

-- Enable RLS on profile_views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_views
CREATE POLICY "Profile owners can view their profile views"
  ON public.profile_views FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Anyone can record profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
  ON public.user_achievements(user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_achievements_category 
  ON public.user_achievements(category, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id 
  ON public.profile_views(profile_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id 
  ON public.profile_views(viewer_id, viewed_at DESC);

-- Create function to get profile view count
CREATE OR REPLACE FUNCTION public.get_profile_view_count(
  p_profile_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  view_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT viewer_id)
  INTO view_count
  FROM public.profile_views
  WHERE profile_id = p_profile_id
    AND viewed_at > NOW() - (p_days_back || ' days')::INTERVAL
    AND viewer_id IS NOT NULL;
  
  RETURN COALESCE(view_count, 0);
END;
$$;

COMMENT ON TABLE public.user_achievements IS 'Persistent storage for user networking achievements';
COMMENT ON TABLE public.profile_views IS 'Tracks profile view events for analytics and networking stats';