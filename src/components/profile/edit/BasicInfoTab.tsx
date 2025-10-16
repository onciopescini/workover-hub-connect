
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Camera, Phone, MapPin } from "lucide-react";
import { ProfileFormData } from "@/hooks/useProfileForm";

interface BasicInfoTabProps {
  formData: ProfileFormData;
  handleInputChange: (field: keyof ProfileFormData, value: string | boolean) => void;
  errors?: Record<string, string>;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  handleInputChange,
  errors = {}
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informazioni di Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Nome *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className={errors['first_name'] ? 'border-destructive' : ''}
              required
            />
            {errors['first_name'] && (
              <p className="text-sm text-destructive">{errors['first_name']}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Cognome *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className={errors['last_name'] ? 'border-destructive' : ''}
              required
            />
            {errors['last_name'] && (
              <p className="text-sm text-destructive">{errors['last_name']}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            value={formData.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            placeholder="Nome che vuoi mostrare pubblicamente"
            className={errors['nickname'] ? 'border-destructive' : ''}
          />
          {errors['nickname'] && (
            <p className="text-sm text-destructive">{errors['nickname']}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile_photo_url">URL Foto Profilo</Label>
          <div className="flex gap-2">
            <Input
              id="profile_photo_url"
              value={formData.profile_photo_url}
              onChange={(e) => handleInputChange('profile_photo_url', e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className={errors['profile_photo_url'] ? 'border-destructive' : ''}
            />
            <Button type="button" variant="outline" size="icon">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          {errors['profile_photo_url'] && (
            <p className="text-sm text-destructive">{errors['profile_photo_url']}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <div className="flex flex-col gap-1">
              <div className="flex">
                <Phone className="h-5 w-5 text-gray-400 mt-2.5 mr-2" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+39 123 456 7890"
                  className={errors['phone'] ? 'border-destructive' : ''}
                />
              </div>
              {errors['phone'] && (
                <p className="text-sm text-destructive">{errors['phone']}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Località</Label>
            <div className="flex flex-col gap-1">
              <div className="flex">
                <MapPin className="h-5 w-5 text-gray-400 mt-2.5 mr-2" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Milano, Italia"
                  className={errors['location'] ? 'border-destructive' : ''}
                />
              </div>
              {errors['location'] && (
                <p className="text-sm text-destructive">{errors['location']}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Biografia</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            placeholder="Racconta qualcosa di te..."
            className={errors['bio'] ? 'border-destructive' : ''}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{formData.bio?.length || 0}/500 caratteri</p>
            {errors['bio'] && (
              <p className="text-sm text-destructive">{errors['bio']}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
