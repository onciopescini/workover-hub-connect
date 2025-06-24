
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProfileAccessResult {
  has_access: boolean;
  access_reason: string;
  message: string;
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
      console.error('Error checking profile access:', error);
      return {
        has_access: false,
        access_reason: 'error',
        message: 'Errore nella verifica dell\'accesso'
      };
    }

    // Fix per il tipo: casting esplicito con validazione
    if (data && typeof data === 'object' && 
        'has_access' in data && 'access_reason' in data && 'message' in data) {
      return data as ProfileAccessResult;
    }

    return {
      has_access: false,
      access_reason: 'error',
      message: 'Formato risposta non valido'
    };
  } catch (error) {
    console.error('Unexpected error checking profile access:', error);
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
      console.error('Error fetching profile:', profileError);
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
    console.error('Error in fetchUserProfileWithAccess:', error);
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
export const filterProfileData = (profile: any, visibilityLevel: 'full' | 'limited' | 'none') => {
  if (visibilityLevel === 'none') {
    return null;
  }

  const baseData = {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    profile_photo_url: profile.profile_photo_url,
    bio: profile.bio,
    job_title: profile.job_title,
    profession: profile.profession,
    location: profile.location
  };

  if (visibilityLevel === 'limited') {
    return baseData;
  }

  // Full access - restituisce tutti i dati
  return {
    ...baseData,
    skills: profile.skills,
    interests: profile.interests,
    competencies: profile.competencies,
    industries: profile.industries,
    website: profile.website,
    linkedin_url: profile.linkedin_url,
    twitter_url: profile.twitter_url,
    instagram_url: profile.instagram_url,
    facebook_url: profile.facebook_url,
    youtube_url: profile.youtube_url,
    github_url: profile.github_url,
    created_at: profile.created_at
  };
};
