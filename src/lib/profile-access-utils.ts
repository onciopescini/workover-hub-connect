import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

export interface ProfileAccessResult {
  has_access: boolean;
  access_reason: string;
  message: string;
}

// Type guard per validare la struttura della risposta RPC
function isValidProfileAccessResponse(data: unknown): data is ProfileAccessResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  
  const obj = data as any;
  return (
    'has_access' in obj &&
    'access_reason' in obj &&
    'message' in obj &&
    typeof obj.has_access === 'boolean' &&
    typeof obj.access_reason === 'string' &&
    typeof obj.message === 'string'
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

// Fetch profilo utente con controllo accesso
export const fetchUserProfileWithAccess = async (userId: string) => {
  try {
    // Prima verifica l'accesso
    const accessResult = await checkProfileAccess(userId);
    
    if (!accessResult.has_access) {
      return {
        profile: null,
        accessResult,
        hasAccess: false
      };
    }

    // Se ha accesso, recupera il profilo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      sreLogger.error('Error fetching profile', {
        component: 'ProfileAccessUtils',
        action: 'fetchUserProfileWithAccess',
        userId
      }, profileError as Error);
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
      return 'full';
    case 'suggestion_exists':
      return 'limited';
    default:
      return 'none';
  }
};

// Filtra dati profilo in base al livello di accesso
export const filterProfileData = (profile: Record<string, any>, visibilityLevel: 'full' | 'limited' | 'none') => {
  if (visibilityLevel === 'none') {
    return null;
  }

  const baseData = {
    id: profile['id'],
    first_name: profile['first_name'],
    last_name: profile['last_name'],
    profile_photo_url: profile['profile_photo_url'],
    bio: profile['bio'],
    job_title: profile['job_title'],
    profession: profile['profession'],
    location: profile['location']
  };

  if (visibilityLevel === 'limited') {
    return baseData;
  }

  // Full access - restituisce tutti i dati
  return {
    ...baseData,
    skills: profile['skills'],
    interests: profile['interests'],
    competencies: profile['competencies'],
    industries: profile['industries'],
    website: profile['website'],
    linkedin_url: profile['linkedin_url'],
    twitter_url: profile['twitter_url'],
    instagram_url: profile['instagram_url'],
    facebook_url: profile['facebook_url'],
    youtube_url: profile['youtube_url'],
    github_url: profile['github_url'],
    created_at: profile['created_at']
  };
};
