
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin, Briefcase, Heart } from "lucide-react";

const Profile = () => {
  const { authState } = useAuth();

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

  return (
    <AppLayout title="Profilo" subtitle="Il tuo profilo personale">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={authState.profile?.profile_photo_url || ""} />
                <AvatarFallback className="text-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{getUserFullName()}</CardTitle>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary">
                    {authState.profile.role === "host" ? "Host" : 
                     authState.profile.role === "admin" ? "Admin" : "Coworker"}
                  </Badge>
                  {authState.profile.nickname && (
                    <span className="text-sm text-gray-600">
                      @{authState.profile.nickname}
                    </span>
                  )}
                </div>
              </div>
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

            {/* LinkedIn */}
            {authState.profile.linkedin_url && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Collegamenti</h3>
                <a 
                  href={authState.profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Profilo LinkedIn
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
