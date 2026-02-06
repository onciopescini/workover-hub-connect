import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

export interface ProfileAccessResult {
  has_access: boolean;
  access_reason: string;
  message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Type guard per validare la struttura della risposta RPC
// AGGRESSIVE FIX: Use bracket notation for index signature access
function isValidProfileAccessResponse(data: unknown): data is ProfileAccessResult {
  if (!isRecord(data) || Array.isArray(data)) return false;

  const obj = data;
  return (
    'has_access' in obj &&
    'access_reason' in obj &&
    'message' in obj &&
    typeof obj['has_access'] === 'boolean' &&
    typeof obj['access_reason'] === 'string' &&
    typeof obj['message'] === 'string'
  );
}

// Verifica accesso al profilo tramite funzione database
export const checkProfileAccess = async (profileId: string): Promise<ProfileAccessResult> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return {
        has_access: false,
        access_reason: 'not_authenticated',
        message: 'Devi essere autenticato per accedere ai profili'
      };
    }

    const { data, error } = await supabase.rpc('check_profile_access', {
      viewer_id: user.user.id,
      profile_id: profileId
    });

    if (error) {
      sreLogger.error('Error checking profile access', {
        component: 'ProfileAccessUtils',
        action: 'checkProfileAccess',
        viewerId: user.user.id,
        profileId
      }, error as Error);
      return {
        has_access: false,
        access_reason: 'error',
        message: 'Errore nella verifica dell\'accesso'
      };
    }

    // Cast sicuro e validazione del tipo
    const responseData = data as unknown;
    if (isValidProfileAccessResponse(responseData)) {
      return responseData;
    }

    sreLogger.error('Invalid response format from check_profile_access', {
      component: 'ProfileAccessUtils',
      action: 'checkProfileAccess',
      profileId,
      data
    });
    return {
      has_access: false,
      access_reason: 'error',
      message: 'Formato risposta non valido'
    };
  } catch (error) {
    sreLogger.error('Unexpected error checking profile access', {
      component: 'ProfileAccessUtils',
      action: 'checkProfileAccess',
      profileId
    }, error as Error);
    return {
      has_access: false,
      access_reason: 'error',
      message: 'Errore imprevisto nella verifica dell\'accesso'
    };
  }
};

// Define safe public fields to select
const PUBLIC_PROFILE_FIELDS = [
  'id', 'first_name', 'last_name', 'avatar_url', 'bio',
  'job_title', 'company_name', 'linkedin_url', 'website_url', 'is_host'
].join(',');

// Fetch profilo utente con controllo accesso
export const fetchUserProfileWithAccess = async (userId: string) => {
  try {
    // Eseguiamo RPC e fetch in parallelo per efficienza e per gestire le priorità
    const [accessResult, profileResponse] = await Promise.all([
      checkProfileAccess(userId),
      supabase
        .from('profiles_public_view')
        .select(PUBLIC_PROFILE_FIELDS)
        .eq('id', userId)
        .maybeSingle()
    ]);

    const { data: profile, error: profileError } = profileResponse;

    // 1. PRIORITÀ 1: L'RPC dice che abbiamo accesso (es. own_profile, accepted_connection)
    // Usiamo il risultato RPC per mantenere la "reason" corretta (badge specifico)
    if (accessResult.has_access) {
      // Se il fetch è fallito o non ha trovato dati nonostante l'accesso, è un errore tecnico o inconsistenza
      if (profileError || !profile) {
        sreLogger.error('Error fetching profile after access grant', {
          component: 'ProfileAccessUtils',
          action: 'fetchUserProfileWithAccess',
          userId,
          error: profileError,
          missingProfile: !profile
        });
        return {
          profile: null,
          accessResult: {
            has_access: false,
            access_reason: 'profile_error',
            message: 'Errore nel recupero del profilo'
          },
          hasAccess: false
        };
      }

      return {
        profile,
        accessResult,
        hasAccess: true
      };
    }

    // 2. PRIORITÀ 2 (HOST FALLBACK): L'RPC dice NO, ma i dati ci sono (RLS permette)
    // Questo accade per gli Host che vedono i profili dei Guest (RPC networking_enabled=false, ma RLS policy=true)
    if (profile && !profileError) {
      return {
        profile,
        accessResult: {
          has_access: true,
          access_reason: 'host_access', // Usiamo la reason specifica per Host/Guest
          message: 'Accesso garantito dalla prenotazione'
        },
        hasAccess: true
      };
    }

    // 3. PRIORITÀ 3: Entrambi dicono NO (o fetch fallito e RPC fallito)
    return {
      profile: null,
      accessResult,
      hasAccess: false
    };
  } catch (error) {
    sreLogger.error('Error in fetchUserProfileWithAccess', {
      component: 'ProfileAccessUtils',
      action: 'fetchUserProfileWithAccess',
      userId
    }, error as Error);
    return {
      profile: null,
      accessResult: {
        has_access: false,
        access_reason: 'error',
        message: 'Errore nel recupero del profilo'
      },
      hasAccess: false
    };
  }
};

// Determina livello di visibilità dei dati del profilo
export const getProfileVisibilityLevel = (accessReason: string): 'full' | 'limited' | 'none' => {
  switch (accessReason) {
    case 'own_profile':
    case 'accepted_connection':
    case 'mutual_suggestion':
    case 'host_access': // Accesso garantito dalla presenza dei dati (es. Host)
      return 'full';
    case 'suggestion_exists':
      return 'limited';
    default:
      return 'none';
  }
};

// Filtra dati profilo in base al livello di accesso
export const filterProfileData = (profile: Record<string, unknown>, visibilityLevel: 'full' | 'limited' | 'none') => {
  if (visibilityLevel === 'none') {
    return null;
  }

  const baseData = {
    id: profile['id'],
    first_name: profile['first_name'],
    last_name: profile['last_name'],
    profile_photo_url: profile['avatar_url'] as string | null | undefined,
    bio: profile['bio'],
    job_title: profile['job_title'],
    company_name: profile['company_name']
  };

  if (visibilityLevel === 'limited') {
    return baseData;
  }

  // Full access - restituisce tutti i dati pubblici
  return {
    ...baseData,
    website: profile['website_url'],
    linkedin_url: profile['linkedin_url'],
    is_host: profile['is_host']
  };
};
