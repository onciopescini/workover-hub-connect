
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Globe, 
  Linkedin, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Github
} from "lucide-react";
import { ProfileFormData } from "@/hooks/useProfileForm";

interface SocialLinksTabProps {
  formData: ProfileFormData;
  handleInputChange: (field: keyof ProfileFormData, value: string | boolean) => void;
  errors?: Record<string, string>;
}

export const SocialLinksTab: React.FC<SocialLinksTabProps> = ({
  formData,
  handleInputChange,
  errors = {}
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Collegamenti Social
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Sito Web
            </Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://tuosito.com"
              className={errors['website'] ? 'border-destructive' : ''}
            />
            {errors['website'] && (
              <p className="text-sm text-destructive">{errors['website']}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio_url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Portfolio URL
            </Label>
            <Input
              id="portfolio_url"
              value={formData.portfolio_url}
              onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
              placeholder="https://tuoportfolio.com"
              className={errors['portfolio_url'] ? 'border-destructive' : ''}
            />
            {errors['portfolio_url'] && (
              <p className="text-sm text-destructive">{errors['portfolio_url']}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </Label>
            <Input
              id="linkedin_url"
              value={formData.linkedin_url}
              onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/tuoprofilo"
              className={errors['linkedin_url'] ? 'border-destructive' : ''}
            />
            {errors['linkedin_url'] && (
              <p className="text-sm text-destructive">{errors['linkedin_url']}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter_url" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter
              </Label>
              <Input
                id="twitter_url"
                value={formData.twitter_url}
                onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                placeholder="https://twitter.com/tuousername"
                className={errors['twitter_url'] ? 'border-destructive' : ''}
              />
              {errors['twitter_url'] && (
                <p className="text-sm text-destructive">{errors['twitter_url']}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_url" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <Input
                id="instagram_url"
                value={formData.instagram_url}
                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                placeholder="https://instagram.com/tuousername"
                className={errors['instagram_url'] ? 'border-destructive' : ''}
              />
              {errors['instagram_url'] && (
                <p className="text-sm text-destructive">{errors['instagram_url']}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook_url" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </Label>
              <Input
                id="facebook_url"
                value={formData.facebook_url}
                onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                placeholder="https://facebook.com/tuoprofilo"
                className={errors['facebook_url'] ? 'border-destructive' : ''}
              />
              {errors['facebook_url'] && (
                <p className="text-sm text-destructive">{errors['facebook_url']}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_url" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube
              </Label>
              <Input
                id="youtube_url"
                value={formData.youtube_url}
                onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                placeholder="https://youtube.com/c/tuocanale"
                className={errors['youtube_url'] ? 'border-destructive' : ''}
              />
              {errors['youtube_url'] && (
                <p className="text-sm text-destructive">{errors['youtube_url']}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="github_url" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub
            </Label>
            <Input
              id="github_url"
              value={formData.github_url}
              onChange={(e) => handleInputChange('github_url', e.target.value)}
              placeholder="https://github.com/tuousername"
              className={errors['github_url'] ? 'border-destructive' : ''}
            />
            {errors['github_url'] && (
              <p className="text-sm text-destructive">{errors['github_url']}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
