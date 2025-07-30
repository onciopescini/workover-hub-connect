-- Add collaboration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN collaboration_availability TEXT CHECK (collaboration_availability IN ('available', 'busy', 'not_available')) DEFAULT 'not_available',
ADD COLUMN collaboration_types TEXT[] DEFAULT '{}',
ADD COLUMN preferred_work_mode TEXT CHECK (preferred_work_mode IN ('remoto', 'presenza', 'ibrido', 'flessibile')) DEFAULT 'flessibile',
ADD COLUMN collaboration_description TEXT;