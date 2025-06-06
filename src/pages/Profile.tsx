
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Phone, MapPin, Calendar } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  if (!authState.profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-600">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  const { profile, user } = authState;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Il Mio Profilo
          </h1>
          <p className="text-gray-600">
            Visualizza le tue informazioni personali e professionali
          </p>
        </div>
        <Button onClick={() => navigate('/profile/edit')} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Modifica Profilo
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.profile_photo_url || ""} />
              <AvatarFallback className="text-lg">
                {profile.first_name?.charAt(0) || ""}{profile.last_name?.charAt(0) || ""}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">
                {profile.first_name} {profile.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={profile.role === 'host' ? 'default' : 'secondary'}>
                  {profile.role === 'host' ? 'Host' : profile.role === 'admin' ? 'Admin' : 'Coworker'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900">{user?.email}</span>
              </div>
              
              {profile.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">{profile.phone}</span>
                </div>
              )}
              
              {profile.city && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">{profile.city}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900">
                  Membro da {new Date(profile.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Biografia</h3>
                  <p className="text-gray-600">{profile.bio}</p>
                </div>
              )}
              
              {profile.profession && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Professione</h3>
                  <p className="text-gray-600">{profile.profession}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
