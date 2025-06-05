
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { SocialMediaSection } from "@/components/profile/SocialMediaSection";
import { TaxInformationSection } from "@/components/profile/TaxInformationSection";
import { Separator } from "@/components/ui/separator";

const Profile = () => {
  return (
    <AppLayout
      title="Il Mio Profilo"
      subtitle="Gestisci le tue informazioni personali e professionali"
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Basic Profile Information */}
        <ProfileEditForm />
        
        <Separator />
        
        {/* Social Media Links */}
        <SocialMediaSection />
        
        <Separator />
        
        {/* Tax Information for Hosts */}
        <TaxInformationSection />
      </div>
    </AppLayout>
  );
};

export default Profile;
