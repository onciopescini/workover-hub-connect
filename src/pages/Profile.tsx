
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Edit,
  Calendar,
  Globe
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

const Profile = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.isAuthenticated || !authState.profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Profilo non disponibile
          </h1>
          <p className="text-gray-600 mb-6">
            Devi effettuare l'accesso per visualizzare il profilo
          </p>
          <Button onClick={() => navigate('/login')}>
            Accedi
          </Button>
        </div>
      </div>
    );
  }

  const { profile } = authState;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Il Mio Profilo</h1>
        <Button onClick={() => navigate('/profile/edit')}>
          <Edit className="h-4 w-4 mr-2" />
          Modifica Profilo
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.profile_photo_url || ""} />
              <AvatarFallback className="text-xl">
                {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h2>
                <Badge variant={profile.role === 'admin' ? 'destructive' : 'default'}>
                  {profile.role === 'admin' ? 'Admin' : 
                   profile.role === 'host' ? 'Host' : 'Coworker'}
                </Badge>
              </div>
              
              {profile.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {authState.user?.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{authState.user.email}</span>
                  </div>
                )}
                
                {/* Handle phone field safely */}
                {(profile as any).phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{(profile as any).phone}</span>
                  </div>
                )}
                
                {/* Handle city field safely - use location if city is not available */}
                {((profile as any).city || profile.location) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{(profile as any).city || profile.location}</span>
                  </div>
                )}
                
                {/* Handle profession field safely - use job_title if profession is not available */}
                {((profile as any).profession || profile.job_title) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{(profile as any).profession || profile.job_title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      {(((profile as any).competencies && (profile as any).competencies.length > 0) || 
        ((profile as any).industries && (profile as any).industries.length > 0) ||
        (profile.skills && profile.skills.trim())) && (
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Professionali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Handle competencies field safely - use skills as fallback */}
            {(((profile as any).competencies && (profile as any).competencies.length > 0) || 
              (profile.skills && profile.skills.trim())) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Competenze</h4>
                <div className="flex flex-wrap gap-2">
                  {(profile as any).competencies && (profile as any).competencies.length > 0 ? (
                    (profile as any).competencies.map((competency: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {competency}
                      </Badge>
                    ))
                  ) : (
                    profile.skills && profile.skills.split(',').map((skill, index) => (
                      <Badge key={index} variant="outline">
                        {skill.trim()}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Handle industries field safely - use interests as fallback */}
            {(((profile as any).industries && (profile as any).industries.length > 0) ||
              (profile.interests && profile.interests.trim())) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Settori</h4>
                <div className="flex flex-wrap gap-2">
                  {(profile as any).industries && (profile as any).industries.length > 0 ? (
                    (profile as any).industries.map((industry: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {industry}
                      </Badge>
                    ))
                  ) : (
                    profile.interests && profile.interests.split(',').map((interest, index) => (
                      <Badge key={index} variant="outline">
                        {interest.trim()}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Social Links */}
      {profile.linkedin_url && (
        <Card>
          <CardHeader>
            <CardTitle>Link Social</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-600" />
              <a 
                href={profile.linkedin_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                LinkedIn
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Data registrazione:</span>
            <span className="font-medium">
              {new Date(profile.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>
          
          {profile.last_login_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Ultimo accesso:</span>
              <span className="font-medium">
                {new Date(profile.last_login_at).toLocaleDateString('it-IT')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
