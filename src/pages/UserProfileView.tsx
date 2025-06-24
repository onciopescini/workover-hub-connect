import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MapPin, 
  Star, 
  Calendar, 
  MessageSquare, 
  User, 
  Building, 
  Coffee, 
  Users, 
  Heart, 
  Share2, 
  MoreHorizontal, 
  Flag, 
  UserPlus, 
  UserCheck,
  Mail, 
  Phone, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/LoadingScreen';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/OptimizedAuthContext';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_photo_url?: string;
  location?: string;
  job_title?: string;
  interests?: string;
  skills?: string;
  work_style?: string;
  role: 'coworker' | 'host' | 'admin';
  created_at: string;
  networking_enabled: boolean;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
}

interface UserStats {
  total_bookings: number;
  total_reviews: number;
  average_rating: number;
  spaces_hosted?: number;
  events_attended?: number;
}

const UserProfileView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Fetch user statistics
      const [bookingsResult, reviewsResult, spacesResult] = await Promise.allSettled([
        supabase
          .from('bookings')
          .select('id, status')
          .eq('user_id', userId)
          .eq('status', 'confirmed'),
        
        supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', userId),
        
        supabase
          .from('spaces')
          .select('id')
          .eq('host_id', userId)
          .eq('published', true)
      ]);

      const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data || [] : [];
      const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value.data || [] : [];
      const spaces = spacesResult.status === 'fulfilled' ? spacesResult.value.data || [] : [];

      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      setStats({
        total_bookings: bookings.length,
        total_reviews: reviews.length,
        average_rating: avgRating,
        spaces_hosted: spaces.length,
        events_attended: 0 // Would need to query event_participants table
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Errore nel caricamento del profilo');
      navigate('/404');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = async () => {
    if (!authState.user || !profile) return;

    setIsReporting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: authState.user.id,
          target_id: profile.id,
          target_type: 'user',
          reason: 'Inappropriate behavior',
          description: 'Report submitted from user profile page'
        });

      if (error) throw error;

      toast.success('Segnalazione inviata con successo');
    } catch (error) {
      console.error('Error reporting user:', error);
      toast.error('Errore nell\'invio della segnalazione');
    } finally {
      setIsReporting(false);
    }
  };

  const handleStartChat = () => {
    // Navigate to private chats and start a conversation
    navigate('/private-chats', { state: { startChatWith: profile?.id } });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profilo non trovato</h1>
          <p className="text-gray-600 mb-4">L'utente che stai cercando non esiste o non è più disponibile.</p>
          <Button onClick={() => navigate('/')}>Torna alla Home</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = authState.user?.id === profile.id;
  const interestsList = profile.interests ? profile.interests.split(',').map(i => i.trim()) : [];
  const skillsList = profile.skills ? profile.skills.split(',').map(s => s.trim()) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.profile_photo_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    {profile.job_title && (
                      <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
                        <Briefcase className="h-4 w-4" />
                        {profile.job_title}
                      </p>
                    )}
                    {profile.location && (
                      <p className="text-gray-600 flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Badge 
                      variant={profile.role === 'host' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-gray-700 mb-4">{profile.bio}</p>
                )}

                {/* Social Links */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-1" />
                        Website
                      </a>
                    </Button>
                  )}
                  {profile.linkedin_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {isOwnProfile ? (
                    <Button onClick={() => navigate('/profile')}>
                      Modifica Profilo
                    </Button>
                  ) : (
                    <>
                      {profile.networking_enabled && authState.user && (
                        <Button onClick={handleStartChat}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Invia Messaggio
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleReport} disabled={isReporting}>
                        <Flag className="h-4 w-4 mr-2" />
                        {isReporting ? 'Segnalando...' : 'Segnala'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.total_bookings || 0}</div>
                  <div className="text-sm text-gray-600">Prenotazioni</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.total_reviews || 0}</div>
                  <div className="text-sm text-gray-600">Recensioni</div>
                </div>
                {stats?.average_rating > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                      <Star className="h-5 w-5 fill-current" />
                      {stats.average_rating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Valutazione</div>
                  </div>
                )}
                {profile.role === 'host' && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{stats?.spaces_hosted || 0}</div>
                    <div className="text-sm text-gray-600">Spazi Ospitati</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.work_style && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Stile di Lavoro</h4>
                  <p className="text-gray-600">{profile.work_style}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Membro dal</h4>
                <p className="text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(profile.created_at).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          {interestsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Interessi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      <Heart className="h-3 w-3 mr-1" />
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {skillsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Competenze</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
