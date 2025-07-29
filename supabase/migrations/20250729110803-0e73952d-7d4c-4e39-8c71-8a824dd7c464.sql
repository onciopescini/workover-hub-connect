-- Pulisci richieste GDPR bloccate
DELETE FROM public.gdpr_requests 
WHERE status = 'processing' AND created_at < NOW() - INTERVAL '1 hour';

-- Pulisci richieste GDPR fallite per permettere nuovi tentativi
DELETE FROM public.gdpr_requests 
WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 minutes';