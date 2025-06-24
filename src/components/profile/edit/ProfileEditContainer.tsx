
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, Globe, CreditCard, Save } from "lucide-react";
import { useProfileForm } from "@/hooks/useProfileForm";
import { BasicInfoTab } from "./BasicInfoTab";
import { ProfessionalInfoTab } from "./ProfessionalInfoTab";
import { SocialLinksTab } from "./SocialLinksTab";
import { SettingsTab } from "./SettingsTab";

export const ProfileEditContainer = () => {
  const {
    formData,
    isLoading,
    handleInputChange,
    handleSubmit,
    getUserInitials,
    authState
  } = useProfileForm();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Profile Photo */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.profile_photo_url} />
              <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">
                {formData.first_name} {formData.last_name}
              </CardTitle>
              <p className="text-gray-600">{formData.job_title || 'Completa il tuo profilo'}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Base
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professionale
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Social
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Impostazioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoTab 
              formData={formData}
              handleInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="professional">
            <ProfessionalInfoTab 
              formData={formData}
              handleInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="social">
            <SocialLinksTab 
              formData={formData}
              handleInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab 
              formData={formData}
              handleInputChange={handleInputChange}
              authState={authState}
            />
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
