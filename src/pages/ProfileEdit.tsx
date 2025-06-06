
import React from "react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { SocialMediaSection } from "@/components/profile/SocialMediaSection";
import { TaxInformationSection } from "@/components/profile/TaxInformationSection";
import { Separator } from "@/components/ui/separator";

const ProfileEdit = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Modifica Profilo
        </h1>
        <p className="text-gray-600">
          Aggiorna le tue informazioni personali e professionali
        </p>
      </div>
      
      {/* Basic Profile Information */}
      <ProfileEditForm />
      
      <Separator />
      
      {/* Social Media Links */}
      <SocialMediaSection />
      
      <Separator />
      
      {/* Tax Information for Hosts */}
      <TaxInformationSection />
    </div>
  );
};

export default ProfileEdit;
