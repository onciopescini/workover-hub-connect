
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin, Briefcase, Heart, Edit, LinkIcon } from "lucide-react";
import { useState } from "react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";

const Profile = () => {
  const { authState } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!authState.profile) {
    return (
      <AppLayout title="Profilo" subtitle="Il tuo profilo personale">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <p>Caricamento profilo...</p>
        </div>
      </AppLayout>
    );
  }

  const getUserInitials = () => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getUserFullName = () => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Utente";
  };

  const getJobTypeLabel = (type: string) => {
    const labels = {
      'aziendale': 'Aziendale',
      'freelance': 'Freelance',
      'studente': 'Studente'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getWorkStyleLabel = (style: string) => {
    const labels = {
      'silenzioso': 'Silenzioso',
      'collaborativo': 'Collaborativo',
      'flessibile': 'Flessibile',
      'strutturato': 'Strutturato',
      'creativo': 'Creativo'
    };
    return labels[style as keyof typeof labels] || style;
  };

  if (isEditing) {
    return (
      <AppLayout title="Modifica Profilo" subtitle="Aggiorna le tue informazioni">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              ← Torna al Profilo
            </Button>
          </div>
          <ProfileEditForm />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Profilo" subtitle="Il tuo profilo personale">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={authState.profile?.profile_photo_url || ""} />
                  <AvatarFallback className="text-xl">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{getUserFullName()}</CardTitle>
                  {authState.profile.job_title && (
                    <p className="text-lg text-gray-600 mt-1">{authState.profile.job_title}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary">
                      {authState.profile.role === "host" ? "Host" : 
                       authState.profile.role === "admin" ? "Admin" : "Coworker"}
                    </Badge>
                    {authState.profile.job_type && (
                      <Badge variant="outline">
                        {getJobTypeLabel(authState.profile.job_type)}
                      </Badge>
                    )}
                    {authState.profile.work_style && (
                      <Badge variant="outline">
                        {getWorkStyleLabel(authState.profile.work_style)}
                      </Badge>
                    )}
                    {authState.profile.nickname && (
                      <span className="text-sm text-gray-600">
                        @{authState.profile.nickname}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Modifica Profilo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informazioni Personali
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm">{authState.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data di registrazione</p>
                  <p className="text-sm">
                    {authState.profile.created_at ? 
                      new Date(authState.profile.created_at).toLocaleDateString('it-IT') : 
                      'Non disponibile'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Info */}
            {(authState.profile.job_title || authState.profile.job_type || authState.profile.work_style) && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Informazioni Professionali
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {authState.profile.job_title && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Titolo di Lavoro</p>
                      <p className="text-sm">{authState.profile.job_title}</p>
                    </div>
                  )}
                  {authState.profile.job_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo di Lavoro</p>
                      <p className="text-sm">{getJobTypeLabel(authState.profile.job_type)}</p>
                    </div>
                  )}
                  {authState.profile.work_style && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">Stile di Lavoro</p>
                      <p className="text-sm">{getWorkStyleLabel(authState.profile.work_style)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {authState.profile.location && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Posizione
                </h3>
                <p className="text-sm">{authState.profile.location}</p>
              </div>
            )}

            {/* Skills - Only for coworkers */}
            {authState.profile.role === "coworker" && authState.profile.skills && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Competenze
                </h3>
                <p className="text-sm">{authState.profile.skills}</p>
              </div>
            )}

            {/* Interests - Only for coworkers */}
            {authState.profile.role === "coworker" && authState.profile.interests && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Interessi
                </h3>
                <p className="text-sm">{authState.profile.interests}</p>
              </div>
            )}

            {/* Bio */}
            {authState.profile.bio && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Bio</h3>
                <p className="text-sm">{authState.profile.bio}</p>
              </div>
            )}

            {/* Links */}
            {(authState.profile.linkedin_url || authState.profile.website) && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2" />
                  Collegamenti
                </h3>
                <div className="space-y-2">
                  {authState.profile.linkedin_url && (
                    <a 
                      href={authState.profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm block"
                    >
                      Profilo LinkedIn
                    </a>
                  )}
                  {authState.profile.website && (
                    <a 
                      href={authState.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm block"
                    >
                      Sito Web
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
