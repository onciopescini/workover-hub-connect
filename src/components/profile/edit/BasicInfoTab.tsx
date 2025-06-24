
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
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  handleInputChange
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
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Cognome *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            value={formData.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            placeholder="Nome che vuoi mostrare pubblicamente"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile_photo_url">URL Foto Profilo</Label>
          <div className="flex gap-2">
            <Input
              id="profile_photo_url"
              value={formData.profile_photo_url}
              onChange={(e) => handleInputChange('profile_photo_url', e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
            <Button type="button" variant="outline" size="icon">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <div className="flex">
              <Phone className="h-5 w-5 text-gray-400 mt-2.5 mr-2" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+39 123 456 7890"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Località</Label>
            <div className="flex">
              <MapPin className="h-5 w-5 text-gray-400 mt-2.5 mr-2" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Milano, Italia"
              />
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
          />
          <p className="text-sm text-gray-500">{formData.bio?.length || 0}/500 caratteri</p>
        </div>
      </CardContent>
    </Card>
  );
};
