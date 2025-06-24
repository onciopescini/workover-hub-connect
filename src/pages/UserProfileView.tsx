import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, User, Calendar, MessageSquare, Globe, ExternalLink, Lock, UserX } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";
import { createOrGetPrivateChat } from "@/lib/networking-utils";
import { useProfileAccess } from "@/hooks/useProfileAccess";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  bio?: string;
  location?: string;
  profession?: string;
  job_title?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  github_url?: string;
  skills?: string;
  interests?: string;
  competencies?: string[];
  industries?: string[];
  created_at: string;
}

interface UserSpace {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  photos: string[];
  address: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

const UserProfileView = () => {
  const { userId } = useParams<{ userId: string }>();
  const { 
    profile, 
    accessResult, 
    visibilityLevel, 
    isLoading, 
    hasAccess, 
    canViewFullProfile 
  } = useProfileAccess({ 
    userId: userId || '', 
    autoFetch: true 
  });

  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (userId && hasAccess && profile) {
      fetchUserSpacesAndReviews();
    }
  }, [userId, hasAccess, profile]);

  const fetchUserSpacesAndReviews = async () => {
    if (!userId || !hasAccess) return;
    
    try {
      // Fetch spaces solo se ha accesso completo
      if (canViewFullProfile) {
        const { data: spacesData, error: spacesError } = await supabase
          .from('spaces')
          .select('*')
          .eq('host_id', userId)
          .eq('published', true);

        if (spacesError) {
          console.error('Error fetching spaces:', spacesError);
        } else {
          setSpaces(spacesData || []);
        }

        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('reviewee_id', userId);

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
        } else if (reviewsData && reviewsData.length > 0) {
          const reviewerIds = reviewsData.map(r => r.reviewer_id);
          const { data: reviewerProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, profile_photo_url')
            .in('id', reviewerIds);

          const profilesMap = new Map((reviewerProfiles || []).map(p => [p.id, p]));
          
          const reviewsWithProfiles = reviewsData.map(review => ({
            ...review,
            reviewer: profilesMap.get(review.reviewer_id) || null
          }));
          
          setReviews(reviewsWithProfiles);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserSpacesAndReviews:', error);
    }
  };

  const startPrivateChat = async () => {
    if (!userId || startingChat) return;

    setStartingChat(true);
    try {
      const chatId = await createOrGetPrivateChat(userId);
      if (chatId) {
        window.location.href = `/messages/private/${chatId}`;
      } else {
        toast.error("Impossibile avviare la chat");
      }
    } catch (error) {
      console.error('Error starting private chat:', error);
      toast.error("Errore nell'avvio della chat");
    } finally {
      setStartingChat(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Gestione accesso negato
  if (!hasAccess) {
    const getAccessDeniedContent = () => {
      switch (accessResult?.access_reason) {
        case 'networking_disabled':
          return {
            icon: <UserX className="h-16 w-16 text-gray-400" />,
            title: "Profilo Privato",
            description: "Questo utente ha disabilitato il networking e il suo profilo non è accessibile."
          };
        case 'no_shared_context':
          return {
            icon: <Lock className="h-16 w-16 text-gray-400" />,
            title: "Accesso Limitato",
            description: "Non hai una connessione o contesto condiviso con questo utente per visualizzare il suo profilo."
          };
        case 'user_not_found':
          return {
            icon: <User className="h-16 w-16 text-gray-400" />,
            title: "Utente Non Trovato",
            description: "L'utente che stai cercando non esiste o non è più disponibile."
          };
        default:
          return {
            icon: <Lock className="h-16 w-16 text-gray-400" />,
            title: "Accesso Negato",
            description: accessResult?.message || "Non hai i permessi per visualizzare questo profilo."
          };
      }
    };

    const accessContent = getAccessDeniedContent();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            {accessContent.icon}
            <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
              {accessContent.title}
            </h3>
            <p className="text-gray-600">
              {accessContent.description}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-xl font-bold mb-2">Profilo non disponibile</h1>
            <p>Non è possibile caricare i dati del profilo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  const renderSocialLinks = () => {
    if (visibilityLevel !== 'full') return null;

    const socialLinks = [
      { url: profile.website, icon: Globe, label: 'Website' },
      { url: profile.linkedin_url, icon: ExternalLink, label: 'LinkedIn' },
      { url: profile.twitter_url, icon: ExternalLink, label: 'Twitter' },
      { url: profile.instagram_url, icon: ExternalLink, label: 'Instagram' },
      { url: profile.facebook_url, icon: ExternalLink, label: 'Facebook' },
      { url: profile.youtube_url, icon: ExternalLink, label: 'YouTube' },
      { url: profile.github_url, icon: ExternalLink, label: 'GitHub' },
    ].filter(link => link.url);

    if (socialLinks.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Collegamenti</h3>
        <div className="space-y-2">
          {socialLinks.map((link, index) => {
            const IconComponent = link.icon;
            return (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <IconComponent className="w-4 h-4" />
                <span>{link.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      {/* Badge di accesso se limitato */}
      {visibilityLevel === 'limited' && (
        <div className="mb-4">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Visualizzazione limitata - {accessResult?.message}</span>
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {profile.profile_photo_url ? (
                    <img 
                      src={profile.profile_photo_url} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div>
                  <CardTitle>{profile.first_name} {profile.last_name}</CardTitle>
                  {profile.job_title && (
                    <p className="text-gray-600">{profile.job_title}</p>
                  )}
                  {profile.profession && (
                    <p className="text-gray-600">{profile.profession}</p>
                  )}
                  {profile.location && (
                    <p className="text-sm text-gray-500">{profile.location}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {profile.bio && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Bio</h3>
                  <p className="text-gray-700">{profile.bio}</p>
                </div>
              )}

              {/* Mostra dettagli aggiuntivi solo con accesso completo */}
              {canViewFullProfile && (
                <>
                  {profile.skills && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Competenze</h3>
                      <p className="text-gray-700">{profile.skills}</p>
                    </div>
                  )}

                  {profile.interests && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Interessi</h3>
                      <p className="text-gray-700">{profile.interests}</p>
                    </div>
                  )}

                  {profile.competencies && profile.competencies.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Competenze Tecniche</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.competencies.map((comp, index) => (
                          <Badge key={index} variant="secondary">{comp}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.industries && profile.industries.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Settori</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.industries.map((industry, index) => (
                          <Badge key={index} variant="outline">{industry}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderSocialLinks()}
                  
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Membro da</h3>
                    <p className="text-gray-600 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(new Date(profile.created_at), 'MMMM yyyy', { locale: it })}
                    </p>
                  </div>

                  {reviews.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Valutazione</h3>
                      <div className="flex items-center space-x-2">
                        {renderStars(Math.round(averageRating))}
                        <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
                        <span className="text-gray-500">({reviews.length} recensioni)</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                onClick={startPrivateChat}
                disabled={startingChat}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {startingChat ? 'Avvio chat...' : 'Invia Messaggio'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* User Content - Solo con accesso completo */}
        {canViewFullProfile && (
          <div className="lg:col-span-2 space-y-6">
            {/* User's Spaces */}
            <Card>
              <CardHeader>
                <CardTitle>Spazi di {profile.first_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {spaces.length === 0 ? (
                  <p className="text-gray-600">Questo utente non ha ancora pubblicato spazi.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {spaces.map((space) => (
                      <div key={space.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        {space.photos && space.photos.length > 0 && (
                          <img 
                            src={space.photos[0]} 
                            alt={space.title}
                            className="w-full h-32 object-cover rounded mb-3"
                          />
                        )}
                        <h3 className="font-semibold mb-2">{space.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{space.description}</p>
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant="secondary">{space.category}</Badge>
                          <p className="font-semibold text-green-600">€{space.price_per_day}/giorno</p>
                        </div>
                        <p className="text-xs text-gray-500">{space.address}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Recensioni ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-gray-600">Nessuna recensione disponibile.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-500">
                              {format(new Date(review.created_at), 'dd MMM yyyy', { locale: it })}
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 mb-2">{review.comment}</p>
                        )}
                        {review.reviewer && (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              {review.reviewer.profile_photo_url ? (
                                <img 
                                  src={review.reviewer.profile_photo_url} 
                                  alt="Reviewer" 
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-3 h-3 text-gray-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {review.reviewer.first_name} {review.reviewer.last_name}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    {reviews.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... e altre {reviews.length - 5} recensioni
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileView;
