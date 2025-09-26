-- Reset dell'utente alfonso.pescini@mail.polimi.it (ID: 30a0eddc-64e1-44a1-8810-b6e088f8ac3d)
-- Elimina lo spazio "spazio punta ala" che non è pubblicato e non ha prenotazioni

-- 1. Elimina eventuali dati correlati allo spazio (availability, checklists, etc.)
DELETE FROM public.availability 
WHERE space_id = '60ae6abf-0657-45d9-a21c-a9b33433892c';

DELETE FROM public.checklists 
WHERE space_id = '60ae6abf-0657-45d9-a21c-a9b33433892c';

-- 2. Elimina lo spazio
DELETE FROM public.spaces 
WHERE id = '60ae6abf-0657-45d9-a21c-a9b33433892c' 
AND host_id = '30a0eddc-64e1-44a1-8810-b6e088f8ac3d';

-- 3. Elimina il profilo dall'utente per permettere il re-onboarding
DELETE FROM public.profiles 
WHERE id = '30a0eddc-64e1-44a1-8810-b6e088f8ac3d';