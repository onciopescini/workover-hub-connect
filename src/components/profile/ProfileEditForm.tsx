import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditFormProps {
  onProfileUpdate?: () => void;
}

export function ProfileEditForm({ onProfileUpdate }: ProfileEditFormProps) {
  const { authState, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(authState.profile?.first_name || "");
  const [lastName, setLastName] = useState(authState.profile?.last_name || "");
  const [bio, setBio] = useState(authState.profile?.bio || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(authState.profile?.profile_photo_url || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authState.profile) {
      setFirstName(authState.profile.first_name || "");
      setLastName(authState.profile.last_name || "");
      setBio(authState.profile.bio || "");
      setProfilePhotoUrl(authState.profile.profile_photo_url || "");
    }
  }, [authState.profile]);

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        bio: bio,
        profile_photo_url: profilePhotoUrl,
      });
      setIsEditing(false);
      toast.success("Profile updated successfully!");
      onProfileUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFirstName(authState.profile?.first_name || "");
    setLastName(authState.profile?.last_name || "");
    setBio(authState.profile?.bio || "");
    setProfilePhotoUrl(authState.profile?.profile_photo_url || "");
  };

  const getUserInitials = () => {
    const firstNameInitial = authState.profile?.first_name?.charAt(0) || "";
    const lastNameInitial = authState.profile?.last_name?.charAt(0) || "";
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || "U";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          Informazioni Profilo
        </CardTitle>
        {isEditing ? (
          <div className="space-x-2">
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Annulla
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Edit className="mr-2 h-4 w-4 animate-spin" />
                  Aggiornamento...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salva
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Modifica
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profilePhotoUrl} alt="Profile" />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="grid w-full gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              placeholder="Il tuo nome"
              value={firstName}
              disabled={!isEditing}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="lastName">Cognome</Label>
            <Input
              id="lastName"
              placeholder="Il tuo cognome"
              value={lastName}
              disabled={!isEditing}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              placeholder="A breve descrizione di te"
              value={bio}
              disabled={!isEditing}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="profilePhotoUrl">URL Foto Profilo</Label>
            <Input
              id="profilePhotoUrl"
              placeholder="URL della tua foto profilo"
              value={profilePhotoUrl}
              disabled={!isEditing}
              onChange={(e) => setProfilePhotoUrl(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
