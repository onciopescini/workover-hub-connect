
import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { SocialMediaSection } from '@/components/profile/SocialMediaSection';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Edit, MapPin, Calendar, Mail, Phone } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const Profile = () => {
  const { profile, isLoading } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <AppLayout title="Profilo">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Profilo">
        <div className="text-center py-12">
          <p className="text-gray-500">Profilo non trovato</p>
        </div>
      </AppLayout>
    );
  }

  const handleEditComplete = () => {
    setIsEditing(false);
  };

  const getUserInitials = () => {
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'coworker':
        return 'Coworker';
      case 'host':
        return 'Host';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'coworker':
        return 'bg-blue-100 text-blue-800';
      case 'host':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isEditing) {
    return (
      <AppLayout title="Modifica Profilo">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <ProfileEditForm 
            profile={profile} 
            onEditComplete={handleEditComplete}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Il tuo Profilo">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.profile_photo_url || ""} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <Badge className={getRoleBadgeColor(profile.role)}>
                    {getRoleLabel(profile.role)}
                  </Badge>
                  {profile.bio && (
                    <p className="text-gray-600 mt-2">{profile.bio}</p>
                  )}
                </div>
              </div>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informazioni Personali */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Personali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {(profile.city || profile.country) && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Iscritto il {new Date(profile.created_at).toLocaleDateString('it-IT')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Interessi */}
          {profile.interests && profile.interests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Interessi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Social Media */}
        <SocialMediaSection profile={profile} />
      </div>
    </AppLayout>
  );
};

export default Profile;
