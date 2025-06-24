import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Check, User, Mail, Phone, Briefcase, GraduationCap, Award, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditFormProps {
  onProfileUpdated?: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ onProfileUpdated }) => {
  const { authState, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authState.profile) {
      setFirstName(authState.profile.first_name || '');
      setLastName(authState.profile.last_name || '');
      setEmail(authState.user?.email || '');
      setPhone(authState.profile.phone || '');
      setCity(authState.profile.city || '');
      setProfession(authState.profile.profession || '');
      setProfilePhotoUrl(authState.profile.profile_photo_url || '');
    }
  }, [authState.profile, authState.user?.email]);

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        city: city,
        profession: profession,
        profile_photo_url: profilePhotoUrl,
      });
      setIsEditing(false);
      toast.success("Profile updated successfully!");
      onProfileUpdated?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFirstName(authState.profile?.first_name || '');
    setLastName(authState.profile?.last_name || '');
    setEmail(authState.user?.email || '');
    setPhone(authState.profile?.phone || '');
    setCity(authState.profile?.city || '');
    setProfession(authState.profile?.profession || '');
    setProfilePhotoUrl(authState.profile?.profile_photo_url || '');
  };

  const getUserInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Dettagli Profilo
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          ) : (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelEdit}
                className="mr-2"
                disabled={isLoading}
              >
                Annulla
              </Button>
              <Button
                onClick={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 4V2a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1zm5.37 2.93a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 0 1-1.414 0l-1.414-1.414a1 1 0 0 1 1.414-1.414l1.414 1.414a1 1 0 0 1 1.414 0l1.414-1.414a1 1 0 0 1 0-1.414zM4 12a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1zm15.07 5.07a1 1 0 0 1 1.414 0l1.414 1.414a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 0 1-1.414 0l-1.414-1.414a1 1 0 0 1 0-1.414l1.414-1.414zM12 20v2a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1zm-5.37-2.93a1 1 0 0 1-1.414 0l-1.414-1.414a1 1 0 0 1 0-1.414l1.414-1.414a1 1 0 0 1 1.414 0l1.414 1.414a1 1 0 0 1 0 1.414l-1.414 1.414zM20 12a1 1 0 0 1-1 1h-2a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1zM4.93 6.93a1 1 0 0 1 1.414 0l1.414 1.414a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 0 1-1.414 0l-1.414-1.414a1 1 0 0 1 0-1.414l1.414-1.414z"></path>
                    </svg>
                    Salva...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salva
                  </>
                )}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profilePhotoUrl} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          {isEditing && (
            <div>
              <Label htmlFor="profilePhotoUrl">URL Foto Profilo</Label>
              <Input
                id="profilePhotoUrl"
                type="text"
                value={profilePhotoUrl}
                onChange={(e) => setProfilePhotoUrl(e.target.value)}
              />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="firstName">Nome</Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Cognome</Label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefono</Label>
          <Input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="city">Città</Label>
          <Input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div>
          <Label htmlFor="profession">Professione</Label>
          <Input
            id="profession"
            type="text"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileEditForm;
