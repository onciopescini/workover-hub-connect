import { useState } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';
import { profileEditSchema } from '@/schemas/profileEditSchema';
import { z } from 'zod';

export interface ProfileFormData {
  // Basic Info
  first_name: string;
  last_name: string;
  nickname: string;
  profile_photo_url: string;
  phone: string;
  bio: string;
  location: string;
  
  // Professional Info
  job_title: string;
  profession: string;
  job_type: string;
  work_style: string;
  skills: string;
  interests: string;
  
  // Social Links
  website: string;
  portfolio_url: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  github_url: string;
  
  // Collaboration
  collaboration_availability: string;
  collaboration_types: string[];
  preferred_work_mode: string;
  collaboration_description: string;
  
  // Settings
  networking_enabled: boolean;
}

export const useProfileForm = () => {
  const { authState, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ProfileFormData>({
    // Basic Info
    first_name: authState.profile?.first_name || '',
    last_name: authState.profile?.last_name || '',
    nickname: authState.profile?.nickname || '',
    profile_photo_url: authState.profile?.profile_photo_url || '',
    phone: authState.profile?.phone || '',
    bio: authState.profile?.bio || '',
    location: authState.profile?.location || '',
    
    // Professional Info
    job_title: authState.profile?.job_title || '',
    profession: authState.profile?.profession || '',
    job_type: authState.profile?.job_type || '',
    work_style: authState.profile?.work_style || '',
    skills: authState.profile?.skills || '',
    interests: authState.profile?.interests || '',
    
    // Social Links
    website: authState.profile?.website || '',
    portfolio_url: authState.profile?.portfolio_url || '',
    linkedin_url: authState.profile?.linkedin_url || '',
    twitter_url: authState.profile?.twitter_url || '',
    instagram_url: authState.profile?.instagram_url || '',
    facebook_url: authState.profile?.facebook_url || '',
    youtube_url: authState.profile?.youtube_url || '',
    github_url: authState.profile?.github_url || '',
    
    // Collaboration
    collaboration_availability: authState.profile?.collaboration_availability ?? 'not_available',
    collaboration_types: authState.profile?.collaboration_types ?? [],
    preferred_work_mode: authState.profile?.preferred_work_mode ?? 'flessibile',
    collaboration_description: authState.profile?.collaboration_description ?? '',
    
    // Settings
    networking_enabled: authState.profile?.networking_enabled ?? true,
  });

  // Validazione real-time per campo singolo
  const validateField = (field: keyof ProfileFormData, value: any) => {
    try {
      const fieldSchema = profileEditSchema.shape[field as keyof typeof profileEditSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        if (firstError?.message) {
          setErrors(prev => ({
            ...prev,
            [field]: firstError.message
          }));
        }
      }
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validazione completa pre-submit
      const validatedData = profileEditSchema.parse(formData);
      
      // Converti undefined in null per compatibilità con il database
      const dataToSubmit = Object.fromEntries(
        Object.entries(validatedData).map(([key, value]) => [key, value === undefined ? null : value])
      ) as any;
      
      await updateProfile(dataToSubmit);
      toast.success("Profilo aggiornato con successo");
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Correggi gli errori nel modulo prima di salvare");
      } else {
        sreLogger.error('Error updating profile', {}, error as Error);
        toast.error("Errore nell'aggiornamento del profilo");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = () => {
    const firstInitial = formData.first_name?.charAt(0) || '';
    const lastInitial = formData.last_name?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
  };

  return {
    formData,
    errors,
    isLoading,
    handleInputChange,
    handleSubmit,
    getUserInitials,
    authState
  };
};
