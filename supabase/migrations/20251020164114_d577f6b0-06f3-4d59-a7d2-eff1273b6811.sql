
-- Step 1: Add 'host' role to app_role enum
-- This must be in a separate transaction before using the value
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'host';
