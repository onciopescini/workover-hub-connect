
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, UserPlus, UserCheck, Briefcase, User, Lightbulb, Target } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworking } from '@/hooks/useNetworking';
import { sendConnectionRequest } from '@/lib/networking-utils';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { areUsersConnected, hasConnectionRequest, fetchConnections } = useNetworking();

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('networking_enabled', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  const handleSendConnectionRequest = async () => {
    if (!userId) return;
    const success = await sendConnectionRequest(userId);
    if (success) {
      await fetchConnections();
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Profilo Utente">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Profilo Utente">
        <div className="text-center py-12">
          <p className="text-gray-500">Profilo non trovato o non disponibile per il networking</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna Indietro
          </Button>
        </div>
      </AppLayout>
    );
  }

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

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case 'aziendale':
        return 'Aziendale';
      case 'freelance':
        return 'Freelance';
      case 'studente':
        return 'Studente';
      default:
        return jobType;
    }
  };

  const getWorkStyleLabel = (workStyle: string) => {
    switch (workStyle) {
      case 'silenzioso':
        return 'Silenzioso';
      case 'collaborativo':
        return 'Collaborativo';
      case 'flessibile':
        return 'Flessibile';
      case 'strutturato':
        return 'Strutturato';
      case 'creativo':
        return 'Creativo';
      default:
        return workStyle;
    }
  };

  // Helper function to parse interests from string to array
  const parseInterests = (interests: string | null): string[] => {
    if (!interests || interests.trim() === '') return [];
    return interests.split(',').map(item => item.trim()).filter(item => item.length > 0);
  };

  const parsedInterests = parseInterests(profile.interests);
  const hasJobInfo = profile.job_title || profile.job_type || profile.work_style;
  const isConnected = areUsersConnected(userId!);
  const hasRequest = hasConnectionRequest(userId!);

  const getConnectionButtonState = () => {
    if (isConnected) {
      return { text: 'Già Connessi', icon: UserCheck, disabled: true, variant: 'outline' as const };
    }
    if (hasRequest) {
      return { text: 'Richiesta Inviata', icon: UserCheck, disabled: true, variant: 'outline' as const };
    }
    return { text: 'Aggiungi al tuo Network', icon: UserPlus, disabled: false, variant: 'default' as const };
  };

  const connectionState = getConnectionButtonState();

  return (
    <AppLayout title="Profilo Utente">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <Button onClick={() => navigate(-1)} variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna Indietro
        </Button>

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
                    {profile.nickname && (
                      <span className="text-gray-500 text-lg font-normal ml-2">
                        ({profile.nickname})
                      </span>
                    )}
                  </h1>
                  <Badge className={getRoleBadgeColor(profile.role)}>
                    {getRoleLabel(profile.role)}
                  </Badge>
                  {profile.bio && (
                    <p className="text-gray-600 mt-2">{profile.bio}</p>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleSendConnectionRequest} 
                disabled={connectionState.disabled}
                variant={connectionState.variant}
              >
                <connectionState.icon className="h-4 w-4 mr-2" />
                {connectionState.text}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informazioni Personali */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informazioni Personali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Su coworking dal {new Date(profile.created_at).toLocaleDateString('it-IT')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Informazioni Professionali */}
          {hasJobInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informazioni Professionali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.job_title && (
                  <div>
                    <p className="text-sm text-gray-500">Titolo di Lavoro</p>
                    <p className="font-medium">{profile.job_title}</p>
                  </div>
                )}
                {profile.job_type && (
                  <div>
                    <p className="text-sm text-gray-500">Tipo di Lavoro</p>
                    <p className="font-medium">{getJobTypeLabel(profile.job_type)}</p>
                  </div>
                )}
                {profile.work_style && (
                  <div>
                    <p className="text-sm text-gray-500">Stile di Lavoro</p>
                    <p className="font-medium">{getWorkStyleLabel(profile.work_style)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Competenze */}
          {profile.skills && profile.skills.trim() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Competenze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{profile.skills}</p>
              </CardContent>
            </Card>
          )}

          {/* Interessi */}
          {parsedInterests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Interessi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedInterests.map((interest, index) => (
                    <Badge key={index} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default UserProfile;
