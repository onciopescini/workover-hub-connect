
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  Linkedin, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Github,
  ExternalLink,
  Plus
} from "lucide-react";
import { Profile } from "@/types/auth";
import { useNavigate } from "react-router-dom";

interface SocialLinksSectionProps {
  profile: Profile;
}

export function SocialLinksSection({ profile }: SocialLinksSectionProps) {
  const navigate = useNavigate();

  const socialLinks = [
    { url: profile.website, icon: Globe, label: 'Website', platform: 'website' },
    { url: profile.linkedin_url, icon: Linkedin, label: 'LinkedIn', platform: 'linkedin' },
    { url: profile.instagram_url, icon: Instagram, label: 'Instagram', platform: 'instagram' },
    { url: profile.twitter_url, icon: Twitter, label: 'Twitter', platform: 'twitter' },
    { url: profile.facebook_url, icon: Facebook, label: 'Facebook', platform: 'facebook' },
    { url: profile.youtube_url, icon: Youtube, label: 'YouTube', platform: 'youtube' },
    { url: profile.github_url, icon: Github, label: 'GitHub', platform: 'github' },
  ].filter(link => link.url);

  const hasNoLinks = socialLinks.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Collegamenti Social
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/profile/edit')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hasNoLinks ? (
          <div className="text-center py-6">
            <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              Nessun collegamento social aggiunto
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/profile/edit')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Collegamenti
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {socialLinks.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-sm">{link.label}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(link.url ?? '', '_blank')}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
