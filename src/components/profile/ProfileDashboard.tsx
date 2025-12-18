
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { useProfileRoleDisplay } from '@/hooks/profile/useProfileRoleDisplay';
import { 
  User, 
  Edit, 
  Eye, 
  Calendar, 
  Star, 
  TrendingUp,
  MapPin,
  Briefcase,
  Settings,
  Award,
  Shield,
  CreditCard
} from "lucide-react";
import { ProfileStatsCards } from './ProfileStatsCards';
import { ProfileCompletionWidget } from './ProfileCompletionWidget';
import { TrustBadgesSection } from './TrustBadgesSection';
import { SocialLinksSection } from './SocialLinksSection';
import HostStripeStatus from "@/components/payments/HostStripeStatus";

export function ProfileDashboard() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { roleLabel, roleBadgeVariant, isHost } = useProfileRoleDisplay();


  if (!authState.profile) {
    if (authState.user) {
      // Caso utente loggato ma senza profilo (es. appena registrato)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm border">
            <User className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profilo incompleto</h2>
            <p className="text-gray-600 mb-6">
              Per accedere alla tua dashboard e utilizzare tutte le funzionalità, devi completare il tuo profilo.
            </p>
            <Button onClick={() => navigate('/profile/edit')} className="w-full">
              Completa Profilo
            </Button>
          </div>
        </div>
      );
    }

    // Caso utente non loggato
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Profilo non disponibile</h2>
          <Button onClick={() => navigate('/login')}>Accedi</Button>
        </div>
      </div>
    );
  }

  const { profile } = authState;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Profile Photo & Basic Info */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 lg:h-32 lg:w-32 border-4 border-white/20">
                <AvatarImage src={profile.profile_photo_url || ""} />
                <AvatarFallback className="text-2xl lg:text-3xl bg-white/10">
                  {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-bold">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <Badge variant={roleBadgeVariant} className="text-xs">
                    {roleLabel}
                  </Badge>
                </div>
                
                {profile.job_title && (
                  <div className="flex items-center gap-2 text-white/90 mb-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{profile.job_title}</span>
                  </div>
                )}
                
                {profile.location && (
                  <div className="flex items-center gap-2 text-white/90 mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {profile.bio && (
                  <p className="text-white/90 text-sm lg:text-base max-w-2xl">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate('/profile/edit')}
                  className="flex-1 lg:flex-none"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/users/${profile.id}`)}
                  className="flex-1 lg:flex-none border-white/60 text-white bg-white/10 hover:bg-white/20"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Anteprima
                </Button>
              </div>
              
              {isHost && (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/host')}
                    className="border-white/60 text-white bg-white/10 hover:bg-white/20 w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Dashboard Host
                  </Button>
                  
                  {(!authState.profile?.stripe_account_id || !authState.profile?.stripe_connected) && (
                    <HostStripeStatus className="w-full" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Status for Hosts */}
      {isHost && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <HostStripeStatus />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Completion Widget */}
            <ProfileCompletionWidget profile={profile} />
            
            {/* Performance Stats */}
            <ProfileStatsCards profile={profile} />
            
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Attività Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Profilo aggiornato</p>
                      <p className="text-sm text-gray-600">
                        {new Date(profile.updated_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Membro da</p>
                      <p className="text-sm text-gray-600">
                        {new Date(profile.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Trust & Verification */}
            <TrustBadgesSection
              profile={profile}
              email={authState.user?.email}
              emailConfirmedAt={authState.user?.email_confirmed_at || null}
              phoneConfirmedAt={authState.user?.phone_confirmed_at || null}
            />
            
            {/* Social Links */}
            <SocialLinksSection profile={profile} />
            
            {/* Skills & Competences */}
            {(profile.skills || (profile.competencies && profile.competencies.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Competenze
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.skills && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-600 mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.split(',').map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {profile.competencies && profile.competencies.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-600 mb-2">Competenze Tecniche</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.competencies.map((competency, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {competency}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Industries */}
            {profile.industries && profile.industries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settori</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.industries.map((industry, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
