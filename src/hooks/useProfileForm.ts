
import { useState } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";

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
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  github_url: string;
  
  // Settings
  networking_enabled: boolean;
}

export const useProfileForm = () => {
  const { authState, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
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
    linkedin_url: authState.profile?.linkedin_url || '',
    twitter_url: authState.profile?.twitter_url || '',
    instagram_url: authState.profile?.instagram_url || '',
    facebook_url: authState.profile?.facebook_url || '',
    youtube_url: authState.profile?.youtube_url || '',
    github_url: authState.profile?.github_url || '',
    
    // Settings
    networking_enabled: authState.profile?.networking_enabled ?? true,
  });

  const handleInputChange = (field: keyof ProfileFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(formData);
      toast.success("Profilo aggiornato con successo");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Errore nell'aggiornamento del profilo");
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
    isLoading,
    handleInputChange,
    handleSubmit,
    getUserInitials,
    authState
  };
};
