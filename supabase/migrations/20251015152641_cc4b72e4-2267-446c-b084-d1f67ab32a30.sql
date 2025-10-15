-- Fix A.2: FK constraint on invoices.payment_id + RLS for invoices bucket
-- Prevents orphan invoices and protects invoice documents

-- 1. Add FK constraint to prevent orphan invoices
ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoices_payment_id 
FOREIGN KEY (payment_id) 
REFERENCES public.payments(id) 
ON DELETE RESTRICT;

-- 2. Add index for performance
CREATE INDEX idx_invoices_payment_id ON public.invoices(payment_id);

-- 3. RLS policies for invoices bucket
CREATE POLICY "Recipients view own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "System upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND public.is_admin(auth.uid())
);