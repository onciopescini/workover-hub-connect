import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Star, MessageSquare, User, Building, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_photo_url?: string;
  city?: string;
  profession?: string;
  role: string;
  created_at: string;
  competencies?: string[];
  industries?: string[];
}

interface UserSpace {
  id: string;
  title: string;
  description: string;
  photos: string[];
  price_per_day: number;
  category: string;
  city: string;
  address: string;
  created_at: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchUserSpaces();
      fetchUserReviews();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Errore nel caricamento del profilo');
    }
  };

  const fetchUserSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('host_id', userId)
        .eq('published', true);

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching user spaces:', error);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey (
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!authState.isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      // Create or get existing conversation
      const { data: existingConversation } = await supabase
        .from('private_chats')
        .select('id')
        .or(`and(user1_id.eq.${authState.user?.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${authState.user?.id})`)
        .single();

      if (existingConversation) {
        navigate(`/private-chats/${existingConversation.id}`);
      } else {
        // Create new conversation
        const { data: newChat, error } = await supabase
          .from('private_chats')
          .insert({
            user1_id: authState.user?.id,
            user2_id: userId,
          })
          .select()
          .single();

        if (error) throw error;
        navigate(`/private-chats/${newChat.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Errore nell\'apertura della chat');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profilo non trovato</h2>
          <p className="text-gray-600 mb-4">L'utente che stai cercando non esiste.</p>
          <Button onClick={() => navigate(-1)}>Torna indietro</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = authState.user?.id === userId;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.profile_photo_url || ""} />
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    {profile.profession && (
                      <p className="text-lg text-gray-600 mt-1">{profile.profession}</p>
                    )}
                    {profile.city && (
                      <div className="flex items-center text-gray-500 mt-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{profile.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Badge variant="secondary" className="w-fit">
                      {profile.role === 'host' ? 'Host' : 'Coworker'}
                    </Badge>
                    {!isOwnProfile && authState.isAuthenticated && (
                      <Button onClick={handleSendMessage}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Invia messaggio
                      </Button>
                    )}
                    {isOwnProfile && (
                      <Button variant="outline" onClick={() => navigate('/profile/edit')}>
                        <User className="w-4 h-4 mr-2" />
                        Modifica profilo
                      </Button>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-gray-700 mt-4 leading-relaxed">{profile.bio}</p>
                )}

                <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Membro dal {formatDate(profile.created_at)}</span>
                  </div>
                  {reviews.length > 0 && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-400" />
                      <span>{calculateAverageRating()} ({reviews.length} recensioni)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profilo</TabsTrigger>
            <TabsTrigger value="spaces">Spazi ({spaces.length})</TabsTrigger>
            <TabsTrigger value="reviews">Recensioni ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="grid gap-6">
              {/* Competenze */}
              {profile.competencies && profile.competencies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Competenze
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.competencies.map((competency, index) => (
                        <Badge key={index} variant="outline">
                          {competency}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Settori */}
              {profile.industries && profile.industries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Coffee className="w-5 h-5 mr-2" />
                      Settori di interesse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.industries.map((industry, index) => (
                        <Badge key={index} variant="outline">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="spaces" className="mt-6">
            {spaces.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuno spazio pubblicato
                  </h3>
                  <p className="text-gray-600">
                    {isOwnProfile 
                      ? "Non hai ancora pubblicato nessuno spazio."
                      : "Questo utente non ha ancora pubblicato spazi."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {spaces.map((space) => (
                  <Card key={space.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {space.photos && space.photos.length > 0 && (
                        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                          <img
                            src={space.photos[0]}
                            alt={space.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {space.title}
                          </h3>
                          <Badge variant="outline">
                            {space.category}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {space.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-500 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{space.city}</span>
                          </div>
                          <div className="text-lg font-semibold text-indigo-600">
                            €{space.price_per_day}/giorno
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-4"
                          onClick={() => navigate(`/spaces/${space.id}`)}
                        >
                          Visualizza spazio
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuna recensione
                  </h3>
                  <p className="text-gray-600">
                    {isOwnProfile 
                      ? "Non hai ancora ricevuto recensioni."
                      : "Questo utente non ha ancora ricevuto recensioni."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Rating Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">
                          {calculateAverageRating()}
                        </div>
                        <div className="flex items-center justify-center mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(parseFloat(calculateAverageRating()))
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {reviews.length} recensioni
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={review.reviewer.profile_photo_url || ""} />
                            <AvatarFallback>
                              {getInitials(review.reviewer.first_name, review.reviewer.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {review.reviewer.first_name} {review.reviewer.last_name}
                                </h4>
                                <div className="flex items-center mt-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDate(review.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;
