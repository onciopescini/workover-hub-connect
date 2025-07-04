import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Linkedin, 
  Github,
  Globe,
  ExternalLink,
  Edit2,
  Save,
  X
} from "lucide-react";

interface SocialLinks {
  website?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  github?: string;
}

export function SocialMediaSection() {
  const { error } = useLogger({ context: 'SocialMediaSection' });
  const { authState, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    website: authState.profile?.website || '',
    linkedin: authState.profile?.linkedin_url || '',
    instagram: authState.profile?.instagram_url || '',
    twitter: authState.profile?.twitter_url || '',
    facebook: authState.profile?.facebook_url || '',
    youtube: authState.profile?.youtube_url || '',
    github: authState.profile?.github_url || '',
  });

  const socialPlatforms = [
    { key: 'website', label: 'Sito Web', icon: Globe, placeholder: 'https://tuosito.com' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/tuoprofilo' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/tuoprofilo' },
    { key: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://twitter.com/tuoprofilo' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/tuoprofilo' },
    { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@tuocanale' },
    { key: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/tuoprofilo' },
  ];

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // URL vuoto è valido
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (platform: string, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const handleSave = async () => {
    if (!authState.user) return;

    // Valida tutti gli URL
    const invalidUrls = Object.entries(socialLinks)
      .filter(([_, url]) => url && !validateUrl(url))
      .map(([platform, _]) => platform);

    if (invalidUrls.length > 0) {
      toast.error("Alcuni URL non sono validi. Controlla i collegamenti inseriti.");
      return;
    }

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          website: socialLinks.website || null,
          linkedin_url: socialLinks.linkedin || null,
          instagram_url: socialLinks.instagram || null,
          twitter_url: socialLinks.twitter || null,
          facebook_url: socialLinks.facebook || null,
          youtube_url: socialLinks.youtube || null,
          github_url: socialLinks.github || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', authState.user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      toast.success("Collegamenti social aggiornati con successo!");
      
    } catch (updateError) {
      error("Error updating social links", updateError as Error, { 
        operation: 'update_social_links',
        platformCount: Object.keys(socialLinks).filter(key => socialLinks[key as keyof SocialLinks]).length
      });
      toast.error("Errore nell'aggiornamento dei collegamenti social");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSocialLinks({
      website: authState.profile?.website || '',
      linkedin: authState.profile?.linkedin_url || '',
      instagram: authState.profile?.instagram_url || '',
      twitter: authState.profile?.twitter_url || '',
      facebook: authState.profile?.facebook_url || '',
      youtube: authState.profile?.youtube_url || '',
      github: authState.profile?.github_url || '',
    });
    setIsEditing(false);
  };

  const hasAnyLinks = Object.values(socialLinks).some(link => link);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Collegamenti Social
          </CardTitle>
          
          {!isEditing ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salva'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!hasAnyLinks && !isEditing ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun collegamento social
            </h3>
            <p className="text-gray-600 mb-4">
              Aggiungi i tuoi profili social per connetterti meglio con la community
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Aggiungi Collegamenti
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {socialPlatforms.map((platform, index) => {
              const IconComponent = platform.icon;
              const value = socialLinks[platform.key as keyof SocialLinks] || '';
              
              return (
                <div key={platform.key}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor={platform.key} className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        {platform.label}
                      </Label>
                      <Input
                        id={platform.key}
                        type="url"
                        placeholder={platform.placeholder}
                        value={value}
                        onChange={(e) => handleInputChange(platform.key, e.target.value)}
                        className={!validateUrl(value) && value ? 'border-red-500' : ''}
                      />
                      {!validateUrl(value) && value && (
                        <p className="text-sm text-red-500">URL non valido</p>
                      )}
                    </div>
                  ) : value ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">{platform.label}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(value, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : null}
                  
                  {index < socialPlatforms.length - 1 && (value || isEditing) && (
                    <Separator className="my-4" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
