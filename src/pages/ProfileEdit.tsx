
import React from 'react';
import ProfileEditForm from "@/components/profile/ProfileEditForm";

const ProfileEdit = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modifica Profilo</h1>
          <p className="text-gray-600">
            Aggiorna le tue informazioni personali e professionali
          </p>
        </div>

        <ProfileEditForm />
      </div>
    </div>
  );
};

export default ProfileEdit;
