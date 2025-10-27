-- Add category column to support_tickets table
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

-- Add check constraint for valid category values
ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_category_check 
CHECK (category IN ('technical', 'booking', 'payment', 'account', 'space', 'feedback', 'other'));

-- Add index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_category 
ON public.support_tickets(category);

-- Update existing tickets to have a default category if any exist without it
UPDATE public.support_tickets 
SET category = 'other' 
WHERE category IS NULL;