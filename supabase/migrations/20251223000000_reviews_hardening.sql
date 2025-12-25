-- Migration: Reviews System Hardening
-- Description: Adds Unique Constraints, Caching Columns, and Auto-Calculation Triggers

-- ==========================================
-- 1. Unique Constraints (Prevent Duplicates)
-- ==========================================

-- Ensure one review per booking for the space
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_reviews_booking_id_key') THEN
        ALTER TABLE public.space_reviews ADD CONSTRAINT space_reviews_booking_id_key UNIQUE (booking_id);
    END IF;
END $$;

-- Ensure one review per booking per author for users (bidirectional)
-- This allows:
--   - Host reviews User (Booking ID X, Author Host)
--   - User reviews Host (Booking ID X, Author User)
-- But prevents:
--   - Host reviews User twice for same booking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_reviews_booking_id_author_id_key') THEN
        ALTER TABLE public.booking_reviews ADD CONSTRAINT booking_reviews_booking_id_author_id_key UNIQUE (booking_id, author_id);
    END IF;
END $$;


-- ==========================================
-- 2. Add Caching Columns
-- ==========================================

-- Workspaces (The active table for spaces)
ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS cached_avg_rating NUMERIC(3,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cached_review_count INTEGER DEFAULT 0;

-- Profiles (Users)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cached_avg_rating NUMERIC(3,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cached_review_count INTEGER DEFAULT 0;


-- ==========================================
-- 3. Functions for Auto-Calculation
-- ==========================================

-- Function to update Workspace ratings
CREATE OR REPLACE FUNCTION public.update_workspace_rating()
RETURNS TRIGGER AS $$
DECLARE
    _space_id UUID;
BEGIN
    -- Determine space_id based on operation
    IF (TG_OP = 'DELETE') THEN
        _space_id := OLD.space_id;
    ELSE
        _space_id := NEW.space_id;
    END IF;

    -- Update the workspace cache
    UPDATE public.workspaces
    SET
        cached_avg_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
            FROM public.space_reviews
            WHERE space_id = _space_id
        ),
        cached_review_count = (
            SELECT COUNT(*)
            FROM public.space_reviews
            WHERE space_id = _space_id
        )
    WHERE id = _space_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update Profile ratings (from Booking Reviews)
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
    _target_id UUID;
BEGIN
    -- Determine target_id based on operation
    IF (TG_OP = 'DELETE') THEN
        _target_id := OLD.target_id;
    ELSE
        _target_id := NEW.target_id;
    END IF;

    -- Update the profile cache
    UPDATE public.profiles
    SET
        cached_avg_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
            FROM public.booking_reviews
            WHERE target_id = _target_id
        ),
        cached_review_count = (
            SELECT COUNT(*)
            FROM public.booking_reviews
            WHERE target_id = _target_id
        )
    WHERE id = _target_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 4. Triggers
-- ==========================================

-- Trigger for Space Reviews
DROP TRIGGER IF EXISTS on_space_review_change ON public.space_reviews;
CREATE TRIGGER on_space_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.space_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_workspace_rating();

-- Trigger for Booking Reviews
DROP TRIGGER IF EXISTS on_booking_review_change ON public.booking_reviews;
CREATE TRIGGER on_booking_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.booking_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();
